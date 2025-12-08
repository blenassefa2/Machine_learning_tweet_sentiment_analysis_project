from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from dotenv import load_dotenv
import os
from typing import List, Optional
from pathlib import Path


# Get the project root directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent


# Load environment variables from .env file
load_dotenv(dotenv_path=ROOT_DIR / ".env", override=True)


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MLPipeline"
       
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_BUCKET: str
    SECRET_KEY: str 
    MODEL_BUCKET: str = "models"
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379"
    
    # Application Settings
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173/", "https://pje.blen-tilahun.site/"]
    
    
    model_config =  ConfigDict(
        env_file = str(ROOT_DIR / ".env"),
        env_file_encoding = "utf-8",
        case_sensitive = True,
        extra = "allow"  # Allow extra fields in .env file
    )

# Create settings instance
settings = Settings() 
