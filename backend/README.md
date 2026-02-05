# ParaNet API 后端

## 概述

ParaNet 的 API 服务后端，为前端 Web 界面提供 RESTful API 和 WebSocket 实时通信支持。

## 技术选型

| 技术 | 选择 | 说明 |
|------|------|------|
| 框架 | FastAPI | 高性能异步框架，自动生成 API 文档 |
| 语言 | Python 3.10+ | 与核心模块保持一致 |
| 异步运行时 | uvicorn | ASGI 服务器 |
| WebSocket | fastapi-websocket | 实时数据推送 |
| 数据验证 | Pydantic v2 | 请求/响应模型验证 |
| 数据库 | SQLite + SQLAlchemy | 持久化存储 |
| 缓存 | Redis | 会话与实时数据缓存 |
| 认证 | JWT | API 认证授权 |
| 文档 | Swagger/OpenAPI | 自动生成 API 文档 |

## 规划目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI 应用入口
│   ├── config.py             # 配置管理
│   ├── api/                  # API 路由
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── topology.py   # 拓扑管理 API
│   │   │   ├── intent.py     # 意图编程 API
│   │   │   ├── deploy.py     # 部署管理 API
│   │   │   ├── monitor.py    # 监控数据 API
│   │   │   └── auth.py       # 认证 API
│   │   └── websocket.py      # WebSocket 端点
│   ├── core/                 # 核心功能
│   │   ├── __init__.py
│   │   ├── security.py       # 认证授权
│   │   └── exceptions.py     # 异常处理
│   ├── models/               # 数据库模型
│   │   ├── __init__.py
│   │   └── schemas.py        # Pydantic 模型
│   ├── services/             # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── topology_service.py
│   │   ├── intent_service.py
│   │   ├── deploy_service.py
│   │   └── telemetry_service.py
│   ├── db/                   # 数据库
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── crud.py
│   └── utils/                # 工具函数
│       └── __init__.py
├── tests/                    # 测试
│   ├── __init__.py
│   ├── test_api/
│   └── conftest.py
├── alembic/                  # 数据库迁移
├── requirements.txt
├── Dockerfile
└── README.md
```

## API 端点规划

### 认证 (Auth)
```
POST   /api/v1/auth/login        # 用户登录
POST   /api/v1/auth/logout       # 用户登出
GET    /api/v1/auth/me           # 获取当前用户信息
```

### 拓扑管理 (Topology)
```
GET    /api/v1/topology                    # 获取完整拓扑
GET    /api/v1/topology/nodes              # 获取所有节点
POST   /api/v1/topology/nodes              # 创建节点
GET    /api/v1/topology/nodes/{id}         # 获取节点详情
PUT    /api/v1/topology/nodes/{id}         # 更新节点
DELETE /api/v1/topology/nodes/{id}         # 删除节点
GET    /api/v1/topology/links              # 获取所有链路
POST   /api/v1/topology/links              # 创建链路
PUT    /api/v1/topology/links/{id}         # 更新链路
DELETE /api/v1/topology/links/{id}         # 删除链路
POST   /api/v1/topology/import             # 导入拓扑
GET    /api/v1/topology/export             # 导出拓扑
```

### 意图编程 (Intent)
```
POST   /api/v1/intent/parse                # 解析自然语言意图
POST   /api/v1/intent/compile              # 编译 DSL
GET    /api/v1/intent/preview/{id}         # 预览编译结果
GET    /api/v1/intent/history              # 意图历史记录
POST   /api/v1/intent/chat                 # LLM 对话接口
```

### 部署管理 (Deploy)
```
POST   /api/v1/deploy/validate             # 验证配置
POST   /api/v1/deploy/execute              # 执行部署
GET    /api/v1/deploy/status/{id}          # 获取部署状态
POST   /api/v1/deploy/rollback/{id}        # 回滚部署
GET    /api/v1/deploy/history              # 部署历史
```

### 监控数据 (Monitor)
```
GET    /api/v1/monitor/metrics             # 获取指标数据
GET    /api/v1/monitor/metrics/{node_id}   # 获取节点指标
GET    /api/v1/monitor/alerts              # 获取告警列表
POST   /api/v1/monitor/alerts/rules        # 配置告警规则
GET    /api/v1/monitor/logs                # 获取系统日志
```

### WebSocket 端点
```
WS     /ws/telemetry                       # 实时遥测数据
WS     /ws/deploy/{deploy_id}              # 部署进度推送
WS     /ws/alerts                          # 告警通知
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

## 开发计划

### Phase 1: 基础框架搭建
- [ ] 初始化 FastAPI 项目结构
- [ ] 配置 CORS、异常处理
- [ ] 设置 Pydantic 模型
- [ ] 配置数据库连接

### Phase 2: 核心 API 实现
- [ ] 拓扑管理 CRUD API
- [ ] 意图编译 API
- [ ] 集成 paranet.compiler 模块

### Phase 3: 部署与监控 API
- [ ] 部署管理 API
- [ ] 集成 paranet.orchestrator 模块
- [ ] 遥测数据 API

### Phase 4: WebSocket 实时通信
- [ ] 实时遥测数据推送
- [ ] 部署进度推送
- [ ] 告警通知

### Phase 5: LLM 对话集成
- [ ] 集成 paranet.agent 模块
- [ ] 流式响应支持
- [ ] 对话历史管理

### Phase 6: 安全与优化
- [ ] JWT 认证实现
- [ ] 请求限流
- [ ] API 缓存
- [ ] 单元测试与集成测试

## 运行方式 (规划)

```bash
# 开发环境
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 生产环境
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API 文档

启动服务后访问：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
