"""
Rail risk scoring — calibrated from a real inspection report
(Nouaceur/El Jadida line, Morocco) and adapted for CFG thresholds.

The same rail type (UIC 54 kg) and operating profile (phosphate convoys,
high cumulative tonnage) make these thresholds directly applicable.
"""

# ── Voie reference parameters ────────────────────────────────────────────────

VOIE_PARAMS = {
    "profil_rail": "UIC 54kg",
    "type_traverses": "béton VAX U30",
    "attaches": "NABLA",
    "vitesse_max_voyageurs_kmh": 160,
    "vitesse_max_fret_kmh": 60,
    "hauteur_rail_neuf_mm": 159,
}

# ── Risk thresholds ───────────────────────────────────────────────────────────

RAIL_RISK_THRESHOLDS = {
    # Vertical wear (mm)
    "usure_faible_mm": 5,        # < 5   → LOW
    "usure_moderate_mm": 10,     # 5–10  → MEDIUM
    "usure_critique_mm": 13,     # 10–13 → HIGH
    "usure_limite_mm": 16,       # > 13  → CRITICAL

    # Rail height
    "hauteur_neuf_mm": 159,
    "hauteur_min_acceptable_mm": 146,   # 159 − 13 mm wear limit

    # Cumulative tonnage (tonnes)
    "tonnage_surveillance_t": 600_000_000,
    "tonnage_critique_t": 750_000_000,
    "tonnage_limite_t": 800_000_000,

    # Grinding interval
    "meulage_max_interval_years": 4,
}

# ── Defect catalog ────────────────────────────────────────────────────────────

DEFAUTS_RAIL = [
    {
        "id": "head_checking",
        "nom": "Head Checking",
        "description": (
            "Fissures de fatigue en surface du champignon du rail, "
            "risque d'écaillage puis de rupture."
        ),
        "niveau_risque": "HIGH",
        "action": "Meulage immédiat requis",
    },
    {
        "id": "ecaillage",
        "nom": "Écaillage",
        "description": (
            "Décollement ou exfoliation de métal en surface. "
            "Peut masquer des fissures transversales internes."
        ),
        "niveau_risque": "HIGH",
        "action": "Inspection ultrason + meulage",
    },
    {
        "id": "defibrage",
        "nom": "Défibrage au congé de roulement",
        "description": (
            "Dégradation des fibres métalliques au congé, "
            "précurseur de fissuration."
        ),
        "niveau_risque": "MEDIUM",
        "action": "Surveillance renforcée",
    },
    {
        "id": "usure_ondulatoire",
        "nom": "Usure ondulatoire",
        "description": (
            "Ondulations périodiques de la surface de roulement "
            "générant des chocs répétés."
        ),
        "niveau_risque": "MEDIUM",
        "action": "Meulage périodique",
    },
    {
        "id": "fissure_transversale",
        "nom": "Fissure transversale",
        "description": (
            "Fissure perpendiculaire à la table de roulement, "
            "risque de rupture brutale. Souvent masquée par écaillage."
        ),
        "niveau_risque": "CRITICAL",
        "action": "Arrêt immédiat circulation",
    },
    {
        "id": "rupture_rail",
        "nom": "Rupture de rail",
        "description": "Rupture complète du rail, risque maximum de déraillement.",
        "niveau_risque": "CRITICAL",
        "action": "Arrêt immédiat + remplacement",
    },
]

# ── Scoring function ──────────────────────────────────────────────────────────

def calculate_rail_risk_score(segment: dict) -> dict:
    """
    Compute a 0–100 risk score for a rail segment based on wear data,
    cumulative tonnage, grinding history, and detected defects.

    Returns: { score, level, color, warnings }
    """
    score = 0
    warnings = []

    # Vertical wear
    usure = segment.get("usure_verticale_mm", 0)
    if usure >= RAIL_RISK_THRESHOLDS["usure_critique_mm"]:
        score += 40
        warnings.append(
            f"Usure critique : {usure} mm "
            f"(limite {RAIL_RISK_THRESHOLDS['usure_limite_mm']} mm)"
        )
    elif usure >= RAIL_RISK_THRESHOLDS["usure_moderate_mm"]:
        score += 25
        warnings.append(f"Usure élevée : {usure} mm")
    elif usure >= RAIL_RISK_THRESHOLDS["usure_faible_mm"]:
        score += 10

    # Cumulative tonnage
    tonnage = segment.get("tonnage_cumule_t", 0)
    if tonnage >= RAIL_RISK_THRESHOLDS["tonnage_critique_t"]:
        score += 30
        warnings.append(f"Tonnage critique : {tonnage:,} T")
    elif tonnage >= RAIL_RISK_THRESHOLDS["tonnage_surveillance_t"]:
        score += 15
        warnings.append(f"Tonnage en zone de surveillance : {tonnage:,} T")

    # Grinding interval
    years = segment.get("years_since_meulage", 0)
    max_interval = RAIL_RISK_THRESHOLDS["meulage_max_interval_years"]
    if years >= max_interval + 2:          # e.g. ≥ 6 years
        score += 20
        warnings.append(
            f"Meulage non effectué depuis {years} ans "
            f"(maximum recommandé : {max_interval} ans)"
        )
    elif years >= max_interval:
        score += 10
        warnings.append(f"Intervalle de meulage dépassé ({years} ans)")

    # Detected defects
    defauts = segment.get("defauts_detectes", [])
    if "fissure_transversale" in defauts:
        score += 40
        warnings.append("CRITIQUE : Fissure transversale détectée — arrêt circulation requis")
    if "rupture_rail" in defauts:
        score += 50
        warnings.append("CRITIQUE : Rupture de rail — arrêt immédiat + remplacement")
    if "head_checking" in defauts:
        score += 20
        warnings.append("Head Checking détecté — meulage immédiat requis")
    if "ecaillage" in defauts:
        score += 15
        warnings.append("Écaillage détecté — inspection ultrason recommandée")
    if "defibrage" in defauts:
        score += 8
    if "usure_ondulatoire" in defauts:
        score += 8

    # Final level
    score = min(score, 100)
    if score >= 70:
        level, color = "CRITICAL", "#F87171"
    elif score >= 40:
        level, color = "HIGH", "#FB923C"
    elif score >= 20:
        level, color = "MEDIUM", "#FBBF24"
    else:
        level, color = "LOW", "#4ADE80"

    return {"score": score, "level": level, "color": color, "warnings": warnings}
