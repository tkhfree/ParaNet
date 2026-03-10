# ParaNet Web 前端

## 概述

ParaNet 的 Web 展示界面，当前以 `frontend/` 作为新的主前端工程，提供可视化拓扑管理、意图编程、部署监控，以及正在建设中的项目工作台和项目上下文智能体能力。

## 技术选型

| 技术 | 选择 | 说明 |
|------|------|------|
| 框架 | React 19 | 组件化开发，和旧前端技术栈保持兼容 |
| 语言 | TypeScript | 类型安全，便于模块迁移 |
| 构建工具 | Vite 6 | 新主工程构建链路 |
| UI 组件库 | Ant Design 5 | 页面和工作台统一 UI 方案 |
| 状态管理 | Zustand 5 | 页面状态与工作台上下文共享 |
| 网络拓扑可视化 | AntV X6 | 已承接老前端拓扑能力 |
| 代码编辑器 | Monaco Editor | DSL / 工作台多标签编辑 |
| 终端 | xterm | 日志与后续交互终端接入位 |
| API 通信 | Axios + WebSocket | REST 与流式 / 实时能力 |

## 当前目录结构

```text
frontend/
├── public/                    # 静态资源
├── src/
│   ├── assets/               # 图片、字体等资源
│   ├── components/           # 通用组件
│   │   ├── common/           # 基础组件
│   │   ├── topology/         # 拓扑可视化组件
│   │   ├── editor/           # DSL 编辑器 / 项目上下文智能体
│   │   └── monitoring/       # 监控图表 / 终端日志组件
│   ├── pages/                # 页面组件
│   │   ├── Dashboard/        # 仪表盘
│   │   ├── Topology/         # 拓扑管理
│   │   ├── Workspace/        # 项目工作台
│   │   ├── Intent/           # 意图编程
│   │   ├── Deploy/           # 部署管理
│   │   └── Monitor/          # 监控中心
│   ├── hooks/                # 自定义 Hooks
│   ├── api/                  # API 访问与适配层
│   ├── stores/               # Zustand 状态管理
│   ├── model/                # TypeScript 类型定义
│   ├── utils/                # 工具函数
│   ├── styles/               # 全局样式
│   ├── App.tsx
│   └── main.tsx
├── FRONTEND_INTEGRATION_PLAN.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 核心功能模块

### 1. 仪表盘 (Dashboard)

- 系统状态概览
- 网络健康度指标
- 最近操作记录
- 告警通知

### 2. 拓扑管理 (Topology)

- **拓扑可视化**: 交互式网络拓扑图
- **节点管理**: 添加/编辑/删除网络节点
- **链路管理**: 配置链路属性
- **拓扑导入/导出**: JSON/YAML 格式

### 3. 意图编程 (Intent)

- **自然语言转 DSL**: 保留现有 DSL 生成交互
- **DSL 编辑器**: Monaco + 自定义 DSL 配置
- **意图预览**: 编译结果可视化
- **项目上下文智能体**: 自动携带当前项目与当前文件信息

### 4. 部署管理 (Deploy)

- **部署向导**: 分步骤部署流程
- **配置预览**: 各协议配置查看
- **进度跟踪**: 实时部署状态
- **回滚操作**: 一键回滚

### 5. 监控中心 (Monitor)

- **实时遥测**: 流量、延迟、丢包率
- **指标图表**: 时序数据可视化
- **告警管理**: 告警规则配置
- **日志查看**: 系统日志展示

### 6. 项目工作台 (Workspace)

- **项目选择**: 当前通过前端适配层提供项目列表
- **文件树**: 浏览项目结构并打开文件
- **多标签编辑器**: Monaco 驱动的多文件编辑体验
- **文件操作**: 新建、重命名、删除
- **控制台**: 历史日志 + 预留交互终端接入位

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:3000` 查看应用。

### 生产构建

```bash
npm run build
```

构建产物将生成在 `dist` 目录。

### 预览构建

```bash
npm run preview
```

## 当前集成状态

### 已完成

- [x] 以 `frontend/` 作为新的主前端工程
- [x] 梳理老前端可迁移能力，并形成实施方案：`FRONTEND_INTEGRATION_PLAN.md`
- [x] 将拓扑编辑核心结构迁入新前端
- [x] 在 `Intent` 页接入项目上下文智能体
- [x] 新增 `Workspace` 工作台页
- [x] 增加前端 API 适配层：`workspaceApi`、`agentApi`
- [x] 补充 `Workspace` / `Agent` / `Terminal` 后端接口契约文档
- [x] 为 `Workspace` 增加文件新建、重命名、删除与控制台面板

### 当前限制

- [ ] `Workspace` 项目/文件数据目前仍由前端本地 mock 适配层托管
- [ ] 项目上下文智能体当前仍兼容老的 `/api/chat/stream` 接口
- [ ] 工作台交互终端 WebSocket 尚未由后端实现
- [ ] 旧前端的控制面操作页尚未迁移
- [ ] 文件上传、移动、下载等能力尚未并入新工作台

## 后续 TODO

### 1. 后端接入

- [ ] 实现 `GET /api/workspace/projects`
- [ ] 实现 `GET /api/workspace/projects/{projectId}/files`
- [ ] 实现 `GET/PUT/PATCH/DELETE /api/workspace/files/{fileId}`
- [ ] 实现 `POST /api/agent/project-assistant/stream`
- [ ] 实现 `WS /ws/workspace/terminal`

### 2. 工作台增强

- [ ] 增加文件上传、移动、下载能力
- [ ] 增加工作台终端多标签会话
- [ ] 增加项目级编译、部署、日志入口
- [ ] 将工作台当前文件上下文和拓扑上下文进一步联动

### 3. 智能体增强

- [ ] 将项目上下文智能体切换到 ParaNet 原生 Agent 接口
- [ ] 支持工具调用过程更细粒度展示
- [ ] 支持从当前文件一键生成 DSL / 编译建议

### 4. 业务模块迁移

- [ ] 评估并迁移旧前端 `ControlPlane` 为独立业务页
- [ ] 按需抽取旧前端的文件管理与终端交互细节
- [ ] 继续补齐拓扑与意图编程之间的双向联动

### 5. 优化与完善

- [ ] 响应式布局适配
- [ ] 暗色主题支持
- [ ] 性能优化
- [ ] E2E 测试

## 与后端 API 对接

前端当前通过 RESTful API、WebSocket 和适配层与后端通信：

- **REST API**: 拓扑 CRUD、意图编译、部署操作
- **WebSocket**: 实时遥测数据、部署进度推送、告警通知
- **适配层**: `workspaceApi` 和 `agentApi` 用于承接旧接口语义到新接口语义的过渡

推荐进一步阅读：

- 集成实施方案：`frontend/FRONTEND_INTEGRATION_PLAN.md`
- 接口契约文档：`docs/rebuild-context/04-workspace-agent-api-contract.md`
