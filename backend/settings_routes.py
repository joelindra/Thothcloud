from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import SystemSetting, User
from auth import get_current_user
import schemas
import os

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/", response_model=List[schemas.SettingSchema])
async def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(SystemSetting).all()
    return settings

@router.patch("/", response_model=schemas.SettingSchema)
async def update_setting(
    setting_update: schemas.SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can modify system settings")
    
    setting = db.query(SystemSetting).filter(SystemSetting.key == setting_update.key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    setting.value = setting_update.value
    db.commit()
    db.refresh(setting)
    return setting

@router.get("/browse")
async def browse_directories(
    path: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # If no path, start with current or roots on Windows
    if not path:
        if os.name == 'nt':
            import string
            drives = [f"{d}:\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\")]
            return {"current": "", "directories": drives}
        else:
            path = "/"

    if not os.path.exists(path):
         return {"current": path, "directories": [], "error": "Path does not exist"}

    try:
        dirs = [d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]
        return {
            "current": os.path.abspath(path),
            "directories": sorted(dirs)
        }
    except Exception as e:
        return {"current": path, "directories": [], "error": str(e)}

@router.get("/pick-folder")
async def pick_folder(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    import tkinter as tk
    from tkinter import filedialog
    
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        folder_path = filedialog.askdirectory(parent=root, title="Select ThothCloud Storage Root")
        root.destroy()
        
        if folder_path:
            return {"path": os.path.normpath(folder_path)}
        return {"path": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/public")
async def get_public_settings(db: Session = Depends(get_db)):
    # Non-sensitive settings for unauthenticated UI (themes, etc.)
    settings = db.query(SystemSetting).filter(SystemSetting.category == "appearance").all()
    return {s.key: s.value for s in settings}
