from supabase import create_client
import os
from app.core.config import settings

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_SERVICE_KEY
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)