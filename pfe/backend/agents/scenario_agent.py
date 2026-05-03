"""
Scenario Agent — matches the user's question to one of the predefined
simulation scenarios from the fixed scenario library.
The AI never creates new scenarios; it only recognises existing ones.
"""
import json

from openai import OpenAI

from config import settings
from models.scenarios_data import SCENARIOS, SCENARIOS_BY_ID

client = OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")

# Build a readable list of scenarios for the prompt
_SCENARIOS_TEXT = "\n".join(
    f"- id={s['id']} | name={s['name']} | type={s['type']} | "
    f"keywords={', '.join(s['keywords'])}"
    for s in SCENARIOS
)

SYSTEM_PROMPT = f"""You are a railway scenario matching agent for CFG (Chemin de Fer de Gafsa).

Your job is to analyze the user's message and determine if it matches one of the predefined simulation scenarios.

Available scenarios:
{_SCENARIOS_TEXT}

Rules:
- Match the scenario most relevant to the user's question
- Only match scenarios from the list above
- If no scenario matches, return null for scenario_id
- Consider synonyms and related concepts
- The user may write in French or Arabic

Respond ONLY with valid JSON, no markdown, no preamble:
{{
  "matched": true,
  "scenario_id": "id or null",
  "confidence": 0.85,
  "reason": "why this scenario matches"
}}"""


async def run_scenario_agent(message: str) -> dict:
    """
    Analyse the user message and return the best-matching scenario.
    Returns a dict with matched, scenario_id, confidence, reason.
    """
    print(f"[SCENARIO AGENT] Analyzing: {message}")

    fallback = {
        "matched": False,
        "scenario_id": None,
        "confidence": 0.0,
        "reason": "Agent unavailable",
    }

    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=1024,
                messages=[{"role": "system", "content": SYSTEM_PROMPT},
                          {"role": "user", "content": message}],
            )
            raw = response.choices[0].message.content.strip()
            result = json.loads(raw)

            # If a scenario was matched, attach the full scenario object
            if result.get("matched") and result.get("scenario_id"):
                scenario_id = result["scenario_id"]
                if scenario_id in SCENARIOS_BY_ID:
                    result["scenario"] = SCENARIOS_BY_ID[scenario_id]
                else:
                    # Claude hallucinated an unknown id — treat as no match
                    result["matched"] = False
                    result["scenario_id"] = None
                    result["scenario"] = None

            print(
                f"[SCENARIO AGENT] Result: matched={result.get('matched')}, "
                f"id={result.get('scenario_id')}, confidence={result.get('confidence')}"
            )
            return result

        except json.JSONDecodeError as e:
            print(f"[SCENARIO AGENT] JSON parse error (attempt {attempt + 1}): {e}")
            if attempt == 1:
                return fallback
        except Exception as e:
            print(f"[SCENARIO AGENT] Error: {e}")
            return fallback

    return fallback
