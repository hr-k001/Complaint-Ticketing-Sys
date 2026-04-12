from jose import JWTError

from app.core.security import create_access_token, decode_access_token


def verify_token(token: str):
    try:
        return decode_access_token(token)
    except JWTError:
        return None
