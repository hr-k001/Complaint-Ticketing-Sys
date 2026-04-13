import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.models import User
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.user_schema import TokenResponse, UserLogin, UserRegister, UserRole


def generate_agent_number(db: Session) -> str:
    existing_numbers = db.scalars(select(User.agent_number).where(User.agent_number != None)).all()
    max_number = 0
    for number in existing_numbers:
        if not number:
            continue
        if number.startswith("AGT") and number[3:].isdigit():
            max_number = max(max_number, int(number[3:]))
    return f"AGT{max_number + 1:04d}"


def register_user(db: Session, user: UserRegister) -> User:
    existing_user = db.scalar(select(User).where(User.email == user.email))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    agent_number = generate_agent_number(db) if user.role == UserRole.AGENT else None
    db_user = User(
        id=str(uuid.uuid4()),
        full_name=user.full_name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role.value,
        agent_number=agent_number,
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
