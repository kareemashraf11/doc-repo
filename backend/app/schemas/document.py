from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime


class DocumentVersionBase(BaseModel):
    version_number: int
    file_name: str
    file_size: int
    mime_type: Optional[str] = None
    change_notes: Optional[str] = None


class DocumentVersionCreate(DocumentVersionBase):
    document_id: UUID
    file_path: str
    checksum: Optional[str] = None


class DocumentVersionResponse(DocumentVersionBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    file_path: str
    checksum: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    upload_date: datetime
    uploaded_by_name: Optional[str] = None


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    permission_level: str = "department"


class DocumentCreate(DocumentBase):
    tags: List[str] = Field(default_factory=list)


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    permission_level: Optional[str] = None
    tags: Optional[List[str]] = None


class DocumentResponse(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    uploader_id: UUID
    department_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    current_version: int
    is_deleted: bool
    uploader_name: Optional[str] = None
    department_name: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class DocumentDetailResponse(DocumentResponse):
    latest_version: Optional[DocumentVersionResponse] = None
    version_count: int = 0


class DocumentSearchParams(BaseModel):
    query: Optional[str] = None
    tags: Optional[List[str]] = None
    uploader_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    permission_level: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
    sort_by: str = Field(default="created_at")
    sort_order: str = Field(default="desc")


class PaginatedDocumentResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
