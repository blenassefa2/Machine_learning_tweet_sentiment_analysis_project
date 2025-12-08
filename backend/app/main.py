import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import file, clean, classify, train, predict, evaluate, session


port = int(os.environ.get("PORT", 8080))
# Log the allowed origins
print("✅ Allowed CORS origins:", settings.CORS_ORIGINS)
app = FastAPI(
    title="ML Pipeline Studio API",
    description="AI-powered sentiment analysis pipeline",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
) 


# Include API routers
app.include_router(file.router, prefix="/api/file", tags=["File"])
app.include_router(clean.router, prefix="/api/clean", tags=["Clean"])
app.include_router(classify.router, prefix="/api/classifiy", tags=["Classify"])
app.include_router(train.router, prefix="/api/train", tags=["Train"])
app.include_router(predict.router, prefix="/api/predict", tags=["Predict"])
app.include_router(evaluate.router, prefix="/api/evaluate", tags=["Evaluate"])
# app.include_router(user.router, prefix="/api/user", tags=["user"])
app.include_router(session.router, tags=["session"])

@app.get("/")
async def root():
   """Root endpoint with API information"""
   return {
       "message": "ML Pipeline Studio API",
       "version": "1.0.0",
       "docs": "/docs",
       "redoc": "/redoc"
   }

@app.get("/supabase-listener")
async def get_supabase_listener_status():
   """Get Supabase real-time listener service status"""
   from app.services.supabase_listener_service import supabase_listener_service
   return supabase_listener_service.get_status()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.DEBUG,
        log_level="info"
    ) 