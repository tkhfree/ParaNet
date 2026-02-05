# ParaNet Web 前端

## 概述

ParaNet 的 Web 展示界面，提供可视化的网络拓扑管理、意图编程和监控功能。

## 技术选型

| 技术 | 选择 | 说明 |
|------|------|------|
| 框架 | React 18+ | 组件化开发，生态丰富 |
| 语言 | TypeScript | 类型安全，提升代码质量 |
| 构建工具 | Vite | 快速开发体验 |
| UI 组件库 | Ant Design / shadcn/ui | 企业级组件库 |
| 状态管理 | Zustand / Redux Toolkit | 轻量级状态管理 |
| 网络拓扑可视化 | vis-network / D3.js / Cytoscape.js | 交互式网络图 |
| API 通信 | Axios / TanStack Query | 数据获取与缓存 |
| WebSocket | Socket.IO Client | 实时遥测数据推送 |

## 规划目录结构

```
frontend/
├── public/                    # 静态资源
├── src/
│   ├── assets/               # 图片、字体等资源
│   ├── components/           # 通用组件
│   │   ├── common/           # 基础组件
│   │   ├── topology/         # 拓扑可视化组件
│   │   ├── editor/           # DSL/意图编辑器
│   │   └── monitoring/       # 监控图表组件
│   ├── pages/                # 页面组件
│   │   ├── Dashboard/        # 仪表盘
│   │   ├── Topology/         # 拓扑管理
│   │   ├── Intent/           # 意图编程
│   │   ├── Deploy/           # 部署管理
│   │   └── Monitor/          # 监控中心
│   ├── hooks/                # 自定义 Hooks
│   ├── services/             # API 服务
│   ├── store/                # 状态管理
│   ├── types/                # TypeScript 类型定义
│   ├── utils/                # 工具函数
│   ├── styles/               # 全局样式
│   ├── App.tsx
│   └── main.tsx
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
- **自然语言输入**: 对话式交互界面
- **DSL 编辑器**: 语法高亮、自动补全
- **意图预览**: 编译结果可视化
- **历史记录**: 意图版本管理

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

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

默认登录账号：
- 管理员: `admin` / `admin123`
- 演示账号: `demo` / `demo123`

### 生产构建

```bash
npm run build
```

构建产物将生成在 `dist` 目录。

### 预览构建

```bash
npm run preview
```

## 开发计划

### Phase 1: 基础框架搭建 ✅
- [x] 初始化 React + TypeScript + Vite 项目
- [x] 配置路由和布局组件
- [x] 集成 UI 组件库
- [x] 配置 API 服务层

### Phase 2: 拓扑可视化
- [ ] 集成网络拓扑可视化库
- [ ] 实现节点/链路的 CRUD 操作
- [ ] 支持拓扑导入导出

### Phase 3: 意图编程界面
- [ ] 实现 DSL 代码编辑器
- [ ] 集成自然语言输入接口
- [ ] 编译结果展示

### Phase 4: 部署与监控
- [ ] 部署流程界面
- [ ] 实时遥测数据展示
- [ ] WebSocket 集成

### Phase 5: 优化与完善
- [ ] 响应式布局适配
- [ ] 暗色主题支持
- [ ] 性能优化
- [ ] E2E 测试

## 与后端 API 对接

前端将通过 RESTful API 和 WebSocket 与后端通信：

- **REST API**: 拓扑 CRUD、意图编译、部署操作
- **WebSocket**: 实时遥测数据、部署进度推送、告警通知
