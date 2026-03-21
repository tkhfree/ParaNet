# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ParaNet is a **Multi-modal Programmable Network Infrastructure Agent** that uses LLM to manage network configurations through a visual web interface. The system consists of:

- **Core Engine** (`/paranet`): Python modules for network modeling, orchestration, and control
- **Compiler** (`/compiler`): Unified PNE DSL compiler with frontend (parser/preprocessor), IR, semantic analysis, lowering, placement, and runtime
- **Backend API** (`/backend`): FastAPI service providing REST/WebSocket APIs
- **Frontend** (`/frontend`): React 19 + TypeScript + Vite web interface
- **DSL** (`/dsl`): Domain-specific language grammar and examples

## Architecture

```
Frontend (React) <--HTTP/WebSocket--> Backend (FastAPI) <---> Core Engine (paranet/ + compiler/)
                                                            ├── models/        - Network data models
                                                            ├── compiler/      - PNE DSL compilation
                                                            ├── orchestrator/  - Deployment orchestration
                                                            ├── controller/    - Network control
                                                            └── agent/         - LLM agent integration
```

## Common Commands

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API: http://localhost:8000/api
- Swagger docs: http://localhost:8000/docs

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build (runs tsc -b && vite build)
npm run lint     # ESLint with --max-warnings 0
```

### Core Package (Python)
```bash
# Install in development mode (includes paranet + compiler packages)
pip install -e ".[dev]"

# Run all tests
pytest

# Run specific test file
pytest tests/test_compiler.py

# Run single test function
pytest tests/test_models.py::test_specific_function -v

# Lint and format
black .
ruff check .
mypy .
```

## Key Configuration

- Backend uses SQLite in `backend/data` by default (path is anchored to `backend/config.py`, not process cwd)
- Frontend proxies `/api` → `http://localhost:8000` and `/ws` → `ws://localhost:8000`
- Mock mode enabled by default (`PARANET_USE_MOCK=true`)
- Environment variables: `PARANET_API_HOST`, `PARANET_API_PORT`, `PARANET_DATA_DIR`, `PARANET_JWT_SECRET`, `PARANET_EDITOR_BACKEND_URL`, `PARANET_USE_MOCK`

## Backend API Patterns

- All API responses use wrapper functions from `app.core.responses`: `ok(data)` returns `{code: 200, data, message: ""}`
- Request/response schemas defined in `app/api/v1/schemas.py` using Pydantic
- WebSocket endpoints at `/ws/telemetry`, `/ws/deployments/{id}/progress`, `/ws/alerts` for real-time updates
- Background tasks used for async deployment jobs (see `deploy.py`)

## Compiler Pipeline

The compiler (`/compiler`) processes PNE DSL through these stages:

1. **Frontend** (`frontend/`): Lark-based parser with preprocessor for `#include` and `.domain` expansion
2. **Semantic** (`semantic/`): AST → ProgramIR collection with protocol adapters (IP, NDN, GEO)
3. **IR** (`ir/`): Intermediate representations (ProgramIR, FragmentIR, NodePlanIR, IntentIR)
4. **Lowering/Placement/Backend**: Transform IR through stages to target code (P4, entry emitters)

PNE files support optional `intent { ... }` overlay blocks for declarative routing policies.

## Frontend Architecture

- **State Management**: Zustand stores in `src/stores/` (user, topology, intent, deploy, project, system)
- **Topology Visualization**: D3.js engine in `src/components/topology/d3-engine/` with editor and previewer modes
- **Monaco Editor**: DSL code editing with custom syntax highlighting (`src/components/editor/DSLEditor/`)
- **API Layer**: Axios instances in `src/api/` with typed endpoints

## Dependencies

- **Core**: Python 3.10+, lark, pydantic, typer, rich, httpx, grpcio, redis, pyyaml
- **Backend**: FastAPI, uvicorn, SQLAlchemy, aiosqlite, python-jose, passlib, paramiko
- **LLM**: langchain, langchain-anthropic, langchain-openai (optional, install with `pip install -e ".[llm]"`)
- **Frontend**: React 19, TypeScript, Vite, Ant Design 5, D3.js, @antv/x6, Monaco Editor, ECharts, xterm.js, zustand

## Test Files

- `tests/test_models.py` - Core data model tests
- `tests/test_compiler.py` - Compiler pipeline tests
- `tests/test_pne_intent_overlay.py` - Intent overlay parsing tests
- `tests/test_lynette2_frontend.py` - Legacy parser tests (may be removed)