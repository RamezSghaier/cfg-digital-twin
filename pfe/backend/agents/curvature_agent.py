"""
Curvature Agent — queries real SNCFT curve data from MongoDB,
identifies critical curves, and generates professional French alerts.

Risk thresholds (from SNCFT inspection report, Gafsa region):
  rayon >= 1000 m → FAIBLE
  rayon  500–999 → MOYEN
  rayon  300–499 → ELEVE   (ALERTE)
  rayon  < 300   → CRITIQUE (ALERTE)
"""
import json
from datetime import datetime

from openai import OpenAI

from config import settings
from services.mongodb_service import save_alert

client = OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")

SYSTEM_PROMPT = """Tu es un analyste infrastructure ferroviaire pour la SNCFT (Société Nationale des Chemins de Fer Tunisiens), région de Gafsa.

Tu reçois une liste de courbes ferroviaires critiques avec leurs rayons réels issus des rapports d'inspection.

Seuils de risque (réseau Gafsa, rail UIC 54 kg) :
- rayon >= 1000 m → FAIBLE  (nominal)
- rayon  500–999 m → MOYEN  (surveillance)
- rayon  300–499 m → ELEVE  (alerte, limitation de vitesse requise)
- rayon  < 300 m  → CRITIQUE (arrêt ou vitesse < 30 km/h)
- rayon minimum absolu réseau : 180 m

Pour chaque courbe critique, évalue :
- Niveau de risque réel basé sur le rayon
- Action recommandée (limitation vitesse / inspection / travaux)
- Urgence

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "critical_segments": [
    {
      "segment": "L16-MET-016",
      "name": "Tabeddit – Redeyef (193+720–194+190)",
      "risk_level": "CRITIQUE",
      "rayon_m": 180,
      "ligne": "16",
      "nom_ligne": "Tabeddit – Redeyef",
      "pk_debut": "193+720",
      "pk_fin": "194+190",
      "message": "Courbe critique R=180m détectée sur la ligne 16 (Tabeddit–Redeyef) entre PK 193+720 et 194+190. Rayon inférieur au minimum absolu UIC recommandé de 250m pour ce type de trafic.",
      "action": "Limitation de vitesse immédiate à 20 km/h. Inspection géométrique urgente.",
      "urgency": "IMMEDIATE"
    }
  ],
  "overall_infrastructure_health": 68,
  "summary": "Résumé en français pour l'administrateur"
}

overall_infrastructure_health : entier 0–100 (100 = parfait état).
urgency : IMMEDIATE | HIGH | NORMAL."""

FALLBACK_RESULT = {
    "critical_segments": [],
    "overall_infrastructure_health": 70,
    "summary": "Analyse d'infrastructure temporairement indisponible. Veuillez réessayer.",
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _is_critical(curve: dict) -> bool:
    return (
        curve.get("statut") == "ALERTE"
        or curve.get("niveau_risque") in ("ELEVE", "CRITIQUE")
        or curve.get("rayon_m", 9999) < 500
        # Legacy field support
        or curve.get("etat") == "ALERTE"
        or curve.get("rayon_courbure", 9999) < 500
    )


async def _get_curves_by_query(db, query: dict, limit: int = 200) -> list[dict]:
    """Flexible query helper used by routes and the orchestrator."""
    from services.mongodb_service import serialize_doc
    cursor = db.courbures.find(query).sort("rayon_m", 1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [serialize_doc(d) for d in docs]


async def get_statistics(db) -> dict:
    """Per-line statistics: count, avg radius, % critical curves."""
    from services.mongodb_service import serialize_doc
    pipeline = [
        {"$group": {
            "_id": {"ligne": "$ligne", "nom_ligne": "$nom_ligne"},
            "total":       {"$sum": 1},
            "rayon_moyen": {"$avg": "$rayon_m"},
            "nb_alerte":   {"$sum": {"$cond": [{"$eq": ["$statut", "ALERTE"]}, 1, 0]}},
            "nb_critique": {"$sum": {"$cond": [{"$eq": ["$niveau_risque", "CRITIQUE"]}, 1, 0]}},
            "rayon_min":   {"$min": "$rayon_m"},
        }},
        {"$sort": {"_id.ligne": 1}},
    ]
    cursor = db.courbures.aggregate(pipeline)
    rows = await cursor.to_list(length=20)
    return [
        {
            "ligne":       r["_id"]["ligne"],
            "nom_ligne":   r["_id"]["nom_ligne"],
            "total":       r["total"],
            "rayon_moyen": round(r["rayon_moyen"]),
            "nb_alerte":   r["nb_alerte"],
            "nb_critique": r["nb_critique"],
            "rayon_min":   r["rayon_min"],
            "pct_critique": round(r["nb_critique"] / r["total"] * 100, 1),
        }
        for r in rows
    ]


# ── Main entry point ───────────────────────────────────────────────────────────

async def run_curvature_agent(db) -> dict:
    """
    Fetch ALERTE/CRITIQUE curves, send to LLM for French alert generation,
    persist new alerts to MongoDB.
    """
    print("[CURVATURE AGENT] Querying SNCFT curve database…")

    from services.mongodb_service import serialize_doc

    # All curves with rayon < 500 m (ELEVE or CRITIQUE)
    cursor = db.courbures.find({"rayon_m": {"$lt": 500}}).sort("rayon_m", 1).limit(50)
    all_curves = await cursor.to_list(length=50)
    all_curves = [serialize_doc(d) for d in all_curves]

    # Top 5 most dangerous (lowest rayon)
    top5 = sorted(all_curves, key=lambda c: c.get("rayon_m", 9999))[:5]

    if not all_curves:
        return {
            "critical_segments": [],
            "overall_infrastructure_health": 95,
            "summary": "Toutes les courbes sont dans un état nominal. Aucune alerte infrastructure.",
        }

    # Statistics per line for context
    stats = await get_statistics(db)

    nb_critique = sum(1 for c in all_curves if c.get("niveau_risque") == "CRITIQUE")
    nb_eleve    = sum(1 for c in all_curves if c.get("niveau_risque") == "ELEVE")

    print(
        f"[CURVATURE AGENT] {len(all_curves)} courbes critiques "
        f"({nb_critique} CRITIQUE, {nb_eleve} ELEVE)"
    )

    user_content = json.dumps({
        "courbes_critiques": all_curves,
        "top5_dangereuses":  top5,
        "statistiques_par_ligne": stats,
    }, ensure_ascii=False, default=str)

    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=1500,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_content},
                ],
            )
            raw    = response.choices[0].message.content.strip()
            result = json.loads(raw)

            # Persist alerts, skip duplicates
            for seg_alert in result.get("critical_segments", []):
                existing = await db.alerts.find_one(
                    {"segment": seg_alert.get("segment"), "acknowledged": False}
                )
                if not existing:
                    await save_alert(db, seg_alert)
                    print(
                        f"[CURVATURE AGENT] Alerte enregistrée : "
                        f"{seg_alert.get('segment')} — {seg_alert.get('risk_level')}"
                    )

            print(
                f"[CURVATURE AGENT] Santé infrastructure : "
                f"{result.get('overall_infrastructure_health')}%"
            )
            return result

        except json.JSONDecodeError as e:
            print(f"[CURVATURE AGENT] JSON parse error (tentative {attempt + 1}): {e}")
            if attempt == 1:
                return FALLBACK_RESULT
        except Exception as e:
            print(f"[CURVATURE AGENT] Erreur : {e}")
            return FALLBACK_RESULT

    return FALLBACK_RESULT
