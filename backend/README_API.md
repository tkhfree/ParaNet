# ParaNet API 服务（新后端）

本服务为 FastAPI 实现，**不修改** `editor-backend-dev` 内任何文件；所有代码位于 `backend/app/` 及本目录下配置文件。

## 新 API 服务目录说明

```
backend/
├── app/                      # 新后端应用（本实现全部在此及以下）
│   ├── __init__.py
│   ├── main.py               # FastAPI 入口，路由前缀 /api，挂载 WebSocket
│   ├── api/
│   │   ├── v1/               # REST：auth, topology, intent, deploy, monitor
│   │   └── websocket.py      # WebSocket：/ws/telemetry、deploy 进度、alerts
│   ├── core/                 # 统一响应、异常处理、JWT 安全
│   ├── db/                   # 数据库连接（SQLite 等，仅本服务使用）
│   └── services/             # 业务逻辑：topology、intent、deploy、monitor
├── config.py                 # 环境变量与配置
├── requirements.txt          # Python 依赖（与 editor-backend-dev 无关）
├── README_API.md             # 本说明
├── Dockerfile                # 仅针对本服务的镜像（可选）
├── docker-compose.yml        # 仅本服务编排（可选）
└── editor-backend-dev/       # 不修改：仅通过 HTTP 调用其既有接口
```

## 运行方式

```bash
# 在 backend 目录下
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后：

- API 基路径：`http://localhost:8000/api`
- 健康检查：`GET http://localhost:8000/api/health`
- Swagger：`http://localhost:8000/docs`

## 环境变量（可选）

| 变量 | 说明 | 默认 |
|------|------|------|
| PARANET_API_HOST | 监听地址 | 0.0.0.0 |
| PARANET_API_PORT | 端口 | 8000 |
| PARANET_DATA_DIR | 数据目录（SQLite 等） | ./data |
| PARANET_JWT_SECRET | JWT 密钥 | 见 config.py |
| PARANET_EDITOR_BACKEND_URL | editor-backend-dev 地址（可选调用） | http://localhost:8080/api |
| PARANET_USE_MOCK | 是否使用 Mock（deploy/compile） | true |

## 与前端对接

- 前端 `baseURL: '/api'` 需代理到本服务（如 `http://localhost:8000`），或通过 Nginx / devServer 将 `/api` 转发到本服务。
- WebSocket 端点需同源代理到本服务：
  - 遥测：`/ws/telemetry`
  - 部署进度：前端默认使用 `ws(s)://<host>/ws/deployments/{deploymentId}/progress`，本服务同时兼容计划中的 `/ws/deploy/{deploymentId}` 路径。
  - 告警：`/ws/alerts`

---

## Docker 运行（可选）

仅针对本服务构建与运行，与 `editor-backend-dev` 分开：

```bash
# 在 backend 目录下
cd backend
docker build -t paranet-api .
docker run -p 8000:8000 paranet-api
```

或使用 docker-compose：

```bash
cd backend
docker compose up --build
```

若需同时跑 editor-backend-dev（如真实编译/部署），在宿主机或另一项目中启动该服务，并设置环境变量 `PARANET_EDITOR_BACKEND_URL`（容器内可用 `http://host.docker.internal:8080/api`）关联，**不修改 editor-backend-dev 仓库内任何文件**。

---

**本实现不修改 editor-backend-dev**，所有实现均在 `backend/app/` 及本目录配置中完成；与 editor-backend-dev 仅通过配置（端口、URL）及可选的 HTTP 调用关联。
