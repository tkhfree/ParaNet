from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.responses import ok
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    any_exception_handler,
)
from fastapi import HTTPException
from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="ParaNet API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, any_exception_handler)


@app.get("/api/health")
def health():
    return ok({"status": "ok"})


@app.get("/api/device-legends")
def list_device_legends():
    from app.services import device_legend_service

    return ok(device_legend_service.list_device_legends())


@app.post("/api/device-legends")
def create_device_legend(body: dict):
    from app.services import device_legend_service

    type = str(body.get("type", "")).strip()
    label = str(body.get("label", "")).strip()
    if not type or not label:
        raise HTTPException(status_code=400, detail="类型标识和显示名称不能为空")
    try:
        legend = device_legend_service.create_device_legend(
            type=type,
            label=label,
            image_key=body.get("imageKey"),
            color=body.get("color"),
            sort=body.get("sort"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ok(legend)


@app.put("/api/device-legends/{legend_id}")
def update_device_legend(legend_id: str, body: dict):
    from app.services import device_legend_service

    try:
        legend = device_legend_service.update_device_legend(
            legend_id=legend_id,
            type=body.get("type"),
            label=body.get("label"),
            image_key=body.get("imageKey"),
            color=body.get("color"),
            sort=body.get("sort"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not legend:
        raise HTTPException(status_code=404, detail="设备图例不存在")
    return ok(legend)


@app.delete("/api/device-legends/{legend_id}")
def delete_device_legend(legend_id: str):
    from app.services import device_legend_service

    if not device_legend_service.delete_device_legend(legend_id):
        raise HTTPException(status_code=404, detail="设备图例不存在")
    return ok(None)


from app.api.v1 import auth, topology, intent, deploy, monitor, editor_project, editor_file, device_legend
from app.api import websocket, editor_terminal_ws

app.include_router(auth.router, prefix="/api")
app.include_router(topology.router, prefix="/api")
app.include_router(intent.router, prefix="/api")
app.include_router(deploy.router, prefix="/api")
app.include_router(monitor.router, prefix="/api")
app.include_router(editor_project.router, prefix="/api")
app.include_router(editor_file.router, prefix="/api")
app.include_router(device_legend.router, prefix="/api")
app.include_router(websocket.router)
app.include_router(editor_terminal_ws.router)
