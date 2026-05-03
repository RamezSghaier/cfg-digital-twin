"""
Scenario routes:
  GET /api/scenarios      — full list of all predefined scenarios
  GET /api/scenarios/{id} — single scenario by ID
"""
from fastapi import APIRouter, HTTPException

from models.scenarios_data import SCENARIOS, SCENARIOS_BY_ID

router = APIRouter()


@router.get("/scenarios")
async def list_scenarios():
    """Return the complete fixed scenario library used by the IA page."""
    return {"scenarios": SCENARIOS, "count": len(SCENARIOS)}


@router.get("/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    """Return a single scenario by its ID."""
    scenario = SCENARIOS_BY_ID.get(scenario_id)
    if scenario is None:
        raise HTTPException(
            status_code=404,
            detail=f"Scénario '{scenario_id}' introuvable.",
        )
    return scenario
