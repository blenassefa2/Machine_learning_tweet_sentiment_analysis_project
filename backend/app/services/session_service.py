import uuid
from app.db.supabase_client import supabase
from postgrest.exceptions import APIError
from datetime import datetime, timedelta, timezone

SESSION_DURATION_MINUTES = 60  # 1 hour

def create_session() -> dict:
    session_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(minutes=SESSION_DURATION_MINUTES)

    supabase.table("sessions").insert({
        "session_id": session_id,
        "created_at": created_at.isoformat(),
        "expires_at": expires_at.isoformat()
    }).execute()

    return {
        "session_id": session_id,
        "created_at": created_at,
        "expires_at": expires_at
    }

def get_session(session_id: str) -> dict | None:
    res = supabase.table("sessions").select("*").eq("session_id", session_id).execute()
    if res.data and len(res.data) > 0:
        session = res.data[0]
        expires_at = datetime.fromisoformat(session["expires_at"])
        if expires_at.tzinfo is None:
            # make it UTC if naive
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at > datetime.now(timezone.utc):
            return session
    return None

def delete_session(session_id: str):
    """
    Delete session explicitly.
    """
    try:
        supabase.table("sessions").delete().eq("session_id", session_id).execute()
    except APIError as e:
        print(f"Failed to delete session {session_id}: {e}")


def cleanup_expired_sessions():
    """
    Delete all expired sessions.
    Can be called periodically (cron job or background task).
    """
    now = datetime.utcnow().isoformat()
    try:
        supabase.table("sessions").delete().lt("expires_at", now).execute()
    except APIError as e:
        print(f"Failed to cleanup expired sessions: {e}")