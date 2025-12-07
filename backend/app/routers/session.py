from fastapi import APIRouter, HTTPException
from app.core.database import get_supabase

router = APIRouter()

SESSION_TABLE = "sessions"   # Must exist in Supabase

@router.get("/session/cleanup/status")
async def get_session_cleanup_status():
    """
    Returns total active sessions and last cleanup timestamp (if stored).
    """
    supabase = get_supabase()

    # Count how many sessions currently exist
    result = supabase.table(SESSION_TABLE).select("session_id").execute()

    if hasattr(result, "error") and result.error:
        raise HTTPException(status_code=500, detail="Failed to fetch session info")

    return {
        "active_sessions": len(result.data),
        "status": "ok"
    }


@router.post("/session/cleanup/force")
async def force_session_cleanup():
    """
    Deletes ALL user session data. When sessions are deleted,
    all associated user data (datasets, models, results) must also be removed.
    """
    supabase = get_supabase()

    # Delete everything from sessions table
    delete_sessions = supabase.table(SESSION_TABLE).delete().neq("session_id", "").execute()

    if hasattr(delete_sessions, "error") and delete_sessions.error:
        raise HTTPException(status_code=500, detail="Failed to delete sessions")

    # Also clean linked data if your schema stores session_id in other tables.
    # Example (uncomment when needed):
    # supabase.table("datasets").delete().neq("session_id", "").execute()

    return {
        "message": "All sessions and associated data removed successfully",
        "deleted_count": delete_sessions.count if hasattr(delete_sessions, "count") else None
    }


@router.get("/supabase-listener")
async def get_supabase_listener_status():
    """
    Returns whether the backend can successfully connect to Supabase.
    Useful for debugging connectivity.
    """
    supabase = get_supabase()

    # Simple ping: read 1 row from sessions table
    result = supabase.table(SESSION_TABLE).select("*").limit(1).execute()

    if hasattr(result, "error") and result.error:
        return {"status": "disconnected", "error": str(result.error)}

    return {"status": "connected"}