import os
import shutil
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as fastapiFile, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
import subprocess
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
import schemas
from typing import List, Optional
from datetime import datetime
from models import File, Folder, User, AuditLog
from auth import get_current_user, SECRET_KEY, ALGORITHM
from jose import jwt
from utils import get_system_setting
from limiter_config import limiter
from werkzeug.utils import secure_filename

# Logger setup
logger = logging.getLogger("files")

router = APIRouter(prefix="/files", tags=["files"])

def get_paths(db: Session):
    storage = get_system_setting(db, 'storage_path', './storage')
    temp = os.path.join(storage, 'temp')
    os.makedirs(storage, exist_ok=True)
    os.makedirs(temp, exist_ok=True)
    return storage, temp

def validate_file_extension(filename: str):
    blacklist = os.getenv("FILE_EXTENSION_BLACKLIST", ".exe,.bat,.sh,.php,.phtml,.vbs,.js").split(",")
    ext = os.path.splitext(filename)[1].lower()
    if ext in blacklist:
        raise HTTPException(status_code=400, detail=f"File extension {ext} is not allowed for security reasons.")
    return ext

@router.get("/config")
async def get_files_config(db: Session = Depends(get_db)):
    return {
        "chunk_size_mb": int(get_system_setting(db, 'chunk_size_mb', '10')),
        "upload_retries": int(get_system_setting(db, 'upload_retries', '3')),
        "assembly_priority": get_system_setting(db, 'assembly_priority', 'Normal')
    }

@router.get("/stats", response_model=schemas.StorageStats)
async def get_storage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stats = db.query(
        func.sum(File.size).label("total_size"),
        func.count(File.id).label("file_count")
    ).filter(File.owner_id == current_user.id, File.upload_complete == True, File.is_deleted == False).first()
    
    total_size = stats.total_size or 0
    file_count = stats.file_count or 0
    
    categories = {
        "Images": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
        "Documents": [".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".ppt", ".pptx"],
        "Media": [".mp4", ".mkv", ".mp3", ".wav", ".mov"],
    }
    
    cat_stats = {"Images": 0, "Documents": 0, "Media": 0, "Others": 0}
    user_files = db.query(File.extension).filter(
        File.owner_id == current_user.id, 
        File.upload_complete == True,
        File.is_deleted == False
    ).all()
    
    for (ext,) in user_files:
        if not ext: continue
        ext = ext.lower()
        found = False
        for cat, exts in categories.items():
            if ext in exts:
                cat_stats[cat] += 1
                found = True
                break
        if not found:
            cat_stats["Others"] += 1
            
    return schemas.StorageStats(
        total_size=total_size,
        file_count=file_count,
        categories=cat_stats
    )

@router.get("/recent", response_model=List[schemas.FileResponse])
async def list_recent_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(File).filter(
        File.owner_id == current_user.id, 
        File.upload_complete == True,
        File.is_deleted == False
    ).order_by(File.created_at.desc()).limit(20).all()

@router.post("/init-upload", response_model=schemas.FileResponse)
@limiter.limit(os.getenv("RATE_LIMIT_UPLOAD", "20/minute"))
async def init_upload(
    request: Request,
    name: str = Form(...),
    folder_id: int = Form(None),
    size: int = Form(...),
    mime_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Sanitize and validate
    safe_name = secure_filename(name)
    ext = validate_file_extension(safe_name)
    
    new_file = File(
        name=safe_name,
        extension=ext,
        size=size,
        mime_type=mime_type,
        folder_id=folder_id,
        owner_id=current_user.id,
        is_chunked=True,
        upload_complete=False,
        path="" # To be filled after assembly
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    # Create temp directory using ID (Safe from traversal)
    storage_path, temp_path = get_paths(db)
    file_temp_dir = os.path.join(temp_path, str(new_file.id))
    os.makedirs(file_temp_dir, exist_ok=True)
    
    return new_file

@router.post("/upload-chunk")
@limiter.limit(os.getenv("RATE_LIMIT_UPLOAD", "20/minute"))
async def upload_chunk(
    request: Request,
    file_id: int = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    chunk: UploadFile = fastapiFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_record = db.query(File).filter(File.id == file_id, File.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="Session not found")
    
    storage_path, temp_path = get_paths(db)
    file_temp_dir = os.path.join(temp_path, str(file_id))
    os.makedirs(file_temp_dir, exist_ok=True)
    
    # Chunk path is purely ID-based
    chunk_path = os.path.join(file_temp_dir, f"chunk_{chunk_index}")
    
    with open(chunk_path, "wb") as buffer:
        shutil.copyfileobj(chunk.file, buffer)
    
    uploaded_count = len(os.listdir(file_temp_dir))
    
    if uploaded_count == total_chunks:
        try:
            # Final path uses ID to prevent any filename injection into paths
            # The extension is kept but sanitized earlier
            final_filename = f"{file_id}_{file_record.name}"
            final_path = os.path.abspath(os.path.join(storage_path, final_filename))
            
            # Security: Ensure final_path is within storage_path
            if not final_path.startswith(os.path.abspath(storage_path)):
                raise HTTPException(status_code=403, detail="Illegal storage sequence detected")

            if not os.path.exists(final_path):
                with open(final_path, "wb") as outfile:
                    for i in range(total_chunks):
                        chunk_file = os.path.join(file_temp_dir, f"chunk_{i}")
                        if os.path.exists(chunk_file):
                            with open(chunk_file, "rb") as infile:
                                shutil.copyfileobj(infile, outfile)
            
            # Cleanup
            shutil.rmtree(file_temp_dir)
            
            file_record.path = final_path
            file_record.upload_complete = True
            db.commit()
            return {"status": "complete", "file_id": file_id}
        except Exception as e:
            logger.error(f"Assembly failure: {e}")
            raise HTTPException(status_code=500, detail="Terminal assembly malfunction")
    
    return {"status": "chunk_received", "chunk_index": chunk_index}

@router.get("/search", response_model=List[schemas.FileResponse])
async def search_files(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(File).filter(
        File.owner_id == current_user.id,
        File.upload_complete == True,
        File.is_deleted == False,
        File.name.ilike(f"%{q}%")
    ).limit(50).all()

@router.get("/list", response_model=List[schemas.FileResponse])
async def list_files(
    folder_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(File).filter(File.owner_id == current_user.id, File.upload_complete == True, File.is_deleted == False)
    if folder_id:
        query = query.filter(File.folder_id == folder_id)
    else:
        query = query.filter(File.folder_id == None)
    return query.all()

@router.get("/trash", response_model=List[schemas.FileResponse])
async def list_trash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(File).filter(File.owner_id == current_user.id, File.is_deleted == True).all()

@router.get("/trash/folders", response_model=List[schemas.FolderResponse])
async def list_trash_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Folder).filter(Folder.owner_id == current_user.id, Folder.is_deleted == True).all()

@router.get("/folders", response_model=List[schemas.FolderResponse])
async def list_folders(
    parent_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Folder).filter(Folder.owner_id == current_user.id, Folder.is_deleted == False)
    if parent_id:
        folders = query.filter(Folder.parent_id == parent_id).all()
    else:
        folders = query.filter(Folder.parent_id == None).all()

    for folder in folders:
        stats = db.query(
            func.count(File.id).label('count'),
            func.sum(File.size).label('size')
        ).filter(File.folder_id == folder.id, File.is_deleted == False).first()
        folder.file_count = stats.count or 0
        folder.total_size = stats.size or 0
    return folders

@router.post("/folders", response_model=schemas.FolderResponse)
async def create_folder(
    folder: schemas.FolderBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_folder = Folder(
        name=secure_filename(folder.name),
        parent_id=folder.parent_id,
        owner_id=current_user.id
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

@router.get("/download/{file_id}")
async def download_file(
    file_id: int,
    token: str = None, 
    disposition: str = "attachment",
    db: Session = Depends(get_db)
):
    user = None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            user = db.query(User).filter(User.username == username).first()
        except: pass
            
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized Access")

    file_record = db.query(File).filter(File.id == file_id, File.owner_id == user.id).first()
    if not file_record or not file_record.upload_complete:
        raise HTTPException(status_code=404, detail="Data node not found")
    
    if not os.path.exists(file_record.path):
        raise HTTPException(status_code=404, detail="Physical stream missing")
        
    headers = {"Content-Disposition": "inline"}
    if disposition == "attachment":
        headers["Content-Disposition"] = f'attachment; filename="{file_record.name}"'
        
    return FileResponse(
        path=file_record.path,
        media_type=file_record.mime_type,
        headers=headers
    )

@router.get("/stream/{file_id}")
async def stream_media(
    file_id: int,
    token: str = None, 
    quality: str = "source", 
    db: Session = Depends(get_db)
):
    user = None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            user = db.query(User).filter(User.username == username).first()
        except: pass
            
    if not user:
        raise HTTPException(status_code=401, detail="Access Denied")

    file_record = db.query(File).filter(File.id == file_id, File.owner_id == user.id).first()
    if not file_record or not file_record.upload_complete:
        raise HTTPException(status_code=404, detail="Media node missing")
    
    if (quality == "source" or not file_record.mime_type.startswith("video/")):
        return FileResponse(file_record.path, media_type=file_record.mime_type)

    target_width = 1280 if quality == "720p" else 854
    target_height = 720 if quality == "720p" else 480
    
    command = [
        "ffmpeg", "-i", file_record.path,
        "-vf", f"scale={target_width}:{target_height}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
        "-c:a", "aac", "-b:a", "128k",
        "-f", "mp4", "-movflags", "frag_keyframe+empty_moov",
        "pipe:1"
    ]

    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

    def iter_file():
        try:
            while True:
                chunk = process.stdout.read(1024 * 1024)
                if not chunk:
                    break
                yield chunk
        finally:
            process.stdout.close()
            process.terminate()

    return StreamingResponse(iter_file(), media_type="video/mp4")

@router.patch("/{file_id}", response_model=schemas.FileResponse)
async def rename_file(
    file_id: int,
    data: schemas.ItemRename,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_file = db.query(File).filter(File.id == file_id, File.owner_id == current_user.id).first()
    if not target_file:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Check if folder is locked
    if target_file.folder_id:
        parent = db.query(Folder).filter(Folder.id == target_file.folder_id).first()
        if parent and parent.is_locked:
            raise HTTPException(status_code=403, detail="Parent sector is locked")

    target_file.name = secure_filename(data.name)
    db.commit()
    db.refresh(target_file)
    return target_file

@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_file = db.query(File).filter(File.id == file_id, File.owner_id == current_user.id).first()
    if not target_file:
        raise HTTPException(status_code=404, detail="Unit already terminated or missing")
    
    # Check if folder is locked
    if target_file.folder_id:
        parent = db.query(Folder).filter(Folder.id == target_file.folder_id).first()
        if parent and parent.is_locked:
            raise HTTPException(status_code=403, detail="Parent sector is locked")

    target_file.is_deleted = True
    target_file.deleted_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "message": "Unit moved to secondary storage (Trash)"}

@router.delete("/purge/{file_id}")
async def purge_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_file = db.query(File).filter(File.id == file_id, File.owner_id == current_user.id).first()
    if not target_file:
        raise HTTPException(status_code=404, detail="Unit already purged")
    
    # Check if folder is locked
    if target_file.folder_id:
        parent = db.query(Folder).filter(Folder.id == target_file.folder_id).first()
        if parent and parent.is_locked:
            raise HTTPException(status_code=403, detail="Parent sector is locked")

    if target_file.path and os.path.exists(target_file.path):
        try: os.remove(target_file.path)
        except: pass
        
    db.delete(target_file)
    db.commit()
    return {"status": "success", "message": "Binary unit permanently erased"}

@router.patch("/folders/{folder_id}", response_model=schemas.FolderResponse)
async def rename_folder(
    folder_id: int,
    data: schemas.ItemRename,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_folder = db.query(Folder).filter(Folder.id == folder_id, Folder.owner_id == current_user.id).first()
    if not target_folder:
        raise HTTPException(status_code=404, detail="Sector not found")
    if target_folder.is_locked:
        raise HTTPException(status_code=403, detail="Sector is locked")
        
    target_folder.name = secure_filename(data.name)
    db.commit()
    db.refresh(target_folder)
    return target_folder

@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_folder = db.query(Folder).filter(Folder.id == folder_id, Folder.owner_id == current_user.id).first()
    if not target_folder:
        raise HTTPException(status_code=404, detail="Sector not found")
    if target_folder.is_locked:
        raise HTTPException(status_code=403, detail="Sector is locked and cannot be terminated")
        
    target_folder.is_deleted = True
    target_folder.deleted_at = datetime.utcnow()
    db.commit()
    return {"status": "success"}

@router.delete("/folders/purge/{folder_id}")
async def purge_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_folder = db.query(Folder).filter(Folder.id == folder_id, Folder.owner_id == current_user.id).first()
    if not target_folder:
        raise HTTPException(status_code=404, detail="Sector not found")
    if target_folder.is_locked:
        raise HTTPException(status_code=403, detail="Sector is locked")

    def hard_delete_folder(fid):
        nested_files = db.query(File).filter(File.folder_id == fid).all()
        for nf in nested_files:
            if nf.path and os.path.exists(nf.path):
                try: os.remove(nf.path)
                except: pass
            db.delete(nf)
        nested_folders = db.query(Folder).filter(Folder.parent_id == fid).all()
        for nf in nested_folders:
            hard_delete_folder(nf.id)
            db.delete(nf)

    hard_delete_folder(folder_id)
    db.delete(target_folder)
    db.commit()
    return {"status": "success", "message": "Data sector and all nested nodes purged"}

@router.post("/folders/{folder_id}/toggle-lock")
async def toggle_folder_lock(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_folder = db.query(Folder).filter(Folder.id == folder_id, Folder.owner_id == current_user.id).first()
    if not target_folder:
        raise HTTPException(status_code=404, detail="Sector not found")
    
    target_folder.is_locked = not target_folder.is_locked
    db.commit()
    return {"status": "success", "is_locked": target_folder.is_locked}

@router.post("/bulk-action")
async def bulk_action(
    action: str, 
    data: schemas.BulkAction,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Security: Ensure all targets belong to current user
    if action == "delete" or action == "purge":
        locked_folders = db.query(Folder).filter(
            Folder.id.in_(data.folder_ids), 
            Folder.is_locked == True, 
            Folder.owner_id == current_user.id
        ).all()
        if locked_folders:
            raise HTTPException(status_code=403, detail="Locked sectors cannot be terminated")

    if action == "delete":
        db.query(File).filter(File.id.in_(data.file_ids), File.owner_id == current_user.id).update({File.is_deleted: True, File.deleted_at: datetime.utcnow()}, synchronize_session=False)
        db.query(Folder).filter(Folder.id.in_(data.folder_ids), Folder.owner_id == current_user.id).update({Folder.is_deleted: True, Folder.deleted_at: datetime.utcnow()}, synchronize_session=False)
    elif action == "restore":
        db.query(File).filter(File.id.in_(data.file_ids), File.owner_id == current_user.id).update({File.is_deleted: False, File.deleted_at: None}, synchronize_session=False)
        db.query(Folder).filter(Folder.id.in_(data.folder_ids), Folder.owner_id == current_user.id).update({Folder.is_deleted: False, Folder.deleted_at: None}, synchronize_session=False)
    elif action == "move":
        db.query(File).filter(File.id.in_(data.file_ids), File.owner_id == current_user.id).update({File.folder_id: data.target_folder_id if data.target_folder_id != 0 else None}, synchronize_session=False)
        db.query(Folder).filter(Folder.id.in_(data.folder_ids), Folder.owner_id == current_user.id).update({Folder.parent_id: data.target_folder_id if data.target_folder_id != 0 else None}, synchronize_session=False)
    
    elif action == "purge":
        files_to_purge = db.query(File).filter(File.id.in_(data.file_ids), File.owner_id == current_user.id).all()
        for f in files_to_purge:
            if f.path and os.path.exists(f.path):
                try: os.remove(f.path)
                except: pass
            db.delete(f)

        def hard_delete_folder_bulk(fid):
            nested_files = db.query(File).filter(File.folder_id == fid).all()
            for nf in nested_files:
                if nf.path and os.path.exists(nf.path):
                    try: os.remove(nf.path)
                    except: pass
                db.delete(nf)
            nested_folders = db.query(Folder).filter(Folder.parent_id == fid).all()
            for nf in nested_folders:
                hard_delete_folder_bulk(nf.id)
                db.delete(nf)

        folders_to_purge = db.query(Folder).filter(Folder.id.in_(data.folder_ids), Folder.owner_id == current_user.id).all()
        for folder in folders_to_purge:
            hard_delete_folder_bulk(folder.id)
            db.delete(folder)

    new_log = AuditLog(
        user_id=current_user.id,
        action=f"BULK_{action.upper()}",
        details=f"Files: {data.file_ids}, Folders: {data.folder_ids}",
        ip_address=request.client.host
    )
    db.add(new_log)
    db.commit()
    return {"status": "success"}

@router.get("/breadcrumbs/{folder_id}")
async def get_breadcrumbs(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    crumbs = []
    curr_id = folder_id
    while curr_id:
        f = db.query(Folder).filter(Folder.id == curr_id, Folder.owner_id == current_user.id).first()
        if not f: break
        crumbs.insert(0, {"id": f.id, "name": f.name})
        curr_id = f.parent_id
    return crumbs
