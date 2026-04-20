from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class FolderBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None

class FolderResponse(FolderBase):
    id: int
    owner_id: int
    created_at: datetime
    is_deleted: bool
    deleted_at: Optional[datetime]
    is_locked: bool = False
    file_count: Optional[int] = 0
    total_size: Optional[int] = 0
    class Config:
        from_attributes = True

class FileUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[int] = None

class ItemRename(BaseModel):
    name: str

class FileResponse(BaseModel):
    id: int
    name: str
    extension: str
    size: int
    mime_type: str
    folder_id: Optional[int]
    owner_id: int
    upload_complete: bool
    created_at: datetime
    is_deleted: bool
    deleted_at: Optional[datetime]
    transcoding_status: str = "NONE"
    class Config:
        from_attributes = True

class ChunkInfo(BaseModel):
    file_id: int
    chunk_index: int
    total_chunks: int

# Bulk Operations
class BulkAction(BaseModel):
    file_ids: List[int] = []
    folder_ids: List[int] = []
    target_folder_id: Optional[int] = None

# New Pro Schemas
class StorageStats(BaseModel):
    total_size: int
    file_count: int
    categories: dict 

class ShareLinkBase(BaseModel):
    file_id: int
    expires_at: Optional[datetime] = None
    password: Optional[str] = None
    download_limit: Optional[int] = None

class ShareLinkCreate(ShareLinkBase):
    pass

class ShareLinkResponse(BaseModel):
    id: int
    uuid: str
    file_id: int
    created_at: datetime
    expires_at: Optional[datetime]
    download_limit: Optional[int]
    download_count: int
    class Config:
        from_attributes = True

class SettingSchema(BaseModel):
    key: str
    value: str
    category: str
    description: Optional[str]
    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    key: str
    value: str
