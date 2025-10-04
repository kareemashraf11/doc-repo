from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import os
from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.document import (
    DocumentCreate,
    DocumentResponse,
    DocumentDetailResponse,
    DocumentVersionResponse,
    PaginatedDocumentResponse,
    DocumentSearchParams
)
from app.services.document_service import DocumentService
from app.models.document_version import DocumentVersion

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    permission_level: str = Form("department"),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tag_list = [tag.strip() for tag in tags.split(",")] if tags else []

    document_data = DocumentCreate(
        title=title,
        description=description,
        permission_level=permission_level,
        tags=tag_list
    )

    document = DocumentService.create_document(db, current_user, document_data, file)

    db.refresh(document)
    response_data = {
        "id": document.id,
        "title": document.title,
        "description": document.description,
        "permission_level": document.permission_level.value,
        "uploader_id": document.uploader_id,
        "department_id": document.department_id,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
        "current_version": document.current_version,
        "is_deleted": document.is_deleted,
        "uploader_name": current_user.full_name,
        "department_name": current_user.department.name if current_user.department else None,
        "tags": [dt.tag.name for dt in document.document_tags]
    }

    return response_data


@router.get("/search", response_model=PaginatedDocumentResponse)
def search_documents(
    query: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    uploader_id: Optional[UUID] = Query(None),
    department_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    search_params = DocumentSearchParams(
        query=query,
        tags=tags,
        uploader_id=uploader_id,
        department_id=department_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )

    documents, total = DocumentService.search_documents(db, current_user, search_params)

    items = []
    for doc in documents:
        items.append({
            "id": doc.id,
            "title": doc.title,
            "description": doc.description,
            "permission_level": doc.permission_level.value,
            "uploader_id": doc.uploader_id,
            "department_id": doc.department_id,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "current_version": doc.current_version,
            "is_deleted": doc.is_deleted,
            "uploader_name": doc.uploader.full_name if doc.uploader else None,
            "department_name": doc.department.name if doc.department else None,
            "tags": [dt.tag.name for dt in doc.document_tags]
        })

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = DocumentService.get_document_by_id(db, current_user, document_id)

    latest_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.version_number == document.current_version
    ).first()

    return {
        "id": document.id,
        "title": document.title,
        "description": document.description,
        "permission_level": document.permission_level.value,
        "uploader_id": document.uploader_id,
        "department_id": document.department_id,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
        "current_version": document.current_version,
        "is_deleted": document.is_deleted,
        "uploader_name": document.uploader.full_name if document.uploader else None,
        "department_name": document.department.name if document.department else None,
        "tags": [dt.tag.name for dt in document.document_tags],
        "latest_version": {
            "id": latest_version.id,
            "document_id": latest_version.document_id,
            "version_number": latest_version.version_number,
            "file_name": latest_version.file_name,
            "file_path": latest_version.file_path,
            "file_size": latest_version.file_size,
            "mime_type": latest_version.mime_type,
            "checksum": latest_version.checksum,
            "uploaded_by": latest_version.uploaded_by,
            "upload_date": latest_version.upload_date,
            "change_notes": latest_version.change_notes,
            "uploaded_by_name": latest_version.uploaded_by_user.full_name if latest_version.uploaded_by_user else None
        } if latest_version else None,
        "version_count": len(document.versions)
    }


@router.get("/{document_id}/versions", response_model=List[DocumentVersionResponse])
def get_document_versions(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    versions = DocumentService.get_document_versions(db, current_user, document_id)

    return [
        {
            "id": v.id,
            "document_id": v.document_id,
            "version_number": v.version_number,
            "file_name": v.file_name,
            "file_path": v.file_path,
            "file_size": v.file_size,
            "mime_type": v.mime_type,
            "checksum": v.checksum,
            "uploaded_by": v.uploaded_by,
            "upload_date": v.upload_date,
            "change_notes": v.change_notes,
            "uploaded_by_name": v.uploaded_by_user.full_name if v.uploaded_by_user else None
        }
        for v in versions
    ]


@router.post("/{document_id}/versions", response_model=DocumentVersionResponse, status_code=status.HTTP_201_CREATED)
async def upload_new_version(
    document_id: UUID,
    file: UploadFile = File(...),
    change_notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    version = DocumentService.upload_new_version(
        db, current_user, document_id, file, change_notes
    )

    return {
        "id": version.id,
        "document_id": version.document_id,
        "version_number": version.version_number,
        "file_name": version.file_name,
        "file_path": version.file_path,
        "file_size": version.file_size,
        "mime_type": version.mime_type,
        "checksum": version.checksum,
        "uploaded_by": version.uploaded_by,
        "upload_date": version.upload_date,
        "change_notes": version.change_notes,
        "uploaded_by_name": current_user.full_name
    }


@router.get("/{document_id}/download")
def download_document(
    document_id: UUID,
    version: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = DocumentService.get_document_by_id(db, current_user, document_id)

    if version:
        doc_version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == version
        ).first()
    else:
        doc_version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == document.current_version
        ).first()

    if not doc_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document version not found"
        )

    if not os.path.exists(doc_version.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )

    return FileResponse(
        path=doc_version.file_path,
        filename=doc_version.file_name,
        media_type=doc_version.mime_type
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    DocumentService.delete_document(db, current_user, document_id)
    return None


@router.get("/filters/tags")
def get_available_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.tag import Tag
    from app.models.document_tag import DocumentTag
    from app.models.document import Document, PermissionLevel
    from sqlalchemy import distinct, or_, and_

    query = db.query(distinct(Tag.name)).join(DocumentTag).join(Document).filter(
        Document.is_deleted == False
    )

    if not current_user.role or current_user.role.name != "admin":
        query = query.filter(
            or_(
                Document.permission_level == PermissionLevel.PUBLIC,
                and_(
                    Document.permission_level == PermissionLevel.DEPARTMENT,
                    Document.department_id == current_user.department_id
                ),
                and_(
                    Document.permission_level == PermissionLevel.RESTRICTED,
                    Document.uploader_id == current_user.id
                ),
                Document.uploader_id == current_user.id
            )
        )

    tags = [tag[0] for tag in query.all()]
    return {"tags": sorted(tags)}


@router.get("/filters/uploaders")
def get_available_uploaders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.document import Document, PermissionLevel
    from sqlalchemy import distinct, or_, and_

    query = db.query(distinct(User.id), User.first_name, User.last_name, User.email).join(
        Document, User.id == Document.uploader_id
    ).filter(
        Document.is_deleted == False
    )

    if not current_user.role or current_user.role.name != "admin":
        query = query.filter(
            or_(
                Document.permission_level == PermissionLevel.PUBLIC,
                and_(
                    Document.permission_level == PermissionLevel.DEPARTMENT,
                    Document.department_id == current_user.department_id
                ),
                and_(
                    Document.permission_level == PermissionLevel.RESTRICTED,
                    Document.uploader_id == current_user.id
                ),
                Document.uploader_id == current_user.id
            )
        )

    uploaders = [
        {
            "id": str(user_id),
            "first_name": first_name,
            "last_name": last_name,
            "email": email
        }
        for user_id, first_name, last_name, email in query.all()
    ]
    return {"uploaders": uploaders}
