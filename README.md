# ParaNet

**多模态可编程网络基础设施智能体**

ParaNet 是一个 LLM 驱动的多模态可编程网络基础设施平台，通过自然语言交互实现对 IP、NDN、GEO 等多种网络协议的统一编程、编译、部署和控制。

## 特性

- **多模态协议支持**: 统一管理 IP、NDN (命名数据网络)、GEO (地理路由) 等异构网络协议
- **LLM 智能交互**: 通过自然语言描述网络意图，自动转换为可执行配置
- **统一编译器**: 协议无关的意图表达，多目标代码生成
- **智能部署**: 自动化配置验证、编排部署、事务回滚
- **运行时控制**: 遥测采集、状态管理、自愈引擎

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                   自然语言交互层 (LLM Agent)                 │
├─────────────────────────────────────────────────────────────┤
│                   多模态编译器 (Compiler)                    │
│         IP后端 | NDN后端 | GEO后端 | P4后端                  │
├─────────────────────────────────────────────────────────────┤
│                   部署编排器 (Orchestrator)                  │
├─────────────────────────────────────────────────────────────┤
│                   运行时控制器 (Controller)                  │
├─────────────────────────────────────────────────────────────┤
│                   数据平面 (P4/NFD/GEO)                      │
└─────────────────────────────────────────────────────────────┘
```

## 项目结构

```
ParaNet/
├── paranet/                    # 主包
│   ├── agent/                  # LLM智能体
│   ├── compiler/               # 多模态编译器
│   ├── orchestrator/           # 部署编排
│   ├── controller/             # 运行时控制
│   └── models/                 # 数据模型
├── dsl/                        # DSL语法定义
├── tests/                      # 测试
├── docs/                       # 文档
└── deployment/                 # 部署配置
```

## 安装

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/ParaNet.git
cd ParaNet

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 .\venv\Scripts\activate  # Windows

# 安装依赖
pip install -e .
```

## 快速开始

```bash
# 启动 CLI
paranet

# 使用自然语言配置网络
paranet> 在节点A和B之间建立一条NDN内容分发通道
```

## 技术栈

- **语言**: Python 3.10+
- **LLM框架**: LangChain / LangGraph
- **DSL解析**: Lark
- **NDN支持**: NFD + python-ndn
- **P4仿真**: BMv2 + P4Runtime
- **网络仿真**: Mininet / Containernet

## 开发状态

🚧 项目正在积极开发中

## 前端集成进展

当前仓库中的新前端以 `frontend/` 为主工程，正在按“模块迁移 + API 适配”的路线吸收历史前端能力，而不是直接合并旧工程。

已完成的前端集成工作包括：

- 新增 `项目工作台`，提供项目选择、文件树、多标签编辑器和控制台面板
- 在 `Intent` 页接入项目上下文智能体，支持传递当前项目、当前文件和文件内容
- 新增前端 API 适配层，先兼容旧项目接口语义，再逐步切换到新的 `workspace/*` 与 `agent/*` 接口
- 补充 `Workspace` 与项目上下文智能体的后端接口契约文档

相关文档：

- 前端集成实施方案：`frontend/FRONTEND_INTEGRATION_PLAN.md`
- Workspace / Agent 接口契约：`docs/rebuild-context/04-workspace-agent-api-contract.md`
- 前端当前状态与后续 TODO：`frontend/README.md`

## 许可证

MIT License
