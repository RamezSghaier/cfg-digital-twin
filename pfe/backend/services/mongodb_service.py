"""
MongoDB helper functions used by routes and agents.
Keeps database logic separate from business logic.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId


def serialize_doc(doc: dict) -> dict:
    """Convert ObjectId and datetime fields to JSON-serialisable types."""
    return _serialize(doc)


def _serialize(doc: dict) -> dict:
    """Convert ObjectId and datetime fields to JSON-serialisable types."""
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = _serialize(v)
        elif isinstance(v, list):
            result[k] = [
                _serialize(i) if isinstance(i, dict) else i for i in v
            ]
        else:
            result[k] = v
    return result


# ─── Journal ──────────────────────────────────────────────────────────────────

async def save_journal_entry(db, entry: dict):
    await db.journal.insert_one({**entry, "created_at": datetime.utcnow()})


async def get_journal_entries(
    db,
    month: Optional[int] = None,
    year: Optional[int] = None,
    limit: int = 50,
) -> List[dict]:
    query = {}
    if month or year:
        # Filter by date prefix e.g. "2025-04"
        prefix_parts = []
        if year:
            prefix_parts.append(str(year))
        if month:
            prefix_parts.append(f"{month:02d}")
        prefix = "-".join(prefix_parts)
        query["date"] = {"$regex": f"^{prefix}"}

    cursor = db.journal.find(query).sort("date", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [_serialize(d) for d in docs]


async def get_journal_entry_by_date(db, date: str) -> Optional[dict]:
    doc = await db.journal.find_one({"date": date})
    return _serialize(doc)


# ─── Alerts ───────────────────────────────────────────────────────────────────

async def save_alert(db, alert: dict):
    await db.alerts.insert_one({**alert, "acknowledged": False, "created_at": datetime.utcnow()})


async def get_unacknowledged_alerts(db) -> List[dict]:
    cursor = db.alerts.find({"acknowledged": False}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return [_serialize(d) for d in docs]


async def acknowledge_alert(db, alert_id: str) -> Optional[dict]:
    result = await db.alerts.find_one_and_update(
        {"_id": ObjectId(alert_id)},
        {"$set": {"acknowledged": True, "acknowledged_at": datetime.utcnow()}},
        return_document=True,
    )
    return _serialize(result)


async def count_active_alerts(db) -> int:
    return await db.alerts.count_documents({"acknowledged": False})


# ─── Segments ─────────────────────────────────────────────────────────────────

async def get_all_segments(db) -> List[dict]:
    cursor = db.courbures.find({})
    docs = await cursor.to_list(length=100)
    return [_serialize(d) for d in docs]


async def update_segment(db, segment_id: str, fields: dict) -> Optional[dict]:
    result = await db.courbures.find_one_and_update(
        {"segment_id": segment_id},
        {"$set": {**fields, "updated_at": datetime.utcnow()}},
        return_document=True,
    )
    return _serialize(result)


async def delete_segment(db, segment_id: str) -> bool:
    result = await db.courbures.delete_one({"segment_id": segment_id})
    return result.deleted_count > 0


async def create_segment(db, segment: dict) -> dict:
    segment["created_at"] = datetime.utcnow()
    await db.courbures.insert_one(segment)
    return _serialize(segment)


# ─── Risk predictions ────────────────────────────────────────────────────────

async def save_prediction(db, date: str, prediction: dict):
    """Upsert a prediction by date — overwrite if regenerated."""
    await db.predictions.update_one(
        {"date": date},
        {"$set": {**prediction, "saved_at": datetime.utcnow()}},
        upsert=True,
    )


async def get_future_predictions(db, from_date: str) -> List[dict]:
    """Return all stored predictions for dates >= from_date, sorted ascending."""
    cursor = db.predictions.find({"date": {"$gte": from_date}}).sort("date", 1)
    docs = await cursor.to_list(length=60)
    return [_serialize(d) for d in docs]


# ─── Chat journal (conversation log) ─────────────────────────────────────────

async def log_conversation(db, user_message: str, ai_response: dict, user_role: str):
    await db.scenarios_log.insert_one(
        {
            "user_message": user_message,
            "ai_response": ai_response,
            "user_role": user_role,
            "timestamp": datetime.utcnow(),
        }
    )
