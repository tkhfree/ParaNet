# ParaNet API 后端

## 概述

ParaNet 的 API 服务后端，为前端 Web 界面提供 RESTful API 和 WebSocket 实时通信支持。

## 技术选型

| 技术 | 选择 | 说明 |
|------|------|------|
| 框架 | FastAPI | 高性能异步框架，自动生成 API 文档 |
| 语言 | Python 3.10+ | 与核心模块保持一致 |
| 异步运行时 | uvicorn | ASGI 服务器 |
| 数据验证 | Pydantic v2 | 请求/响应模型验证 |
| 数据库 | SQLite (aiosqlite + SQLAlchemy) | 持久化存储，`init_db()` 自动建表 |
| 认证 | JWT (python-jose + passlib) | API 认证授权 |
| LLM | 智谱 GLM (zhipu) | Agent 对话与自然语言转 DSL |
| SSH | paramiko | 远程终端连接 |
| 终端 | pywinpty | WebSocket 终端伪终端 |
| 文档 | Swagger/OpenAPI | 自动生成 API 文档 |

## 目录结构

```
backend/
├── config.py                          # 配置管理（环境变量 / 路径 / JWT / 智谱 LLM）
├── Dockerfile
├── README.md
├── README_API.md                      # API 详细文档
├── requirements.txt
├── app/
│   ├── __init__.py
│   ├── main.py                        # FastAPI 应用入口，挂载路由与中间件
│   ├── config.py                      # （旧入口，同根 config.py）
│   ├── api/                           # API 路由
│   │   ├── __init__.py
│   │   ├── websocket.py               # WebSocket 端点（遥测 / 部署进度 / 告警）
│   │   ├── editor_terminal_ws.py      # 终端 WebSocket
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── schemas.py             # Pydantic 请求/响应模型
│   │       ├── auth.py                # 认证 API
│   │       ├── topology.py            # 拓扑管理 API
│   │       ├── intent.py              # 编译产物 & 意图 API
│   │       ├── deploy.py              # 部署管理 API
│   │       ├── monitor.py             # 监控数据 API
│   │       ├── agent.py               # Agent 对话 API（同步 / SSE 流式）
│   │       ├── editor_project.py      # 项目管理 API
│   │       ├── editor_file.py         # 文件管理 API
│   │       ├── device_legend.py       # 设备图例 API
│   │       └── poly_dsl.py            # 多态 DSL 解析 & P4/控制面代码生成
│   ├── core/                          # 核心功能
│   │   ├── __init__.py
│   │   ├── security.py                # JWT 认证授权
│   │   ├── exceptions.py              # 全局异常处理
│   │   └── responses.py               # 统一响应封装 `ok(data)`
│   ├── db/                            # 数据库
│   │   ├── __init__.py
│   │   └── database.py                # SQLite 连接 & init_db() 建表/迁移
│   └── services/                      # 业务逻辑层
│       ├── __init__.py
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
│           ├── __init__.py
│           ├── compile_tools.py
│           ├── file_tools.py
│           ├── topology_tools.py
│           ├── _file_utils.py
│           ├── pne_knowledge.py
│           └── pne_templates.py
└── data/                              # 运行时 SQLite 数据（gitignored）
    └── paranet.db
```

## API 端点

### 健康检查
```
GET    /api/health                              # 服务健康检查
```

### 认证 (Auth)
```
POST   /api/auth/login                          # 用户登录
POST   /api/auth/logout                         # 用户登出
GET    /api/auth/me                             # 获取当前用户信息
POST   /api/auth/refresh                        # 刷新 Token
```

### 拓扑管理 (Topology)
```
GET    /api/topologies                           # 获取拓扑列表
POST   /api/topologies                           # 创建拓扑
GET    /api/topologies/{id}                      # 获取拓扑详情
PUT    /api/topologies/{id}                      # 更新拓扑
DELETE /api/topologies/{id}                      # 删除拓扑
GET    /api/topologies/{id}/export               # 导出拓扑
POST   /api/topologies/import                    # 导入拓扑
```

### 编译产物 & 意图 (Compile Artifacts)
```
GET    /api/compile-artifacts                    # 列出编译产物记录
POST   /api/compile-artifacts                    # 创建编译产物记录
GET    /api/compile-artifacts/{id}               # 获取单条记录
PUT    /api/compile-artifacts/{id}               # 更新记录
DELETE /api/compile-artifacts/{id}               # 删除记录
POST   /api/compile-artifacts/compile            # 按记录重新编译
POST   /api/compile-artifacts/compile-preview    # 编译预览（不落库）
POST   /api/compile-artifacts/save-deploy-artifacts  # 编译并写入项目 output/
POST   /api/compile-artifacts/translate          # 自然语言转 DSL
```

### 部署管理 (Deploy)
```
GET    /api/deployments                          # 部署列表
POST   /api/deployments                          # 创建部署
GET    /api/deployments/{id}                     # 获取部署详情
GET    /api/deployments/{id}/logs                # 部署日志
POST   /api/deployments/{id}/rollback            # 回滚部署
POST   /api/deployments/{id}/cancel              # 取消部署
POST   /api/deployments/validate                 # 验证配置
POST   /api/deployments/preview                  # 预览部署
```

### 监控数据 (Monitor)
```
GET    /api/monitor/health                       # 监控健康状态
GET    /api/monitor/metrics/nodes                # 节点指标
GET    /api/monitor/metrics/links                # 链路指标
GET    /api/monitor/alerts                       # 告警列表
POST   /api/monitor/alerts/{id}/acknowledge      # 确认告警
GET    /api/monitor/alert-rules                  # 告警规则列表
POST   /api/monitor/alert-rules                  # 创建告警规则
PUT    /api/monitor/alert-rules/{id}             # 更新告警规则
DELETE /api/monitor/alert-rules/{id}             # 删除告警规则
GET    /api/monitor/terminal/logs                # 终端日志
```

### Agent 对话
```
POST   /api/agent/chat-sync                      # Agent 对话（同步）
POST   /api/agent/chat                           # Agent 对话（SSE 流式）
```

### 项目管理 (Editor Project)
```
GET    /api/project/projectList                  # 项目列表
POST   /api/project/createProject                # 创建项目
POST   /api/project/updateProject                # 更新项目
GET    /api/project/deleteProject/{id}           # 删除项目
GET    /api/project/getProject/{id}              # 获取项目详情
GET    /api/project/checkProjectNameExists       # 检查项目名重复
POST   /api/project/checkProjectResources        # 检查项目资源
```

### 文件管理 (Editor File)
```
GET    /api/file/tree/{project_id}               # 文件树
POST   /api/file/createFile                      # 创建文件/文件夹
GET    /api/file/readFile/{file_id}              # 读取文件内容
POST   /api/file/updateFileContent               # 更新文件内容
POST   /api/file/delete                          # 删除文件
POST   /api/file/renameFile                      # 重命名文件
POST   /api/file/moveFile                        # 移动文件
GET    /api/file/export                          # 导出文件
POST   /api/file/import                          # 导入文件
POST   /api/file/getJsonContentByProjectId       # 获取项目 JSON 内容
```

### 设备图例 (Device Legend)
```
GET    /api/device-legends                       # 图例列表
POST   /api/device-legends                       # 创建图例
PUT    /api/device-legends/{id}                  # 更新图例
DELETE /api/device-legends/{id}                  # 删除图例
```

### 多态 DSL
```
POST   /api/compile-artifacts/parse              # 解析多态 DSL
POST   /api/compile-artifacts/generate-control   # 生成 ONOS 控制面 Java 代码
POST   /api/compile-artifacts/generate-p4        # 生成 P4 代码
```

### WebSocket 端点
```
WS     /ws/telemetry                             # 实时遥测数据
WS     /ws/deployments/{deploy_id}/progress      # 部署进度推送
WS     /ws/deploy/{deploy_id}                    # 部署状态推送
WS     /ws/alerts                                # 告警通知
WS     /api/terminal                             # 远程终端
```

## 与核心模块集成

后端 API 作为桥梁，连接前端界面与 ParaNet 核心模块：

```
Frontend  <-->  Backend API  <-->  ParaNet Core
                    |
                    ├── paranet.models.*       (数据模型)
                    ├── paranet.compiler.*     (编译器)
                    ├── paranet.orchestrator.* (编排器)
                    ├── paranet.controller.*   (控制器)
                    └── paranet.agent.*        (LLM 智能体)
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PARANET_API_HOST` | `0.0.0.0` | 监听地址 |
| `PARANET_API_PORT` | `8000` | 监听端口 |
| `PARANET_DATA_DIR` | `backend/data` | SQLite 数据目录 |
| `PARANET_JWT_SECRET` | `paranet-jwt-secret-change-in-production` | JWT 签名密钥 |
| `PARANET_EDITOR_BACKEND_URL` | `http://localhost:8080/api` | Editor 后端地址 |
| `PARANET_USE_MOCK` | `true` | Mock 模式开关 |
| `ZHIPU_API_KEY` | — | 智谱 GLM API Key |
| `ZHIPU_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4/` | 智谱 API 地址 |
| `ZHIPU_MODEL` | `glm-4.6v-flashx` | 智谱模型名称 |
| `ZHIPU_TIMEOUT_SECONDS` | `60` | LLM 请求超时 |
| `ZHIPU_TEMPERATURE` | `0.1` | 生成温度 |
| `ZHIPU_MAX_TOKENS` | `4096` | 最大生成 token 数 |
| `PARANET_AGENT_MAX_ITERATIONS` | `8` | Agent 最大迭代轮次 |

## 运行方式

```bash
# 开发环境
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产环境
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

详细的启动命令、与前端 baseURL/WebSocket 路径及 Docker 方式见 **[README_API.md](README_API.md)**。

## API 文档

启动服务后访问：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
