import os
from pathlib import Path

from dotenv import load_dotenv

# 与进程 cwd 无关，始终落在 backend/data，避免从仓库根目录启动 uvicorn 时写到另一份 SQLite
_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent
_DEFAULT_DATA_DIR = _BACKEND_DIR / "data"

# 优先加载仓库根目录 .env，其次兼容 backend/.env。
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_BACKEND_DIR / ".env")

# API
API_HOST = os.getenv("PARANET_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("PARANET_API_PORT", "8000"))

# Database (SQLite for new backend only; does not touch editor-backend-dev)
DATA_DIR = Path(os.getenv("PARANET_DATA_DIR", str(_DEFAULT_DATA_DIR))).expanduser().resolve()
DB_PATH = DATA_DIR / "paranet.db"

# Auth
JWT_SECRET = os.getenv("PARANET_JWT_SECRET", "paranet-jwt-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 8

# Mock mode for deploy/compile (optional HTTP call to editor-backend-dev)
EDITOR_BACKEND_URL = os.getenv("PARANET_EDITOR_BACKEND_URL", "http://localhost:8080/api")
USE_MOCK = os.getenv("PARANET_USE_MOCK", "true").lower() in ("1", "true", "yes")

# Zhipu GLM
ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY", "038da01c8d3843f1a5c870368c646ae8.4iRA7Ky1dxuDV7wE").strip()
ZHIPU_BASE_URL = os.getenv("ZHIPU_BASE_URL", "https://open.bigmodel.cn/api/paas/v4/").strip()
ZHIPU_MODEL = os.getenv("ZHIPU_MODEL", "glm-4.6v-flashx").strip()
ZHIPU_TIMEOUT_SECONDS = float(os.getenv("ZHIPU_TIMEOUT_SECONDS", "60"))
ZHIPU_TEMPERATURE = float(os.getenv("ZHIPU_TEMPERATURE", "0.1"))
ZHIPU_MAX_TOKENS = int(os.getenv("ZHIPU_MAX_TOKENS", "4096"))

# Agent
AGENT_MAX_ITERATIONS = int(os.getenv("PARANET_AGENT_MAX_ITERATIONS", "8"))
