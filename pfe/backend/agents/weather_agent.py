"""
Weather Agent — fetches current weather for Gafsa and asks Claude
to assess its impact on railway operations (speed limits, risk level, etc.).
"""
import json

from openai import OpenAI

from config import settings
from services.weather_service import get_weather

client = OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")

SYSTEM_PROMPT = """You are a railway weather impact analyst for the CFG railway in Gafsa, Tunisia.

Analyze the provided weather data and assess its impact on railway operations.

Consider:
- Visibility impact on train speed
- Wind impact on stability
- Rain impact on rail grip
- Temperature impact on rail expansion
- Storm risk level

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "condition": "Ensoleillé",
  "temperature": 28,
  "wind_speed": 12,
  "visibility_km": 10,
  "impact_score": 7.2,
  "impact_level": "LOW",
  "speed_recommendation": 120,
  "warnings": [],
  "summary": "brief French summary"
}

impact_level must be one of: LOW, MEDIUM, HIGH, CRITICAL"""

# Fallback returned when both the weather API and Claude are unavailable
FALLBACK_RESULT = {
    "condition": "Ensoleillé",
    "temperature": 28.0,
    "wind_speed": 10.0,
    "visibility_km": 10.0,
    "impact_score": 5.0,
    "impact_level": "LOW",
    "speed_recommendation": 120.0,
    "warnings": [],
    "summary": "Conditions météorologiques normales. Opérations ferroviaires sans contrainte.",
}


async def run_weather_agent(db) -> dict:
    """
    Fetch weather data then use Claude to interpret its railway impact.
    """
    print("[WEATHER AGENT] Fetching Gafsa weather")

    weather_raw = await get_weather(db)

    # Remove the bulky 'raw' OWM payload before sending to Claude
    weather_for_prompt = {k: v for k, v in weather_raw.items() if k != "raw"}

    print(f"[WEATHER AGENT] Weather fetched: {weather_for_prompt.get('condition')}, "
          f"{weather_for_prompt.get('temperature')}°C")

    system = SYSTEM_PROMPT
    user_content = f"Weather data: {json.dumps(weather_for_prompt, ensure_ascii=False)}"

    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=1024,
                messages=[{"role": "system", "content": system},
                          {"role": "user", "content": user_content}],
            )
            raw = response.choices[0].message.content.strip()
            result = json.loads(raw)
            print(
                f"[WEATHER AGENT] Impact level: {result.get('impact_level')}, "
                f"score: {result.get('impact_score')}"
            )
            return result

        except json.JSONDecodeError as e:
            print(f"[WEATHER AGENT] JSON parse error (attempt {attempt + 1}): {e}")
            if attempt == 1:
                return FALLBACK_RESULT
        except Exception as e:
            print(f"[WEATHER AGENT] Error: {e}")
            return FALLBACK_RESULT

    return FALLBACK_RESULT
