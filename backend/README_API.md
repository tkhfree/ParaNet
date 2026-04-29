# ParaNet API 服务

本服务为 FastAPI 实现，所有代码位于 `backend/app/` 及本目录下配置文件。

## 目录说明

```
backend/
├── app/                              # 后端应用
│   ├── __init__.py
│   ├── main.py                       # FastAPI 入口，路由前缀 /api，挂载 WebSocket
│   ├── api/
│   │   ├── v1/                       # REST 路由
│   │   │   ├── schemas.py            # Pydantic 请求/响应模型
│   │   │   ├── auth.py               # 认证 API
│   │   │   ├── topology.py           # 拓扑管理 API
│   │   │   ├── intent.py             # 编译产物 & 意图 API
│   │   │   ├── deploy.py             # 部署管理 API
│   │   │   ├── monitor.py            # 监控数据 API
│   │   │   ├── agent.py              # Agent 对话 API（同步 / SSE 流式）
│   │   │   ├── editor_project.py     # 项目管理 API
│   │   │   ├── editor_file.py        # 文件管理 API
│   │   │   ├── device_legend.py      # 设备图例 API
│   │   │   └── poly_dsl.py           # 多态 DSL 解析 & P4/控制面代码生成
│   │   ├── websocket.py              # WebSocket：/ws/telemetry、deploy 进度、alerts
│   │   └── editor_terminal_ws.py     # 终端 WebSocket：/api/terminal
│   ├── core/                         # 统一响应、异常处理、JWT 安全
│   │   ├── responses.py              # 统一响应封装 ok(data)
│   │   ├── exceptions.py             # 全局异常处理
│   │   └── security.py               # JWT 认证授权
│   ├── db/                           # 数据库连接（SQLite，仅本服务使用）
│   │   └── database.py               # 连接管理 & init_db() 建表/迁移
│   └── services/                     # 业务逻辑
│       ├── topology_service.py
│       ├── intent_service.py
│       ├── deploy_service.py
│       ├── monitor_service.py
│       ├── device_legend_service.py
│       ├── editor_project_service.py
│       ├── editor_project_check_service.py
│       ├── editor_file_service.py
│       ├── editor_terminal_service.py
│       ├── zhipu_llm_service.py       # 智谱 GLM 调用封装
│       ├── agent_orchestrator.py      # Agent 编排器
│       ├── agent_prompt_skills.py     # Agent Prompt 技能定义
│       └── agent_tools/               # Agent 工具集
│           ├── compile_tools.py
│           ├── file_tools.py
│           ├── topology_tools.py
│           ├── _file_utils.py
│           ├── pne_knowledge.py
│           └── pne_templates.py
├── config.py                         # 环境变量与配置
├── requirements.txt                  # Python 依赖
├── Dockerfile                        # 本服务镜像
├── docker-compose.yml                # 本服务编排
└── data/                             # 运行时 SQLite 数据（gitignored）
```

## 运行方式

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后：

- API 基路径：`http://localhost:8000/api`
- 健康检查：`GET http://localhost:8000/api/health`
- Swagger：`http://localhost:8000/docs`
- ReDoc：`http://localhost:8000/redoc`

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PARANET_API_HOST` | 监听地址 | `0.0.0.0` |
| `PARANET_API_PORT` | 端口 | `8000` |
| `PARANET_DATA_DIR` | 数据目录（SQLite） | `backend/data`（与进程 cwd 无关） |
| `PARANET_JWT_SECRET` | JWT 密钥 | 见 config.py |
| `PARANET_EDITOR_BACKEND_URL` | Editor 后端地址 | `http://localhost:8080/api` |
| `PARANET_USE_MOCK` | 是否使用 Mock（deploy/compile） | `true` |
| `ZHIPU_API_KEY` | 智谱 GLM API Key | — |
| `ZHIPU_BASE_URL` | 智谱 API 地址 | `https://open.bigmodel.cn/api/paas/v4/` |
| `ZHIPU_MODEL` | 智谱模型名称 | `glm-4.6v-flashx` |
| `ZHIPU_TIMEOUT_SECONDS` | LLM 请求超时 | `60` |
| `ZHIPU_TEMPERATURE` | 生成温度 | `0.1` |
| `ZHIPU_MAX_TOKENS` | 最大生成 token 数 | `4096` |
| `PARANET_AGENT_MAX_ITERATIONS` | Agent 最大迭代轮次 | `8` |

## 与前端对接

前端 `baseURL: '/api'` 需代理到本服务（如 `http://localhost:8000`），或通过 Nginx / devServer 将 `/api` 转发到本服务。

WebSocket 端点需同源代理到本服务：

| 端点 | 用途 |
|------|------|
| `/ws/telemetry` | 实时遥测数据 |
| `/ws/deployments/{id}/progress` | 部署进度推送 |
| `/ws/deploy/{id}` | 部署状态推送（兼容路径） |
| `/ws/alerts` | 告警通知 |
| `/api/terminal` | 远程终端 |

## Docker 运行

```bash
cd backend
docker build -t paranet-api .
docker run -p 8000:8000 paranet-api
```

或使用 docker-compose：

```bash
cd backend
docker compose up --build
```
