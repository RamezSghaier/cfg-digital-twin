"""
Pydantic models for request/response validation across the CFG Digital Twin API.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─── Chat ─────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    user_role: str = "USER"  # "ADMIN" | "USER"


class WeatherData(BaseModel):
    condition: str
    temperature: float
    wind_speed: float
    visibility_km: float
    impact_score: float
    impact_level: str  # LOW | MEDIUM | HIGH | CRITICAL
    speed_recommendation: float
    warnings: List[str] = []
    summary: str


class AlertItem(BaseModel):
    segment: str
    name: str
    risk_level: str
    curvature: float
    tonnage: float
    message: str
    action: str
    urgency: str


class ChatResponse(BaseModel):
    message: str
    scenario_found: bool = False
    scenario_id: Optional[str] = None
    scenario: Optional[Dict[str, Any]] = None
    risk_level: str = "LOW"
    risk_score: float = 0.0
    show_launch_button: bool = False
    weather: Optional[Dict[str, Any]] = None
    alerts: List[Dict[str, Any]] = []
    weather_warning: Optional[str] = None
    highlight_segments: List[str] = []
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Alerts ───────────────────────────────────────────────────────────────────

class AlertDocument(BaseModel):
    segment: str
    name: str
    risk_level: str
    curvature: float
    tonnage: float
    message: str
    action: str
    urgency: str
    acknowledged: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AlertCountResponse(BaseModel):
    count: int


# ─── Journal ──────────────────────────────────────────────────────────────────

class JournalEntry(BaseModel):
    date: str  # YYYY-MM-DD
    scenario_id: str
    mode: str  # e.g. "AUTO" | "MANUAL"
    summary: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class JournalListParams(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None
    limit: int = 50


# ─── Segments (curvature) ─────────────────────────────────────────────────────

class SegmentDocument(BaseModel):
    segment: str
    name: str
    rayon_courbure: float
    degres_par_km: float
    tonnage_estime: float
    etat: str  # "OK" | "ALERTE"
    date_maj: str
    longueur_km: float
