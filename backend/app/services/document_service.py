from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc, asc
from fastapi import HTTPException, status, UploadFile
from typing import List, Optional, Tuple
from uuid import UUID
import os
import hashlib
import shutil
from datetime import datetime
from app.models.document import Document, PermissionLevel
from app.models.document_version import DocumentVersion
from app.models.document_tag import DocumentTag
from app.models.tag import Tag
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentSearchParams
from app.core.config import settings


class DocumentService:
    @staticmethod
    def check_access(user: User, document: Document) -> bool:
        if user.role and user.role.name == "admin":
            return True

        if document.uploader_id == user.id:
            return True

        if document.permission_level == PermissionLevel.PUBLIC:
            return True

        if document.permission_level == PermissionLevel.DEPARTMENT:
            return user.department_id == document.department_id

        return False

    @staticmethod
    def get_or_create_tags(db: Session, tag_names: List[str]) -> List[Tag]:
        tags = []
        for tag_name in tag_names:
            tag_name = tag_name.strip().lower()
            tag = db.query(Tag).filter(func.lower(Tag.name) == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                db.flush()
            tags.append(tag)
        return tags

    @staticmethod
    def save_uploaded_file(file: UploadFile, document_id: UUID, version: int) -> Tuple[str, str, int]:
        upload_dir = settings.UPLOAD_DIR
        os.makedirs(upload_dir, exist_ok=True)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        file_name = f"{document_id}_v{version}_{timestamp}{file_extension}"
        file_path = os.path.join(upload_dir, file_name)

        hasher = hashlib.sha256()
        file_size = 0

        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(8192):
                buffer.write(chunk)
                hasher.update(chunk)
                file_size += len(chunk)

        checksum = hasher.hexdigest()
        return file_path, checksum, file_size

    @staticmethod
    def create_document(
        db: Session,
        user: User,
        document_data: DocumentCreate,
        file: UploadFile
    ) -> Document:
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in settings.allowed_extensions_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not allowed"
            )

        document = Document(
            title=document_data.title,
            description=document_data.description,
            uploader_id=user.id,
            department_id=user.department_id,
            permission_level=PermissionLevel(document_data.permission_level.lower()),
            current_version=1
        )

        db.add(document)
        db.flush()

        file_path, checksum, file_size = DocumentService.save_uploaded_file(
            file, document.id, 1
        )

        version = DocumentVersion(
            document_id=document.id,
            version_number=1,
            file_path=file_path,
            file_name=file.filename,
            file_size=file_size,
            mime_type=file.content_type,
            checksum=checksum,
            uploaded_by=user.id,
            change_notes="Initial version"
        )

        db.add(version)

        if document_data.tags:
            tags = DocumentService.get_or_create_tags(db, document_data.tags)
            for tag in tags:
                doc_tag = DocumentTag(document_id=document.id, tag_id=tag.id)
                db.add(doc_tag)

        db.commit()
        db.refresh(document)

        return document

    @staticmethod
    def upload_new_version(
        db: Session,
        user: User,
        document_id: UUID,
        file: UploadFile,
        change_notes: Optional[str] = None
    ) -> DocumentVersion:
        document = db.query(Document).filter(Document.id == document_id).first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        if not DocumentService.check_access(user, document):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )

        new_version_number = document.current_version + 1

        file_path, checksum, file_size = DocumentService.save_uploaded_file(
            file, document.id, new_version_number
        )

        version = DocumentVersion(
            document_id=document.id,
            version_number=new_version_number,
            file_path=file_path,
            file_name=file.filename,
            file_size=file_size,
            mime_type=file.content_type,
            checksum=checksum,
            uploaded_by=user.id,
            change_notes=change_notes or f"Version {new_version_number}"
        )

        db.add(version)

        document.current_version = new_version_number
        document.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(version)

        return version

    @staticmethod
    def search_documents(
        db: Session,
        user: User,
        params: DocumentSearchParams
    ) -> Tuple[List[Document], int]:
        query = db.query(Document).filter(Document.is_deleted == False)

        if not user.role or user.role.name != "admin":
            query = query.filter(
                or_(
                    Document.permission_level == PermissionLevel.PUBLIC,
                    and_(
                        Document.permission_level == PermissionLevel.DEPARTMENT,
                        Document.department_id == user.department_id
                    ),
                    and_(
                        Document.permission_level == PermissionLevel.RESTRICTED,
                        Document.uploader_id == user.id
                    ),
                    Document.uploader_id == user.id
                )
            )

        if params.query:
            query = query.filter(
                or_(
                    Document.title.ilike(f"%{params.query}%"),
                    Document.description.ilike(f"%{params.query}%")
                )
            )

        if params.tags:
            query = query.join(DocumentTag).join(Tag).filter(
                func.lower(Tag.name).in_([tag.lower() for tag in params.tags])
            )

        if params.uploader_id:
            import logging
            logging.info(f"Filtering by uploader_id={params.uploader_id}, type={type(params.uploader_id)}")
            query = query.filter(Document.uploader_id == params.uploader_id)

        if params.department_id:
            query = query.filter(Document.department_id == params.department_id)

        if params.permission_level:
            query = query.filter(Document.permission_level == params.permission_level)

        total = query.count()

        sort_column = getattr(Document, params.sort_by, Document.created_at)
        if params.sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        offset = (params.page - 1) * params.page_size
        documents = query.offset(offset).limit(params.page_size).all()

        return documents, total

    @staticmethod
    def get_document_versions(
        db: Session,
        user: User,
        document_id: UUID
    ) -> List[DocumentVersion]:
        document = db.query(Document).filter(Document.id == document_id).first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        if not DocumentService.check_access(user, document):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )

        versions = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(desc(DocumentVersion.version_number)).all()

        return versions

    @staticmethod
    def get_document_by_id(
        db: Session,
        user: User,
        document_id: UUID
    ) -> Document:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.is_deleted == False
        ).first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        if not DocumentService.check_access(user, document):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )

        return document

    @staticmethod
    def delete_document(
        db: Session,
        user: User,
        document_id: UUID
    ) -> bool:
        document = db.query(Document).filter(Document.id == document_id).first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        if document.uploader_id != user.id and (not user.role or user.role.name != "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )

        document.is_deleted = True
        db.commit()

        return True
