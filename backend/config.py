import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent
_DEFAULT_DATA_DIR = _BACKEND_DIR / "data"

load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_BACKEND_DIR / ".env")

# API
API_HOST = os.getenv("PARANET_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("PARANET_API_PORT", "8000"))

# Database
DATA_DIR = Path(os.getenv("PARANET_DATA_DIR", str(_DEFAULT_DATA_DIR))).expanduser().resolve()
DB_PATH = DATA_DIR / "paranet.db"

# Auth
JWT_SECRET = os.getenv("PARANET_JWT_SECRET", "paranet-jwt-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 8

# Editor backend
EDITOR_BACKEND_URL = os.getenv("PARANET_EDITOR_BACKEND_URL", "http://localhost:8080/api")
USE_MOCK = os.getenv("PARANET_USE_MOCK", "true").lower() in ("1", "true", "yes")

# LLM (used by agent_orchestrator)
LLM_MODEL = os.getenv("PARANET_LLM_MODEL", "glm-4-flash").strip()
LLM_API_KEY = os.getenv("PARANET_LLM_API_KEY", "").strip()
LLM_API_BASE = os.getenv("PARANET_LLM_API_BASE", "https://open.bigmodel.cn/api/paas/v4/").strip()

# Agent
AGENT_MAX_ITERATIONS = int(os.getenv("PARANET_AGENT_MAX_ITERATIONS", "8"))
