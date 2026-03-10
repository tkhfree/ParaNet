# 前端集成实施方案

## 目标

以新的 `frontend` 作为主工程，按“高可行性”路线吸收老前端 `editor-frontend-develop` 的可复用能力，避免把旧工程壳子、动态权限路由和历史接口模型直接带入新界面。

## 总体策略

1. 保留新前端现有的 `Vite + React Router + Zustand + API` 主架构。
2. 抽取老前端的“能力模块”，优先迁移与当前 ParaNet 场景最接近的功能。
3. 通过新的前端 API 适配层封装老接口能力，前端页面不再直接依赖旧接口命名。
4. 对后端尚未具备的新接口，在前端适配层使用本地 mock / 兼容调用占位，并记录后续后端改造点。

## 可迁移能力清单

| 能力 | 老前端来源 | 迁移策略 | 当前状态 |
| --- | --- | --- | --- |
| 拓扑编辑器 | `ProjectManage/Topology` | 已按组件级拆分迁入新前端，继续补功能 | 已迁入核心结构 |
| 上下文智能体对话 | `ProjectManage/AgentChat` | 迁入新 `Intent` 页，复用项目/文件上下文与流式工具消息展示 | 本轮实施 |
| 项目文件管理 | `ProjectManage/ProjectTree` | 新建 `Workspace` 工作台页，以新 store + API 适配层实现 | 本轮实施 |
| 多标签代码编辑 | `ProjectManage` 标签页 + Monaco | 新建 IDE 壳子页内实现，不复用旧布局壳子 | 本轮实施 |
| 终端 / 日志 | `ProjectManage/Terminals` | 后续并入 `Monitor` 或 `Workspace` | 待下一阶段 |
| 控制面操作 | `ControlPlane` | 待后端资源模型明确后再迁移为独立业务页 | 暂缓 |
| 旧权限路由 / 按钮权限 | `stores/router` | 不迁移，保留新前端静态路由方案 | 放弃 |
| 旧 Pro 组件库 | `components/Pro*` | 仅按需抽取，不整库迁移 | 暂不迁移 |

## 本轮实施范围

### 1. 新建 `Workspace` 项目工作台

提供一个轻量 IDE 壳子，承接：

- 项目列表选择
- 文件树浏览
- 多标签编辑
- 当前项目 / 当前文件上下文同步

当前阶段优先保证：

- 前端信息流和交互壳子可运行
- 文件内容可编辑 / 保存
- 与智能体页共享上下文

### 2. 智能体页接入项目上下文

在新 `Intent` 页新增“项目上下文智能体”区域，承接老 `AgentChat` 的核心能力：

- 自动携带当前项目名 / 项目 ID
- 自动携带当前文件名 / 文件 ID
- 自动携带当前文件内容
- 支持流式回复与工具调用过程展示

同时保留现有“自然语言转 DSL”能力，避免把 DSL 生成与项目助手混为一个接口。

### 3. API 适配层统一封装

新增适配层模块：

- `src/api/workspace.ts`
- `src/api/agent.ts`

目标：

- 前端页面只依赖新语义接口
- 老接口语义通过适配层兼容
- 后端未就绪时通过本地 mock 先打通前端信息流

## 后端待改进接入点

### Workspace 能力

| 前端语义接口 | 老接口来源 | 建议后端目标接口 | 当前前端状态 |
| --- | --- | --- | --- |
| `listProjects()` | `/project/projectList` | `GET /workspace/projects` | 本地 mock 适配 |
| `createProject()` | `/project/createProject` | `POST /workspace/projects` | 本地 mock 适配 |
| `listFiles(projectId)` | `/file/tree/{projectId}` | `GET /workspace/projects/:id/files` | 本地 mock 适配 |
| `readFile(fileId)` | `/file/readFile/{fileId}` | `GET /workspace/files/:id` | 本地 mock 适配 |
| `saveFile(fileId)` | `/file/updateFileContent` | `PUT /workspace/files/:id` | 本地 mock 适配 |
| `createFile()` | `/file/createFile` | `POST /workspace/files` | 本地 mock 适配 |

### 智能体上下文能力

| 前端语义接口 | 老接口来源 | 建议后端目标接口 | 当前前端状态 |
| --- | --- | --- | --- |
| `streamProjectAssistant()` | `/api/chat/stream` | `POST /agent/project-assistant/stream` | 兼容老流式接口 |
| `sendProjectAssistantMessage()` | `/chat/message` | `POST /agent/project-assistant/message` | 暂未启用 |

## 后续建议

1. 后端完成 `workspace/*` 资源模型后，将 `workspace.ts` 从 local mock 切到真实 HTTP。
2. 将 `Workspace` 中的当前文件上下文接入后续终端、编译、部署记录。
3. 在 `Intent` 页中增加“引用当前文件生成 DSL”的快捷动作。
4. 当后端稳定后，再考虑迁移 `ControlPlane` 为独立业务模块。
