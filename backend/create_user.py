import sys
import uuid

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.models import User
from app.core.security import hash_password
from app.services.auth_service import generate_agent_number


VALID_ROLES = {"user", "agent", "admin"}


def prompt_value(label: str) -> str:
    value = input(f"{label}: ").strip()
    if not value:
        raise ValueError(f"{label} is required")
    return value


def create_user(full_name: str, email: str, password: str, role: str) -> None:
    role = role.lower().strip()
    if role not in VALID_ROLES:
        raise ValueError(f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")

    db = SessionLocal()
    try:
        existing_user = db.scalar(select(User).where(User.email == email))
        if existing_user:
            raise ValueError(f"User with email '{email}' already exists")

        user = User(
            id=str(uuid.uuid4()),
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            agent_number=generate_agent_number(db) if role == "agent" else None,
        )
        db.add(user)
        db.commit()
        print(f"Created {role} account for {email}")
    finally:
        db.close()


def main() -> None:
    if len(sys.argv) == 5:
        _, full_name, email, password, role = sys.argv
    else:
        print("Create internal user account")
        full_name = prompt_value("Full name")
        email = prompt_value("Email")
        password = prompt_value("Password")
        role = prompt_value("Role (user/agent/admin)")

    create_user(full_name, email, password, role)


if __name__ == "__main__":
    main()
