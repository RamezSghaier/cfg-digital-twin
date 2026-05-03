"""
Risk Agent — combines weather, infrastructure, and scenario data to
produce a single overall operational risk score (0-100).
"""
import json

from openai import OpenAI

from config import settings

client = OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")

SYSTEM_PROMPT = """You are a railway risk assessment specialist for CFG (Chemin de Fer de Gafsa). Calculate the overall operational risk based on multiple factors.

Risk scale:
0-30  → LOW      — normal operations
31-60 → MEDIUM   — caution required
61-80 → HIGH     — reduce speed
81-100→ CRITICAL — stop operations

Color mapping:
LOW      → #22C55E
MEDIUM   → #FB923C
HIGH     → #EF4444
CRITICAL → #7F1D1D

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "overall_score": 45,
  "level": "MEDIUM",
  "color": "#FB923C",
  "factors": {
    "weather": 20,
    "infrastructure": 15,
    "scenario": 10
  },
  "recommendation": "French recommendation",
  "should_stop": false
}"""

FALLBACK_RESULT = {
    "overall_score": 30,
    "level": "LOW",
    "color": "#22C55E",
    "factors": {"weather": 10, "infrastructure": 10, "scenario": 10},
    "recommendation": "Évaluation du risque temporairement indisponible. Appliquer les procédures standard.",
    "should_stop": False,
}


async def run_risk_agent(
    weather_result: dict,
    curvature_result: dict,
    scenario_result: dict,
) -> dict:
    """
    Synthesise weather, infrastructure, and scenario results into
    a single risk score using Claude.
    """
    print("[RISK AGENT] Calculating overall risk score")

    # Strip heavy fields that would bloat the prompt
    weather_slim = {k: v for k, v in weather_result.items() if k not in ("raw", "summary")}
    curvature_slim = {
        "critical_segments": curvature_result.get("critical_segments", []),
        "overall_infrastructure_health": curvature_result.get("overall_infrastructure_health"),
    }
    scenario_slim = {
        k: v for k, v in scenario_result.items() if k != "scenario"
    }

    user_content = (
        f"Weather analysis: {json.dumps(weather_slim, ensure_ascii=False)}\n"
        f"Infrastructure: {json.dumps(curvature_slim, ensure_ascii=False)}\n"
        f"Active scenario: {json.dumps(scenario_slim, ensure_ascii=False)}"
    )

    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=1024,
                messages=[{"role": "system", "content": SYSTEM_PROMPT},
                          {"role": "user", "content": user_content}],
            )
            raw = response.choices[0].message.content.strip()
            result = json.loads(raw)
            print(
                f"[RISK AGENT] Score: {result.get('overall_score')} — "
                f"Level: {result.get('level')}"
            )
            return result

        except json.JSONDecodeError as e:
            print(f"[RISK AGENT] JSON parse error (attempt {attempt + 1}): {e}")
            if attempt == 1:
                return FALLBACK_RESULT
        except Exception as e:
            print(f"[RISK AGENT] Error: {e}")
            return FALLBACK_RESULT

    return FALLBACK_RESULT
