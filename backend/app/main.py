from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.responses import ok, fail
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    any_exception_handler,
)
from fastapi import HTTPException


@asynccontextmanager
async def lifespan(app: FastAPI):
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


from app.api.v1 import auth, topology, intent, deploy, monitor
from app.api import websocket

app.include_router(auth.router, prefix="/api")
app.include_router(topology.router, prefix="/api")
app.include_router(intent.router, prefix="/api")
app.include_router(deploy.router, prefix="/api")
app.include_router(monitor.router, prefix="/api")
app.include_router(websocket.router)
