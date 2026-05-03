"""
Synthesis Agent — the final agent in the pipeline. Takes all specialist
results and produces one coherent French-language response for the operator,
together with structured metadata used by the frontend.
"""
import json

from openai import OpenAI

from config import settings

client = OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")

SYSTEM_PROMPT = """You are the main AI assistant for CFG Digital Twin, a railway monitoring platform for Chemin de Fer de Gafsa in Tunisia.

You help railway operators understand risks, monitor infrastructure, and make decisions.

Based on the analysis from all specialised agents, provide a clear, professional response to the operator's question.

Rules:
- Always respond in French
- Be concise and professional
- Focus on actionable information
- Mention the matched scenario if found
- Include risk level if relevant
- Maximum 3 paragraphs

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "message": "your response in French",
  "scenario_found": true,
  "scenario_id": "id or null",
  "risk_level": "LOW",
  "risk_score": 45,
  "show_launch_button": true,
  "weather_warning": "warning or null",
  "highlight_segments": ["B-01"]
}

show_launch_button should be true only when a scenario was matched with confidence >= 0.5."""

FALLBACK_RESULT = {
    "message": (
        "Je suis temporairement indisponible. "
        "Veuillez consulter les procédures opérationnelles standard "
        "et contacter votre superviseur en cas de doute."
    ),
    "scenario_found": False,
    "scenario_id": None,
    "risk_level": "LOW",
    "risk_score": 0,
    "show_launch_button": False,
    "weather_warning": None,
    "highlight_segments": [],
}


async def run_synthesis_agent(
    user_message: str,
    scenario_result: dict,
    weather_result: dict,
    curvature_result: dict,
    risk_result: dict,
) -> dict:
    """
    Combine all agent outputs into one final response for the operator.
    """
    print("[SYNTHESIS AGENT] Building final response")

    # Trim bulky nested objects to keep the prompt manageable
    scenario_slim = {k: v for k, v in scenario_result.items() if k != "scenario"}
    weather_slim = {k: v for k, v in weather_result.items() if k not in ("raw",)}

    user_content = (
        f"User question: {user_message}\n\n"
        f"Scenario match: {json.dumps(scenario_slim, ensure_ascii=False)}\n"
        f"Weather analysis: {json.dumps(weather_slim, ensure_ascii=False)}\n"
        f"Infrastructure: {json.dumps(curvature_result, ensure_ascii=False, default=str)}\n"
        f"Risk assessment: {json.dumps(risk_result, ensure_ascii=False)}"
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
                f"[SYNTHESIS AGENT] Response ready — scenario_found={result.get('scenario_found')}, "
                f"risk={result.get('risk_level')}"
            )
            return result

        except json.JSONDecodeError as e:
            print(f"[SYNTHESIS AGENT] JSON parse error (attempt {attempt + 1}): {e}")
            if attempt == 1:
                return FALLBACK_RESULT
        except Exception as e:
            print(f"[SYNTHESIS AGENT] Error: {e}")
            return FALLBACK_RESULT

    return FALLBACK_RESULT
