"""
Weather routes:
  GET /api/weather/current — current weather + impact analysis for Gafsa
  GET /api/weather/scene   — minimal weather data for 3D scene synchronization
"""
from fastapi import APIRouter, HTTPException, Request

from agents.weather_agent import run_weather_agent
from services.weather_service import get_weather

router = APIRouter()


@router.get("/weather/current")
async def current_weather(request: Request):
    """Return live (or cached) weather data with railway impact analysis."""
    db = request.app.state.db
    try:
        result = await run_weather_agent(db)
        return result
    except Exception as e:
        print(f"[WEATHER ROUTE] Error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Service météo temporairement indisponible.",
        )


@router.get("/weather/scene")
async def scene_weather(request: Request):
    """Return minimal weather data for 3D scene sync (no LLM, fast)."""
    db = request.app.state.db
    try:
        data = await get_weather(db)
        return {
            "weather_code": data.get("weather_code", "clear"),
            "condition":    data.get("condition", "Ensoleillé"),
            "temperature":  data.get("temperature", 28),
            "wind_speed":   data.get("wind_speed", 10),
            "clouds_pct":   data.get("clouds_pct", 0),
        }
    except Exception as e:
        print(f"[WEATHER SCENE ROUTE] Error: {e}")
        return {"weather_code": "clear", "condition": "Ensoleillé",
                "temperature": 28, "wind_speed": 10, "clouds_pct": 0}
