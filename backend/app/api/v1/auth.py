from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.responses import ok, fail
from app.core.security import create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# Fixed users (per frontend README): admin/admin123, demo/demo123
USERS = {
    "admin": {"password": "admin123", "id": "1", "role": "admin", "email": "admin@paranet.local"},
    "demo": {"password": "demo123", "id": "2", "role": "operator", "email": "demo@paranet.local"},
}


class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    id: str
    username: str
    email: str | None = None
    avatar: str | None = None
    role: str
    permissions: List[str]
    createdAt: str
    lastLoginAt: str | None = None


class LoginResponse(BaseModel):
    token: str
    user: UserInfo


def _user_to_info(username: str, last_login: bool = False) -> UserInfo:
    u = USERS[username]
    now = datetime.now(timezone.utc).isoformat()
    perms = ["*"] if u["role"] == "admin" else []
    return UserInfo(
        id=u["id"],
        username=username,
        email=u.get("email"),
        role=u["role"],
        permissions=perms,
        createdAt=now,
        lastLoginAt=now if last_login else None,
    )


def get_current_username(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str | None:
    if not credentials or not credentials.credentials:
        return None
    return decode_access_token(credentials.credentials)


@router.post("/login")
def login(body: LoginRequest):
    if body.username not in USERS or USERS[body.username]["password"] != body.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    token = create_access_token(body.username)
    user = _user_to_info(body.username, last_login=True)
    return ok(LoginResponse(token=token, user=user).model_dump())


@router.post("/logout")
def logout():
    return ok(None)


@router.get("/me")
def me(username: str | None = Depends(get_current_username)):
    if not username or username not in USERS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")
    return ok(_user_to_info(username).model_dump())


@router.post("/refresh")
def refresh(username: str | None = Depends(get_current_username)):
    if not username or username not in USERS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")
    token = create_access_token(username)
    return ok({"token": token})
