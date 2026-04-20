from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from typing import List
from models import ShareLink, File, User
from auth import get_current_user, get_password_hash, verify_password
import schemas
import os
from datetime import datetime, timedelta

router = APIRouter(prefix="/share", tags=["sharing"])

@router.get("/links", response_model=List[schemas.FileResponse])
async def list_shared_links(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get all files that have at least one share link and are NOT deleted
    shared_files = db.query(File).join(ShareLink).filter(
        File.owner_id == current_user.id,
        File.is_deleted == False
    ).all()
    return shared_files

@router.post("/", response_model=schemas.ShareLinkResponse)
async def create_share_link(
    share: schemas.ShareLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify file ownership
    file_record = db.query(File).filter(File.id == share.file_id, File.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Create or update share link
    new_share = ShareLink(
        file_id=share.file_id,
        expires_at=share.expires_at or (datetime.utcnow() + timedelta(days=7)),
        password_hash=get_password_hash(share.password) if share.password else None,
        download_limit=share.download_limit
    )
    db.add(new_share)
    db.commit()
    db.refresh(new_share)
    return new_share

@router.get("/{uuid}", response_model=schemas.FileResponse)
async def get_shared_file_info(uuid: str, db: Session = Depends(get_db)):
    share = db.query(ShareLink).filter(ShareLink.uuid == uuid).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share link invalid")
    
    if share.expires_at and share.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link expired")

    if share.download_limit and share.download_count >= share.download_limit:
        raise HTTPException(status_code=403, detail="Download limit reached")
    
    return share.file

@router.get("/download/{uuid}")
async def download_shared_file(
    uuid: str, 
    password: str = None, 
    db: Session = Depends(get_db)
):
    share = db.query(ShareLink).filter(ShareLink.uuid == uuid).first()
    if not share:
        raise HTTPException(status_code=404, detail="Link invalid")

    if share.expires_at and share.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Link expired")

    if share.download_limit and share.download_count >= share.download_limit:
        raise HTTPException(status_code=403, detail="Download limit reached")

    if share.password_hash:
        if not password or not verify_password(password, share.password_hash):
            raise HTTPException(status_code=401, detail="Password required or incorrect")
    
    file_record = share.file
    if not os.path.exists(file_record.path):
        raise HTTPException(status_code=404, detail="File missing on server")
    
    # Increment download count
    share.download_count += 1
    db.commit()
    
    return FileResponse(
        path=file_record.path,
        media_type=file_record.mime_type,
        filename=file_record.name
    )

@router.delete("/links/{file_id}")
async def remove_share_links(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify file ownership
    file_record = db.query(File).filter(File.id == file_id, File.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete all share links for this file
    db.query(ShareLink).filter(ShareLink.file_id == file_id).delete()
    db.commit()
    return {"status": "unshared"}

@router.post("/bulk-unshare")
async def bulk_unshare(
    data: schemas.BulkAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Delete all share links for selected files
    db.query(ShareLink).filter(ShareLink.file_id.in_(data.file_ids)).delete(synchronize_session=False)
    db.commit()
    return {"status": "bulk unshared"}

