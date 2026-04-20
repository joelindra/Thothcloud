from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from datetime import timedelta
import os
from limiter_config import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse)
@limiter.limit(os.getenv("RATE_LIMIT_LOGIN", "5/minute"))
async def register(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password, role="admin")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
@limiter.limit(os.getenv("RATE_LIMIT_LOGIN", "5/minute"))
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        # Audit failed login logic could be added here
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Successful login log
    new_log = models.AuditLog(
        user_id=user.id,
        action="LOGIN",
        details="User logged in successfully",
        ip_address=request.client.host
    )
    db.add(new_log)
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.get("/logs")
async def get_activity_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.AuditLog).filter(
        models.AuditLog.user_id == current_user.id
    ).order_by(models.AuditLog.timestamp.desc()).limit(50).all()

@router.delete("/logs")
async def clear_activity_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db.query(models.AuditLog).filter(
        models.AuditLog.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "logs purged"}
