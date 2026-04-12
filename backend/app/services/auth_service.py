import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.models import User
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.user_schema import TokenResponse, UserLogin, UserRegister


def register_user(db: Session, user: UserRegister) -> User:
    existing_user = db.scalar(select(User).where(User.email == user.email))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    db_user = User(
        id=str(uuid.uuid4()),
        full_name=user.full_name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role.value,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def login_user(db: Session, user: UserLogin) -> TokenResponse:
    db_user = db.scalar(select(User).where(User.email == user.email))
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(
        {
            "sub": db_user.email,
            "user_id": db_user.id,
            "role": db_user.role,
        }
    )
    return TokenResponse(access_token=token, user=db_user)
