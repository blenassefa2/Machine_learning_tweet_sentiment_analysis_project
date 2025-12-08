from fastapi import APIRouter, HTTPException
from app.services.session_service import create_session, get_session

router = APIRouter(prefix="/session", tags=["session"])

@router.post("", response_model=dict)
def start_session():
    """
    Create a new session for a user.
    """
    session = create_session()
    return {
        "session_id": session["session_id"],
        "expires_at": session["expires_at"]
    }


@router.get("/{session_id}", response_model=dict)
def fetch_session(session_id: str):
    """
    Fetch session info if valid.
    """
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return session

@router.delete("/{session_id}", response_model=dict)
def delete_session(session_id: str):
    session_service.delete_session(session_id)
    return {"message": f"Session {session_id} deleted"}