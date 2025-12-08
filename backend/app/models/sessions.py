from pydantic import BaseModel, UUID4
from datetime import datetime, timedelta

class SessionCreateResponse(BaseModel):
    session_id: UUID4
    expires_at: datetime

class SessionInfo(BaseModel):
    session_id: UUID4
    created_at: datetime
    expires_at: datetime