# ParaNet

**多模态可编程网络基础设施智能体**

ParaNet 是一套面向多协议网络的编程与管控平台：通过 **Web 控制台**（拓扑编辑、DSL 编辑、部署与监控）配合 **FastAPI 后端**，对 **PNE DSL** 做解析与编译（`compiler/` 管线），并与 **智谱 GLM** 等 LLM 能力结合，支持自然语言意图到网络配置的辅助生成与 Agent 工具调用。核心 Python 包为 `paranet/`（模型、编排、控制与智能体相关逻辑），与根目录下的统一编译器包 `compiler/` 一同以可编辑方式安装。

## 特性

- **多模态协议方向**：围绕 IP、NDN、GEO 等协议场景的建模与编译管线（具体能力以代码与测试为准）
- **LLM 辅助**：后端集成智谱 GLM；配置 API Key 后可使用意图对话、Agent 工具链等能力
- **统一编译器**：Lark 前端、IR、语义与 lowering 等阶段的 PNE DSL 编译流水线
- **前后端分离**：React + Vite 前端，FastAPI 提供 REST / WebSocket；本地开发通过 Vite 代理访问后端

## 架构（概览）

```
┌─────────────────────────────────────────────────────────────┐
│              Web 前端 (React / 拓扑与 DSL 编辑器)            │
├─────────────────────────────────────────────────────────────┤
│         FastAPI 后端 (API / WebSocket / 业务服务)            │
├─────────────────────────────────────────────────────────────┤
│   paranet/ (模型、编排、控制、agent)  +  compiler/ (DSL 编译) │
├─────────────────────────────────────────────────────────────┤
│              可选：智谱 GLM 等 LLM（环境变量配置）              │
└─────────────────────────────────────────────────────────────┘
```

## 项目结构

```
ParaNet/
├── paranet/           # 核心包：模型、编排、控制、CLI、agent 等
├── compiler/          # PNE DSL 编译器（与 paranet 并列安装）
├── backend/           # FastAPI 服务（依赖本仓库的 compiler 包）
├── frontend/          # React 19 + TypeScript + Vite 控制台
├── dsl/               # DSL 语法与示例
├── tests/             # 测试
├── docs/              # 文档
└── deployment/        # 部署相关配置
```

## 环境要求

| 组件 | 要求 |
|------|------|
| Python | 3.10+（后端 + 可编辑安装 `paranet` / `compiler`） |
| Node.js | 建议 18+ 或 20+（用于前端 Vite） |

## 安装（核心与编译器）

`pyproject.toml` 不是一个需要手动“安装”的文件，它是 Python 项目的**构建与依赖配置文件**。正确方式是在仓库根目录执行 `pip install ...`，由 `pip` 读取 `pyproject.toml` 并安装当前项目。

在仓库根目录执行（便于 `backend` 引用 `compiler`）：

```bash
git clone https://github.com/YOUR_USERNAME/ParaNet.git
cd ParaNet

python -m venv venv
# Linux / macOS
source venv/bin/activate
# Windows PowerShell
# .\venv\Scripts\Activate.ps1

# 可编辑安装 paranet + compiler
pip install -e ".[dev]"
```

常见安装方式：

```bash
# 仅安装项目基础依赖（按 pyproject.toml 的 [project.dependencies]）
pip install -e .

# 安装开发依赖（基础依赖 + dev extras）
pip install -e ".[dev]"

# 安装 LLM 相关可选依赖（基础依赖 + llm extras）
pip install -e ".[llm]"

# 一次安装更多可选依赖
pip install -e ".[all]"
```

如果你更习惯 `requirements` 方式，也可以使用下面这些兼容入口；它们本质上仍会回到 `pyproject.toml`：

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
pip install -r requirements-llm.txt
```

仅跑后端时，仍需先在根目录执行 `pip install -e .`（或 `pip install -e ".[dev]"`），否则无法导入 `compiler`。

## 运行后端

```bash
cd backend
pip install -r requirements.txt

# 默认 0.0.0.0:8000；数据库目录默认 backend/data（与进程 cwd 无关）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- HTTP API 前缀：`http://localhost:8000/api`
- Swagger：`http://localhost:8000/docs`

常用环境变量（可选）：

| 变量 | 说明 |
|------|------|
| `PARANET_API_HOST` / `PARANET_API_PORT` | 应用内配置默认值；本地开发一般用命令行 `uvicorn --host` / `--port` 指定监听 |
| `PARANET_DATA_DIR` | SQLite 数据目录，默认 `backend/data` |
| `PARANET_JWT_SECRET` | JWT 密钥，生产环境务必修改 |
| `PARANET_USE_MOCK` | 默认 `true`：部署/编译等可走 Mock；设为 `false` 可对接外部编辑器后端 |
| `PARANET_EDITOR_BACKEND_URL` | 外部编辑器后端地址，默认 `http://localhost:8080/api` |

## 运行前端

```bash
cd frontend
npm install
npm run dev
```

开发服务器默认 **http://localhost:3000**，并将 `/api`、`/ws` 代理到 **http://localhost:8000**（需先启动后端）。

生产构建：

```bash
npm run build
npm run preview   # 本地预览构建结果
```

## 配置 LLM（智谱 GLM）API Key

后端启动时会自动加载 `.env`（优先读取仓库根目录 `.env`，其次兼容 `backend/.env`），因此你可以直接把智谱开放平台凭证写入 `.env`，也可以继续通过 shell / 系统环境变量覆盖。

**必填（启用真实 LLM 调用）**

| 变量 | 说明 |
|------|------|
| `ZHIPU_API_KEY` | 智谱 API Key（在[智谱开放平台](https://open.bigmodel.cn/)创建） |

根目录 `.env` 示例：

```env
ZHIPU_API_KEY=your_zhipu_api_key
ZHIPU_MODEL=glm-4.6v-flashx
```

**常用可选**

| 变量 | 默认值（摘自 `backend/config.py`） |
|------|-------------------------------------|
| `ZHIPU_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4/` |
| `ZHIPU_MODEL` | `glm-4.6v-flashx` |
| `ZHIPU_TIMEOUT_SECONDS` | `60` |
| `ZHIPU_TEMPERATURE` | `0.1` |
| `ZHIPU_MAX_TOKENS` | `4096` |
| `PARANET_AGENT_MAX_ITERATIONS` | Agent 最大迭代轮数，默认 `8` |

**Linux / macOS（当前终端会话，优先级高于 `.env`）**

```bash
export ZHIPU_API_KEY="你的_API_Key"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Windows PowerShell（当前会话，优先级高于 `.env`）**

```powershell
$env:ZHIPU_API_KEY = "你的_API_Key"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Windows CMD（当前会话，优先级高于 `.env`）**

```cmd
set ZHIPU_API_KEY=你的_API_Key
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

请将 Key 保存在安全位置，**不要**提交到 Git。生产环境建议使用系统/容器密钥管理或 CI 密钥注入，而非写入代码或默认配置。

**可选：Python 包内的 LangChain 相关依赖**（用于 `paranet` 中可选的 LangChain 集成，与后端智谱 HTTP 调用相互独立）：

```bash
pip install -e ".[llm]"
```

## CLI

安装后可使用入口 `paranet`（见 `paranet/cli.py`）。交互式自然语言会话等能力仍在演进中，完整体验以 **Web 前端 + 后端** 为主。

## 测试

```bash
pytest
```

## 技术栈（摘要）

- **语言与核心**：Python 3.10+，Pydantic，Lark，Typer
- **后端**：FastAPI，Uvicorn，SQLAlchemy，SQLite
- **前端**：React 19，TypeScript，Vite，Ant Design，D3，Monaco Editor
- **LLM（当前后端路径）**：智谱 GLM（OpenAPI 兼容 HTTP 调用）

## 开发状态

项目仍在积极开发中，行为与 API 以当前分支代码为准。

## 许可证

MIT License
