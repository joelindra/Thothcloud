from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import models
from database import engine, SessionLocal
import auth_routes
import files
import share_routes
import settings_routes
import os
from limiter_config import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize database
models.Base.metadata.create_all(bind=engine)

def seed_settings():
    db = SessionLocal()
    try:
        from models import SystemSetting
        defaults = [
            {"key": "ui_theme", "value": "Deep-Blue", "category": "appearance", "description": "Global visual theme for the neural interface"},
            {"key": "ui_animations", "value": "true", "category": "appearance", "description": "Enable motion effects and transitions"},
            {"key": "ui_density", "value": "Comfortable", "category": "appearance", "description": "Information density of the layout"},
            {"key": "chunk_size_mb", "value": "5", "category": "transmission", "description": "Size of each data fragment during upload"},
            {"key": "upload_retries", "value": "3", "category": "transmission", "description": "Maximum reconnection attempts for failed fragments"},
            {"key": "assembly_priority", "value": "Normal", "category": "transmission", "description": "System priority for file re-assembly tasks"},
            {"key": "storage_path", "value": "./storage", "category": "governance", "description": "Root directory for encrypted asset storage"},
            {"key": "max_file_size_gb", "value": "10", "category": "governance", "description": "Maximum size for a single binary object"},
            {"key": "trash_retention_days", "value": "30", "category": "governance", "description": "Buffer period before permanent data erasure"},
            {"key": "login_rate_limit", "value": "5/minute", "category": "security", "description": "Maximum uplink attempts before lock-out"},
            {"key": "session_timeout_hours", "value": "24", "category": "security", "description": "Authentication token lifespan"},
            {"key": "log_level", "value": "Detailed", "category": "security", "description": "Granularity of the security audit log"}
        ]
        for d in defaults:
            exists = db.query(SystemSetting).filter(SystemSetting.key == d["key"]).first()
            if not exists:
                db.add(SystemSetting(**d))
        db.commit()
    finally:
        db.close()

seed_settings()

app = FastAPI(title="ThothCloud API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    if os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true":
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' *"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Configure CORS
allowed_origins = os.getenv("ALLOWED_CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_routes.router)
app.include_router(files.router)
app.include_router(share_routes.router)
app.include_router(settings_routes.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to ThothCloud API", "status": "online"}
