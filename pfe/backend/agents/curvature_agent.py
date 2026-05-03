"""
Curvature Agent — reads rail segment data from MongoDB, identifies
critical segments, asks the LLM to generate professional alert messages,
and stores new alerts in the alerts collection.

Criticality thresholds are calibrated from a real UIC 54 kg rail
inspection report (Nouaceur/El Jadida line, Morocco) and adapted for CFG.
"""
import json
from datetime import datetime

from openai import OpenAI

from config import settings
from services.mongodb_service import get_all_segments, save_alert
from services.rail_risk import calculate_rail_risk_score

client = OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")

SYSTEM_PROMPT = """You are a railway infrastructure analyst for CFG (Chemin de Fer de Gafsa). Analyze the rail segment data and generate professional alert messages for the administrator.

Each segment includes curvature data AND rail wear data (vertical wear in mm, cumulative tonnage, grinding interval, detected defects). Use ALL available data in your analysis.

Key thresholds (UIC 54 kg rail, calibrated from real inspection data):
- Vertical wear: LOW < 5 mm | MEDIUM 5–10 mm | HIGH 10–13 mm | CRITICAL > 13 mm
- Cumulative tonnage: surveillance > 600 MT | critical > 750 MT | limit 800 MT
- Grinding interval: recommended max 4 years
- Critical defects: fissure_transversale, rupture_rail → immediate stop
- High defects: head_checking, ecaillage → immediate grinding

For each critical segment, assess:
- Risk level (LOW / MEDIUM / HIGH / CRITICAL)
- Recommended action
- Urgency level

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "critical_segments": [
    {
      "segment": "B-01",
      "name": "Redeyef — M'dhilla",
      "risk_level": "CRITICAL",
      "curvature": 5.8,
      "tonnage": 67,
      "usure_verticale_mm": 9,
      "message": "French alert message mentioning specific wear values",
      "action": "recommended action",
      "urgency": "IMMEDIATE"
    }
  ],
  "overall_infrastructure_health": 73,
  "summary": "French summary for admin"
}

overall_infrastructure_health is an integer 0-100 (higher = healthier).
urgency must be one of: IMMEDIATE, HIGH, NORMAL."""

FALLBACK_RESULT = {
    "critical_segments": [],
    "overall_infrastructure_health": 70,
    "summary": "Analyse d'infrastructure temporairement indisponible. Veuillez réessayer.",
}


def _is_critical(segment: dict) -> bool:
    """
    A segment is critical if any infrastructure or rail-wear threshold
    is exceeded. Thresholds from UIC 54 kg inspection report.
    """
    defauts = segment.get("defauts_detectes", [])
    rail_score = calculate_rail_risk_score(segment)

    return (
        segment.get("etat") == "ALERTE"
        or segment.get("degres_par_km", 0) > 4.0
        or segment.get("tonnage_estime", 0) > 60
        or segment.get("usure_verticale_mm", 0) >= 10          # HIGH wear
        or segment.get("tonnage_cumule_t", 0) >= 600_000_000   # surveillance zone
        or segment.get("years_since_meulage", 0) >= 4          # grinding overdue
        or "fissure_transversale" in defauts
        or "head_checking" in defauts
        or rail_score["level"] in ("HIGH", "CRITICAL")
    )


async def run_curvature_agent(db) -> dict:
    """
    Fetch segments, identify critical ones, generate Claude alerts,
    and persist new alerts to MongoDB.
    """
    print("[CURVATURE AGENT] Fetching rail segments from MongoDB")

    segments = await get_all_segments(db)
    if not segments:
        print("[CURVATURE AGENT] No segments found in database.")
        return FALLBACK_RESULT

    critical_segments = [s for s in segments if _is_critical(s)]
    print(
        f"[CURVATURE AGENT] Found {len(critical_segments)} critical "
        f"segment(s) out of {len(segments)} total."
    )

    if not critical_segments:
        return {
            "critical_segments": [],
            "overall_infrastructure_health": 95,
            "summary": "Tous les segments sont dans un état nominal. Aucune alerte infrastructure.",
        }

    # Attach pre-computed rail risk score to each segment so the LLM has
    # structured context without needing to recalculate thresholds itself
    enriched = []
    for s in segments:
        entry = dict(s)
        entry["rail_risk"] = calculate_rail_risk_score(s)
        enriched.append(entry)

    user_content = (
        f"Segments data (with pre-computed rail_risk scores): "
        f"{json.dumps(enriched, ensure_ascii=False, default=str)}"
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

            # Persist each critical segment alert only if no unacknowledged
            # alert for that segment already exists (prevents duplicates)
            for seg_alert in result.get("critical_segments", []):
                existing = await db.alerts.find_one(
                    {"segment": seg_alert.get("segment"), "acknowledged": False}
                )
                if not existing:
                    await save_alert(db, seg_alert)
                    print(
                        f"[CURVATURE AGENT] Alert saved for segment "
                        f"{seg_alert.get('segment')} — {seg_alert.get('risk_level')}"
                    )
                else:
                    print(
                        f"[CURVATURE AGENT] Alert already exists for segment "
                        f"{seg_alert.get('segment')} — skipping insert"
                    )

            print(
                f"[CURVATURE AGENT] Infrastructure health: "
                f"{result.get('overall_infrastructure_health')}%"
            )
            return result

        except json.JSONDecodeError as e:
            print(f"[CURVATURE AGENT] JSON parse error (attempt {attempt + 1}): {e}")
            if attempt == 1:
                return FALLBACK_RESULT
        except Exception as e:
            print(f"[CURVATURE AGENT] Error: {e}")
            return FALLBACK_RESULT

    return FALLBACK_RESULT
