from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.db.database import Base


class PermissionLevel(str, enum.Enum):
    PUBLIC = "public"
    DEPARTMENT = "department"
    RESTRICTED = "restricted"


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), index=True)
    permission_level = Column(Enum(PermissionLevel, values_callable=lambda obj: [e.value for e in obj]), default=PermissionLevel.DEPARTMENT)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False, index=True)
    current_version = Column(Integer, default=1)

    uploader = relationship("User", back_populates="documents", foreign_keys=[uploader_id])
    department = relationship("Department", back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    document_tags = relationship("DocumentTag", back_populates="document", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="document_tags", viewonly=True)
