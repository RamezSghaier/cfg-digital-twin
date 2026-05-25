"""
Journal Agent — for a given date, fetches real conditions from multiple
sources and asks the LLM to predict the most relevant scenario to simulate.

Data sources used (all internet resources):
  1. Open-Meteo archive API  — free, no key, historical weather for Gafsa
  2. OpenWeatherMap current  — live conditions (for today / future dates)
  3. MongoDB courbures       — segment rail state + wear data
  4. MongoDB journal         — past session for that date (if any)
"""
import json
from datetime import date, datetime, timedelta

import httpx
from openai import OpenAI

from config import settings
from models.scenarios_data import SCENARIOS
from services.mongodb_service import get_all_segments, get_journal_entry_by_date
from services.rail_risk import calculate_rail_risk_score
from services.weather_service import get_weather

# Gafsa, Tunisia — WGS84 coordinates
GAFSA_LAT = 34.4167
GAFSA_LON = 8.7833

client = OpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
)

SYSTEM_PROMPT = """Tu es un expert en sécurité ferroviaire pour le Chemin de Fer de Gafsa (CFG).
À partir des données de conditions réelles pour une date donnée, tu dois recommander le scénario
de simulation le plus pertinent à lancer.

Scénarios disponibles : deraillement, usure_rails, brouillard_dense, surcharge_voie,
inondation_voie, defaillance_frein, courbure_critique.

Réponds UNIQUEMENT avec un JSON valide, sans markdown :
{
  "scenario_id": "courbure_critique",
  "scenario_nom": "Courbure Critique",
  "risk_level": "HIGH",
  "confidence": 0.87,
  "reasoning": "Explication détaillée en français (3-4 phrases) justifiant le choix avec les données chiffrées",
  "conditions_cles": [
    "Température max : 34°C — chaleur dilatant les rails",
    "Segment B-01 : courbure 5.8°/km au-dessus du seuil (4.0°/km)",
    "Usure verticale B-01 : 9 mm (seuil modéré = 5 mm)"
  ],
  "actions_recommandees": [
    "Réduire la vitesse à 60 km/h sur B-01",
    "Inspecter visuellement les attaches NABLA"
  ],
  "sources": [
    "Open-Meteo — météo historique Gafsa",
    "MongoDB — données segments CFG",
    "Rapport inspection UIC 54 kg"
  ]
}

risk_level : LOW | MEDIUM | HIGH | CRITICAL
confidence : float entre 0.0 et 1.0"""


async def _fetch_historical_weather(target_date: date) -> dict:
    """
    Call Open-Meteo archive API for historical daily weather at Gafsa.
    Free, no API key required, covers dates from 1940 onward.
    """
    date_str = target_date.strftime("%Y-%m-%d")
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": GAFSA_LAT,
        "longitude": GAFSA_LON,
        "start_date": date_str,
        "end_date": date_str,
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "windspeed_10m_max",
            "weathercode",
        ]),
        "timezone": "Africa/Tunis",
    }
    async with httpx.AsyncClient(timeout=10.0) as http:
        resp = await http.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    daily = data.get("daily", {})

    def first(key):
        vals = daily.get(key, [None])
        return vals[0] if vals else None

    temp_max    = first("temperature_2m_max")
    temp_min    = first("temperature_2m_min")
    precip      = first("precipitation_sum") or 0.0
    wind_max    = first("windspeed_10m_max") or 0.0
    weathercode = first("weathercode") or 0

    # WMO weathercode → simple tag
    # codes 45/48 = fog, 51-67/80-82 = rain, 71-77 = snow, 95-99 = storm, 30-35 = sandstorm
    if weathercode in (45, 48):
        code = "fog"
    elif precip >= 50:
        code = "heavy_rain"
    elif precip > 5 or weathercode in range(51, 83):
        code = "rain"
    elif weathercode in range(30, 36):
        code = "sandstorm"
    elif wind_max > 60:
        code = "sandstorm"
    else:
        code = "clear"

    return {
        "source": "Open-Meteo (archive historique)",
        "date": date_str,
        "temperature_max": temp_max,
        "temperature_min": temp_min,
        "precipitation_mm": precip,
        "wind_max_kmh": wind_max,
        "weathercode": weathercode,
        "weather_code": code,
    }


async def run_journal_agent(db, date_str: str) -> dict:
    """
    Main entry point — gather conditions for date_str and predict scenario.

    Returns the LLM prediction dict, or a structured fallback on error.
    """
    sources_used = []

    # ── 1. Parse date ─────────────────────────────────────────────────────────
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return _fallback("Format de date invalide.")

    today = date.today()

    # ── 2. Fetch weather ──────────────────────────────────────────────────────
    weather_data = {}
    if target < today:
        # Historical date → Open-Meteo archive
        try:
            weather_data = await _fetch_historical_weather(target)
            sources_used.append("Open-Meteo — météo historique Gafsa (archive gratuite)")
            print(f"[JOURNAL AGENT] Historical weather fetched for {date_str}")
        except Exception as e:
            print(f"[JOURNAL AGENT] Open-Meteo error: {e} — falling back to current weather")
            weather_data = await get_weather(db)
            weather_data["source"] = "OpenWeatherMap (fallback — archive indisponible)"
            sources_used.append("OpenWeatherMap — données actuelles (archive indisponible)")
    else:
        # Today or future → live weather
        weather_data = await get_weather(db)
        weather_data["source"] = "OpenWeatherMap — météo en temps réel Gafsa"
        sources_used.append("OpenWeatherMap — météo en temps réel Gafsa")

    # ── 3. Fetch segments + compute rail risk ─────────────────────────────────
    segments = await get_all_segments(db)
    enriched_segments = []
    for seg in segments:
        entry = dict(seg)
        entry["rail_risk"] = calculate_rail_risk_score(seg)
        enriched_segments.append(entry)
    sources_used.append("MongoDB — données segments et usure rails CFG")

    # ── 4. Fetch existing journal entry for context ───────────────────────────
    existing_entry = await get_journal_entry_by_date(db, date_str)
    if existing_entry:
        sources_used.append("Journal CFG — session enregistrée pour cette date")

    # ── 5. Build LLM prompt ───────────────────────────────────────────────────
    scenario_list = [
        {"id": s["id"], "name": s["name"], "type": s["type"], "description": s["description"]}
        for s in SCENARIOS
    ]

    user_content = json.dumps({
        "date": date_str,
        "meteo": weather_data,
        "segments": enriched_segments,
        "journal_existant": existing_entry,
        "scenarios_disponibles": scenario_list,
        "seuils_reference": {
            "courbure_critique_degres_km": 4.0,
            "tonnage_alerte_t": 60,
            "usure_haute_mm": 10,
            "precipitations_inondation_mm": 50,
            "visibilite_brouillard_m": 50,
        },
    }, ensure_ascii=False, default=str)

    # ── 6. Call LLM ──────────────────────────────────────────────────────────
    sources_used.append("Rapport inspection UIC 54 kg — seuils d'usure rail")

    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=1024,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
            )
            raw = response.choices[0].message.content.strip()
            result = json.loads(raw)
            result["sources"] = sources_used   # override with actual sources used
            result["date"] = date_str
            result["weather_snapshot"] = weather_data
            print(f"[JOURNAL AGENT] Prediction for {date_str}: {result.get('scenario_id')} ({result.get('risk_level')})")
            return result

        except json.JSONDecodeError as e:
            print(f"[JOURNAL AGENT] JSON parse error (attempt {attempt + 1}): {e}")
        except Exception as e:
            print(f"[JOURNAL AGENT] LLM error: {e}")
            return _fallback(str(e))

    return _fallback("Impossible de générer une prédiction après deux tentatives.")


def _fallback(reason: str) -> dict:
    return {
        "scenario_id": "courbure_critique",
        "scenario_nom": "Courbure Critique",
        "risk_level": "MEDIUM",
        "confidence": 0.0,
        "reasoning": (
            "Prédiction indisponible temporairement. "
            f"Raison : {reason} "
            "Le scénario courbure critique est affiché par défaut car le segment B-01 "
            "présente des indicateurs persistants."
        ),
        "conditions_cles": ["Données météo ou LLM temporairement indisponibles"],
        "actions_recommandees": ["Relancer l'analyse dans quelques instants"],
        "sources": [],
        "error": reason,
    }
