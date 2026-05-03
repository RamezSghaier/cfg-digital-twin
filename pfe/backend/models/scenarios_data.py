# Fixed scenario library — these are the ONLY scenarios the system can simulate.
# The AI matches user questions to these scenarios but cannot create new ones.

SCENARIOS = [
    {
        "id": "deraillement",
        "name": "Déraillement",
        "type": "CRITIQUE",
        "color": "#F87171",
        "description": (
            "Le train quitte les rails suite à une courbure excessive, "
            "une vitesse inadaptée ou une défaillance mécanique."
        ),
        "triggers": {
            "min_speed": 80,
            "max_curvature": 3.0,
            "weather_conditions": ["storm", "ice"],
        },
        "keywords": [
            "déraillement", "dérailler",
            "train sort", "quitte les rails",
            "accident", "catastrophe",
        ],
    },
    {
        "id": "usure_rails",
        "name": "Usure des Rails",
        "type": "DEGRADATION",
        "color": "#FB923C",
        "description": (
            "Dégradation progressive du métal des rails due au tonnage "
            "cumulé et aux conditions climatiques."
        ),
        "triggers": {
            "min_tonnage": 50,
            "min_cycles": 1000,
        },
        "keywords": [
            "usure", "rail usé", "dégradation",
            "fatigue", "corrosion", "détérioration",
            "métal", "rail abîmé",
        ],
    },
    {
        "id": "brouillard_dense",
        "name": "Brouillard Dense",
        "type": "METEO",
        "color": "#94A3B8",
        "description": (
            "Visibilité réduite à moins de 50m rendant la conduite "
            "dangereuse et nécessitant une réduction de vitesse."
        ),
        "triggers": {
            "visibility_km": 0.05,
            "weather_code": "fog",
        },
        "keywords": [
            "brouillard", "visibilité", "fog",
            "brume", "opaque", "voir rien",
            "conditions météo difficiles",
        ],
    },
    {
        "id": "surcharge_voie",
        "name": "Surcharge Voie",
        "type": "CHARGE",
        "color": "#FBBF24",
        "description": (
            "Le poids du convoi dépasse la capacité nominale de la voie, "
            "risquant de déformer les rails."
        ),
        "triggers": {
            "max_tonnage": 80,
            "segment_capacity": 70,
        },
        "keywords": [
            "surcharge", "poids", "tonnage",
            "trop lourd", "capacité", "charge",
            "phosphate", "convoi",
        ],
    },
    {
        "id": "inondation_voie",
        "name": "Inondation Voie",
        "type": "METEO",
        "color": "#60A5FA",
        "description": (
            "La voie est recouverte d'eau suite à des pluies intenses, "
            "rendant la circulation impossible."
        ),
        "triggers": {
            "rainfall_mm": 50,
            "weather_code": "heavy_rain",
        },
        "keywords": [
            "inondation", "eau", "pluie",
            "flood", "submergé", "voie noyée",
            "fortes pluies",
        ],
    },
    {
        "id": "defaillance_frein",
        "name": "Défaillance Frein",
        "type": "MECANIQUE",
        "color": "#F87171",
        "description": (
            "Le système de freinage ne répond plus correctement, "
            "augmentant la distance d'arrêt."
        ),
        "triggers": {
            "brake_efficiency": 0.3,
        },
        "keywords": [
            "frein", "freinage", "brake",
            "arrêt", "distance freinage",
            "ne freine plus", "défaillance",
        ],
    },
    {
        "id": "courbure_critique",
        "name": "Courbure Critique",
        "type": "INFRASTRUCTURE",
        "color": "#C084FC",
        "description": (
            "Un segment de voie présente un rayon de courbure trop faible "
            "pour la vitesse nominale du train."
        ),
        "triggers": {
            "max_curvature_degree": 5.0,
            "min_radius_m": 300,
        },
        "keywords": [
            "courbure", "courbe", "virage",
            "rayon", "segment", "angle",
            "courbure critique",
        ],
    },
]

# Build a quick lookup dict for O(1) access by id
SCENARIOS_BY_ID = {s["id"]: s for s in SCENARIOS}
