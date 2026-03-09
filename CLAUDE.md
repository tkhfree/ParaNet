# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ParaNet is a **Multi-modal Programmable Network Infrastructure Agent** that uses LLM to manage network configurations through a visual web interface. The system consists of:

- **Core Engine** (`/paranet`): Python modules for network modeling, compilation, orchestration, and control
- **Backend API** (`/backend`): FastAPI service providing REST/WebSocket APIs
- **Frontend** (`/frontend`): React 19 + TypeScript + Vite web interface
- **DSL** (`/dsl`): Domain-specific language grammar and examples

## Architecture

```
Frontend (React) <--HTTP/WebSocket--> Backend (FastAPI) <---> Core Engine (paranet/)
                                                            ├── models/     - Network data models
                                                            ├── compiler/   - DSL compilation
                                                            ├── orchestrator/ - Deployment orchestration
                                                            ├── controller/ - Network control
                                                            └── agent/      - LLM agent integration
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
npm run dev
```
- URL: http://localhost:3000

### Core Package (Python)
```bash
# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Run a single test
pytest tests/test_models.py::test_specific_function

# Lint and format
black .
ruff check .
mypy .
```

### Build for production
```bash
# Frontend
cd frontend && npm run build

# Core package
pip install -e "."
```

## Key Configuration

- Backend uses SQLite in `./data` by default
- Frontend proxies `/api` → `http://localhost:8000` and `/ws` → `ws://localhost:8000`
- Mock mode enabled by default (`PARANET_USE_MOCK=true`)

## Dependencies

- **Core**: Python 3.10+, lark, pydantic, typer, rich, httpx, grpcio, redis, pyyaml
- **LLM**: langchain, langchain-anthropic, langchain-openai (optional)
- **Frontend**: React 19, TypeScript, Vite, Ant Design 5, @antv/x6, Monaco Editor, ECharts, socket.io-client