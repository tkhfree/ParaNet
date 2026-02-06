import os
from pathlib import Path

# API
API_HOST = os.getenv("PARANET_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("PARANET_API_PORT", "8000"))

# Database (SQLite for new backend only; does not touch editor-backend-dev)
DATA_DIR = Path(os.getenv("PARANET_DATA_DIR", "./data"))
DB_PATH = DATA_DIR / "paranet.db"

# Auth
JWT_SECRET = os.getenv("PARANET_JWT_SECRET", "paranet-jwt-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 8

# Mock mode for deploy/compile (optional HTTP call to editor-backend-dev)
EDITOR_BACKEND_URL = os.getenv("PARANET_EDITOR_BACKEND_URL", "http://localhost:8080/api")
USE_MOCK = os.getenv("PARANET_USE_MOCK", "true").lower() in ("1", "true", "yes")
