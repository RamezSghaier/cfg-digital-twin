"""
CFG Digital Twin — FastAPI application entry point.

Startup sequence:
  1. Connect to MongoDB
  2. Seed collections if empty
  3. Run initial curvature check to populate alerts
"""
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from database import connect_db, close_db, seed_if_empty, db as _db_ref
import database  # so we can access database.db after connect

from routes.auth import router as auth_router
from routes.segments import router as segments_router
from routes.suspension import router as suspension_router
from routes.chat import router as chat_router
from routes.alerts import router as alerts_router
from routes.journal import router as journal_router
from routes.scenarios import router as scenarios_router
from routes.weather import router as weather_router
from routes.train import router as train_router


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────
    try:
        await connect_db()
        app.state.db = database.db          # attach db to app state
        await seed_if_empty()

        # Run initial curvature check to populate the alerts collection
        from agents.curvature_agent import run_curvature_agent
        await run_curvature_agent(app.state.db)
        print("[STARTUP] Initial curvature check complete.")
    except Exception as e:
        print(f"[STARTUP] ERROR — {e}")
        raise

    yield

    # ── Shutdown ─────────────────────────────────────────
    await close_db()


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CFG Digital Twin API",
    description="AI backend for Chemin de Fer de Gafsa railway digital twin",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request logging middleware ───────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    print(
        f"[HTTP] {request.method} {request.url.path} "
        f"→ {response.status_code} ({duration_ms:.1f}ms)"
    )
    return response

# ─── Global exception handler ────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": (
                "Une erreur interne est survenue. "
                "Veuillez contacter l'administrateur système."
            )
        },
    )

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth_router, prefix="/api")
app.include_router(segments_router, prefix="/api")
app.include_router(suspension_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(journal_router, prefix="/api")
app.include_router(scenarios_router, prefix="/api")
app.include_router(weather_router, prefix="/api")
app.include_router(train_router, prefix="/api")

# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health(request: Request):
    """Quick liveness probe — checks DB connection."""
    try:
        await request.app.state.db.command("ping")
        db_status = "ok"
    except Exception:
        db_status = "unreachable"

    return {
        "status": "ok",
        "database": db_status,
        "version": "1.0.0",
        "project": "CFG Digital Twin",
    }
