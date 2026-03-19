# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

| Service | Path | Command | Port |
|---------|------|---------|------|
| Backend (FastAPI) | `backend/` | `cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` | 8000 |
| Frontend (Vite) | `frontend/` | `cd frontend && npm run dev` | 3000 |

The backend runs in **mock mode** by default (`PARANET_USE_MOCK=true`), using a local SQLite database — no MySQL, Redis, or external services required.

### Gotchas

- `backend/requirements.txt` includes `pywinpty`, which is Windows-only. On Linux, install backend deps with: `pip install $(grep -v pywinpty backend/requirements.txt | tr '\n' ' ')` or simply use `grep -v pywinpty backend/requirements.txt | pip install -r /dev/stdin`.
- Python scripts install to `~/.local/bin`; ensure this is on `PATH` (e.g. `export PATH="$HOME/.local/bin:$PATH"`).
- The root `pyproject.toml` defines the `paranet` core package; install it in editable mode with `pip install -e ".[dev]"` from the workspace root.
- Pre-existing test failures exist: `tests/test_models.py` and `tests/test_compiler.py` fail at collection due to a dataclass ordering bug in `paranet/models/protocol/geo.py`. `tests/test_lynette2_frontend.py` runs (3/4 pass).
- Frontend proxies `/api` → `http://localhost:8000` and `/ws` → `ws://localhost:8000` via Vite config.
- Default login credentials: `admin` / `admin123` (admin) or `demo` / `demo123` (operator).

### Standard commands

See `CLAUDE.md` for full reference. Key commands:
- **Lint (Python):** `ruff check .` and `black --check .`
- **Tests (Python):** `pytest tests/`
- **Frontend build:** `cd frontend && npm run build`
- **Frontend type check:** `cd frontend && npx tsc --noEmit`
