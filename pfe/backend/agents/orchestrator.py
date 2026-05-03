"""
Orchestrator — the entry point for every user question.

Step 1: Asks Claude to decide which specialised agents are needed.
Step 2: Runs those agents (in parallel where possible).
Step 3: Calls the synthesis agent to combine everything into one response.
"""
import asyncio
import json

from openai import OpenAI

from config import settings
from agents.scenario_agent import run_scenario_agent
from agents.weather_agent import run_weather_agent
from agents.curvature_agent import run_curvature_agent
from agents.risk_agent import run_risk_agent
from agents.synthesis_agent import run_synthesis_agent
from models.scenarios_data import SCENARIOS_BY_ID

client = OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")

ROUTER_SYSTEM = """You are a routing agent for a railway monitoring system. Analyze the user message and decide which specialised agents to call.

Available agents:
- scenario: user asks about a risk or incident
- weather: user asks about weather conditions
- curvature: user asks about rail curves/segments
- risk: user wants a risk assessment
- general: general railway question

Respond ONLY with valid JSON, no markdown, no preamble:
{"agents": ["agent1", "agent2"]}

Rules:
- Always include at least one agent
- Include "scenario" if any risk is mentioned
- Include "weather" if weather is mentioned
- Include "curvature" if rails or segments are mentioned
- Include "risk" if the user wants an analysis or assessment
- Use "general" for everything else"""


async def _route(message: str) -> list[str]:
    """Ask Claude which agents are needed for this message."""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=256,
            messages=[{"role": "system", "content": ROUTER_SYSTEM},
                      {"role": "user", "content": message}],
        )
        raw = response.choices[0].message.content.strip()
        data = json.loads(raw)
        agents = data.get("agents", ["general"])
        print(f"[ORCHESTRATOR] Routing to agents: {agents}")
        return agents
    except Exception as e:
        print(f"[ORCHESTRATOR] Routing error: {e} — defaulting to all agents")
        return ["scenario", "weather", "curvature", "risk"]


# Empty defaults used when an agent is skipped
_EMPTY_SCENARIO = {
    "matched": False, "scenario_id": None, "confidence": 0.0,
    "reason": "Agent not activated", "scenario": None,
}
_EMPTY_WEATHER = {
    "condition": "Inconnu", "temperature": 28.0, "wind_speed": 10.0,
    "visibility_km": 10.0, "impact_score": 5.0, "impact_level": "LOW",
    "speed_recommendation": 120.0, "warnings": [], "summary": "",
}
_EMPTY_CURVATURE = {
    "critical_segments": [], "overall_infrastructure_health": 80,
    "summary": "Données non consultées",
}
_EMPTY_RISK = {
    "overall_score": 20, "level": "LOW", "color": "#22C55E",
    "factors": {"weather": 5, "infrastructure": 10, "scenario": 5},
    "recommendation": "Opérations normales.", "should_stop": False,
}


async def orchestrate(message: str, history: list, user_role: str, db) -> dict:
    """
    Full pipeline: route → run agents → synthesise → return response.
    """
    print(f"[ORCHESTRATOR] Received message: {message!r}  role={user_role}")

    # Step 1 — Route
    active_agents = await _route(message)

    # Step 2 — Run agents based on routing decision
    # We use asyncio.gather to run independent agents in parallel

    async def _noop_scenario():
        return _EMPTY_SCENARIO

    async def _noop_weather():
        return _EMPTY_WEATHER

    async def _noop_curvature():
        return _EMPTY_CURVATURE

    scenario_task = (
        run_scenario_agent(message)
        if "scenario" in active_agents or "general" in active_agents
        else _noop_scenario()
    )
    weather_task = (
        run_weather_agent(db)
        if "weather" in active_agents or "risk" in active_agents
        else _noop_weather()
    )
    curvature_task = (
        run_curvature_agent(db)
        if "curvature" in active_agents or "risk" in active_agents
        else _noop_curvature()
    )

    scenario_result, weather_result, curvature_result = await asyncio.gather(
        scenario_task, weather_task, curvature_task
    )

    # Risk agent needs the three results above
    if "risk" in active_agents or "scenario" in active_agents:
        risk_result = await run_risk_agent(
            weather_result, curvature_result, scenario_result
        )
    else:
        risk_result = _EMPTY_RISK

    # Step 3 — Synthesis
    synthesis = await run_synthesis_agent(
        message, scenario_result, weather_result, curvature_result, risk_result
    )

    # Build the final response object consumed by the frontend
    scenario_obj = None
    sid = synthesis.get("scenario_id") or scenario_result.get("scenario_id")
    if sid and sid in SCENARIOS_BY_ID:
        scenario_obj = SCENARIOS_BY_ID[sid]

    response = {
        "message": synthesis.get("message", ""),
        "scenario_found": synthesis.get("scenario_found", False),
        "scenario_id": sid,
        "scenario": scenario_obj,
        "risk_level": synthesis.get("risk_level", risk_result.get("level", "LOW")),
        "risk_score": synthesis.get("risk_score", risk_result.get("overall_score", 0)),
        "show_launch_button": synthesis.get("show_launch_button", False),
        "weather": weather_result,
        "alerts": curvature_result.get("critical_segments", []),
        "weather_warning": synthesis.get("weather_warning"),
        "highlight_segments": synthesis.get("highlight_segments", []),
    }

    print(f"[ORCHESTRATOR] Pipeline complete — risk={response['risk_level']}, "
          f"scenario={response['scenario_id']}")

    return response
