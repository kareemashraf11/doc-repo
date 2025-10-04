from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginResponse, RefreshTokenRequest
from app.schemas.user import UserLogin
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    user = AuthService.register_user(db, user_data)
    return user


@router.post("/login", response_model=LoginResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    return AuthService.login(db, credentials.email, credentials.password)


@router.post("/refresh")
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    return AuthService.refresh_access_token(db, request.refresh_token)


@router.post("/logout")
def logout(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    success = AuthService.revoke_refresh_token(db, request.refresh_token)
    if success:
        return {"message": "Successfully logged out"}
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid refresh token"
    )


@router.get("/users", response_model=List[UserResponse])
def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(User.is_active == True).all()
    return users
