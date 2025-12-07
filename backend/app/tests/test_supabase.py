import os
from app.db.supabase_client import supabase
from app.core.config import settings

def test_supabase_env_vars():
    assert settings.SUPABASE_URL is not None
    assert settings.SUPABASE_SERVICE_KEY is not None

def test_supabase_client_exists():
    assert supabase is not None

def test_supabase_can_list_buckets():
    res = supabase.storage.list_buckets()
    assert isinstance(res, list)

def test_supabase_invalid_table_returns_error():
    """
    Test that querying a non-existent table raises an APIError cleanly.
    """
    try:
        supabase.table("nonexistent_table").select("*").limit(1).execute()
        assert False, "Expected an error for nonexistent table"
    except Exception as e:
        # Expected failure
        assert "Could not find the table" in str(e) or "does not exist" in str(e)

def test_supabase_storage_upload_fail():
    """
    Attempt to upload to non-existent bucket → should fail gracefully.
    """
    try:
        supabase.storage.from_("missing_bucket").upload("test.txt", b"hello")
        assert False, "Expected upload to missing bucket to fail"
    except Exception as e:
        assert "Not Found" in str(e) or "error" in str(e)

def test_supabase_bucket_exists_or_not():
    """
    Verifies storage is reachable.
    """
    buckets = supabase.storage.list_buckets()
  

    assert len(buckets) > 0
    assert isinstance(buckets, list)


def test_supabase_select_datasets_table():
    """
    If table exists, selecting should not crash even if table is empty.
    """
    try:
        res = supabase.table("datasets").select("*").limit(1).execute()
        # res is an APIResponse, ensure it has .data attribute
        assert hasattr(res, "data")
        assert isinstance(res.data, list)
    except APIError as e:
        # If table does NOT exist, that's also valuable feedback
        assert "Could not find the table" in str(e)