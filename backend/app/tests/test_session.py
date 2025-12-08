from app.services import session_service

def test_create_and_get_session():
    s = session_service.create_session()
    assert "session_id" in s
    assert s["expires_at"] > s["created_at"]
    fetched = session_service.get_session(s["session_id"])
    assert fetched is not None
    assert fetched["session_id"] == s["session_id"]

def test_expired_session():
    s = session_service.create_session()
    # delete session to simulate expiration
    session_service.delete_session(s["session_id"])
    fetched = session_service.get_session(s["session_id"])
    assert fetched is None

def test_delete_session():
    s = session_service.create_session()
    session_service.delete_session(s["session_id"])
    # session should no longer exist
    fetched = session_service.get_session(s["session_id"])
    assert fetched is None