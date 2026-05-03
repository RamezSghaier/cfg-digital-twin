"""
MongoDB connection via motor (async driver).
Exposes a `db` object used by services and routes.
On startup, seeds empty collections with realistic mock data.
"""
import asyncio
from datetime import datetime, timedelta

import motor.motor_asyncio

from config import settings

# ─── Connection ───────────────────────────────────────────────────────────────

client: motor.motor_asyncio.AsyncIOMotorClient = None
db: motor.motor_asyncio.AsyncIOMotorDatabase = None


async def connect_db():
    global client, db
    print("[DB] Connecting to MongoDB…")
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    # Ping to verify connection
    await client.admin.command("ping")
    print(f"[DB] Connected — database: {settings.mongodb_db_name}")


async def close_db():
    global client
    if client:
        client.close()
        print("[DB] Connection closed.")


# ─── Seed data ────────────────────────────────────────────────────────────────

SEED_SEGMENTS = [
    {
        "segment": "A-01",
        "name": "Gafsa — Moularès",
        "rayon_courbure": 920,
        "degres_par_km": 2.1,
        "tonnage_estime": 42,
        "etat": "OK",
        "longueur_km": 45,
        "date_maj": "2025-03-28",
        # Rail wear data — calibrated from UIC 54kg inspection report
        "usure_verticale_mm": 4,
        "hauteur_rail_mm": 155,
        "tonnage_cumule_t": 420_000_000,
        "years_since_meulage": 2,
        "defauts_detectes": [],
    },
    {
        "segment": "A-02",
        "name": "Moularès — Redeyef",
        "rayon_courbure": 680,
        "degres_par_km": 3.4,
        "tonnage_estime": 58,
        "etat": "OK",
        "longueur_km": 38,
        "date_maj": "2025-03-28",
        "usure_verticale_mm": 7,
        "hauteur_rail_mm": 152,
        "tonnage_cumule_t": 520_000_000,
        "years_since_meulage": 3,
        "defauts_detectes": ["usure_ondulatoire"],
    },
    {
        "segment": "B-01",
        "name": "Redeyef — M'dhilla",
        "rayon_courbure": 310,
        "degres_par_km": 5.8,
        "tonnage_estime": 67,
        "etat": "ALERTE",
        "longueur_km": 29,
        "date_maj": "2025-04-01",
        "usure_verticale_mm": 9,
        "hauteur_rail_mm": 150,
        "tonnage_cumule_t": 650_000_000,  # above surveillance threshold (600 MT)
        "years_since_meulage": 6,          # above max interval (4 yr)
        "defauts_detectes": ["usure_ondulatoire", "head_checking"],
    },
    {
        "segment": "B-02",
        "name": "M'dhilla — Metlaoui",
        "rayon_courbure": 750,
        "degres_par_km": 2.9,
        "tonnage_estime": 55,
        "etat": "OK",
        "longueur_km": 33,
        "date_maj": "2025-03-28",
        "usure_verticale_mm": 5,
        "hauteur_rail_mm": 154,
        "tonnage_cumule_t": 480_000_000,
        "years_since_meulage": 2,
        "defauts_detectes": [],
    },
    {
        "segment": "C-01",
        "name": "Metlaoui — Om Larayes",
        "rayon_courbure": 520,
        "degres_par_km": 4.2,
        "tonnage_estime": 61,
        "etat": "OK",
        "longueur_km": 41,
        "date_maj": "2025-03-28",
        "usure_verticale_mm": 6,
        "hauteur_rail_mm": 153,
        "tonnage_cumule_t": 560_000_000,
        "years_since_meulage": 4,          # at the recommended limit
        "defauts_detectes": ["defibrage"],
    },
]

# Mock journal entries — 5 dates with risk scenarios (April 2025)
SEED_JOURNAL = [
    {
        "date": "2025-04-02",
        "scenario_id": "courbure_critique",
        "mode": "AUTO",
        "summary": (
            "Alerte courbure critique détectée sur le segment B-01. "
            "Vitesse réduite à 60 km/h. Inspection planifiée."
        ),
        "created_at": datetime(2025, 4, 2, 8, 15, 0),
    },
    {
        "date": "2025-04-05",
        "scenario_id": "brouillard_dense",
        "mode": "MANUAL",
        "summary": (
            "Brouillard dense signalé entre Moularès et Redeyef. "
            "Visibilité inférieure à 50m. Convoi retardé de 45 minutes."
        ),
        "created_at": datetime(2025, 4, 5, 6, 30, 0),
    },
    {
        "date": "2025-04-08",
        "scenario_id": "surcharge_voie",
        "mode": "AUTO",
        "summary": (
            "Tonnage du convoi phosphate enregistré à 78 tonnes — "
            "proche de la capacité limite. Surveillance renforcée activée."
        ),
        "created_at": datetime(2025, 4, 8, 14, 0, 0),
    },
    {
        "date": "2025-04-10",
        "scenario_id": "usure_rails",
        "mode": "MANUAL",
        "summary": (
            "Inspection manuelle du segment A-02 révèle une usure "
            "modérée. Maintenance préventive programmée pour fin du mois."
        ),
        "created_at": datetime(2025, 4, 10, 9, 45, 0),
    },
    {
        "date": "2025-04-12",
        "scenario_id": "inondation_voie",
        "mode": "AUTO",
        "summary": (
            "Fortes pluies enregistrées (62 mm). Risque d'inondation "
            "sur le segment C-01. Circulation suspendue temporairement."
        ),
        "created_at": datetime(2025, 4, 12, 17, 20, 0),
    },
]


async def seed_if_empty():
    """
    Upsert segments so new fields (rail wear data) are added to existing
    documents without wiping the collection. Journal is only seeded once.
    """
    # Segments — always upsert so enriched fields reach existing documents
    for seg in SEED_SEGMENTS:
        await db.courbures.update_one(
            {"segment": seg["segment"]},
            {"$set": seg},
            upsert=True,
        )
    print(f"[DB] Upserted {len(SEED_SEGMENTS)} segments in 'courbures'.")

    # Journal — only on first run
    if await db.journal.count_documents({}) == 0:
        await db.journal.insert_many(SEED_JOURNAL)
        print(f"[DB] Seeded {len(SEED_JOURNAL)} entries into 'journal'.")
