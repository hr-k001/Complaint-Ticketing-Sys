import os
from functools import lru_cache

from dotenv import load_dotenv


load_dotenv()


class Settings:
    app_name: str = os.getenv("APP_NAME", "Complaint Ticketing System API")
    app_env: str = os.getenv("APP_ENV", "development")
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8000"))

    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me-in-env")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    azure_sql_server: str = os.getenv("AZURE_SQL_SERVER", "")
    azure_sql_database: str = os.getenv("AZURE_SQL_DATABASE", "")
    azure_sql_username: str = os.getenv("AZURE_SQL_USERNAME", "")
    azure_sql_password: str = os.getenv("AZURE_SQL_PASSWORD", "")
    azure_sql_driver: str = os.getenv("AZURE_SQL_DRIVER", "ODBC Driver 18 for SQL Server")
    azure_sql_encrypt: str = os.getenv("AZURE_SQL_ENCRYPT", "yes")
    azure_sql_trust_cert: str = os.getenv("AZURE_SQL_TRUST_CERT", "yes")


@lru_cache
def get_settings() -> Settings:
    return Settings()
