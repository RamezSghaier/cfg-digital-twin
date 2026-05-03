"""
Fetches live weather from OpenWeatherMap and caches results in MongoDB
for 30 minutes to stay within API rate limits.
"""
import json
from datetime import datetime, timedelta, timezone

import httpx

from config import settings

# Default fallback values if the weather API is unavailable
FALLBACK_WEATHER = {
    "condition": "Ensoleillé",
    "temperature": 28.0,
    "wind_speed": 10.0,
    "visibility_km": 10.0,
    "humidity": 30,
    "weather_code": "clear",
    "raw": {},
}

CACHE_DURATION_MINUTES = 30
OWM_BASE = "https://api.openweathermap.org/data/2.5/weather"


async def fetch_weather_from_api() -> dict:
    """Call OpenWeatherMap and return normalised weather dict."""
    params = {
        "q": settings.weather_city,
        "appid": settings.weather_api_key,
        "units": "metric",
        "lang": "fr",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(OWM_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    weather_id = data["weather"][0]["id"]

    # Map OWM weather code to a simple string tag
    if weather_id == 741:
        code = "fog"
    elif weather_id in (731, 751, 761, 762):
        code = "sandstorm"
    elif weather_id in range(500, 532):
        code = "heavy_rain" if weather_id >= 502 else "rain"
    elif weather_id in range(200, 300):
        code = "storm"
    elif weather_id in range(600, 700):
        code = "ice"
    elif weather_id in range(800, 810):
        code = "clear" if weather_id == 800 else "cloudy"
    else:
        code = "unknown"

    return {
        "condition": data["weather"][0]["description"].capitalize(),
        "temperature": data["main"]["temp"],
        "wind_speed": data["wind"]["speed"],
        "visibility_km": data.get("visibility", 10000) / 1000,
        "humidity": data["main"]["humidity"],
        "clouds_pct": data.get("clouds", {}).get("all", 0),
        "weather_code": code,
        "raw": data,
    }


async def get_weather(db) -> dict:
    """
    Return weather data, using MongoDB cache when fresh (< 30 min old).
    Falls back to default values if both cache and API fail.
    """
    # Try cache first
    try:
        cached = await db.weather_cache.find_one(
            {}, sort=[("fetched_at", -1)]
        )
        if cached:
            age = datetime.now(timezone.utc) - cached["fetched_at"].replace(
                tzinfo=timezone.utc
            )
            if age < timedelta(minutes=CACHE_DURATION_MINUTES):
                print("[WEATHER SERVICE] Returning cached weather data.")
                return cached["data"]
    except Exception as e:
        print(f"[WEATHER SERVICE] Cache read error: {e}")

    # Fetch fresh data
    print("[WEATHER SERVICE] Fetching fresh weather from OpenWeatherMap…")
    try:
        data = await fetch_weather_from_api()
        # Store in cache
        try:
            await db.weather_cache.insert_one(
                {"data": data, "fetched_at": datetime.utcnow()}
            )
        except Exception as e:
            print(f"[WEATHER SERVICE] Cache write error: {e}")
        return data
    except Exception as e:
        print(f"[WEATHER SERVICE] API error: {e} — using fallback values.")
        return FALLBACK_WEATHER
