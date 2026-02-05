# ParaNet 前端项目结构

## 项目概览

ParaNet 前端是一个基于 React 19 + TypeScript + Vite 构建的现代化 Web 应用，用于提供意图驱动网络管理的可视化界面。

## 技术栈

- **框架**: React 19
- **语言**: TypeScript 5.7
- **构建工具**: Vite 6
- **UI 组件库**: Ant Design 5
- **状态管理**: Zustand 5
- **路由**: React Router DOM 7
- **HTTP 客户端**: Axios
- **样式**: Less + CSS Modules

## 目录结构

```
frontend/
├── public/                    # 静态资源
│   └── favicon.svg           # 网站图标
├── src/
│   ├── api/                  # API 请求层
│   │   ├── axios.ts          # Axios 配置和拦截器
│   │   ├── auth.ts           # 认证 API
│   │   ├── topology.ts       # 拓扑 API
│   │   ├── intent.ts         # 意图 API
│   │   ├── deploy.ts         # 部署 API
│   │   ├── monitor.ts        # 监控 API
│   │   └── index.ts          # API 统一导出
│   ├── assets/               # 资源文件（预留）
│   ├── components/           # 组件
│   │   └── common/           # 通用组件
│   │       ├── AntdConfigProvider/  # Ant Design 配置
│   │       ├── AuthRoute/           # 路由守卫
│   │       ├── CenterSpin/          # 居中加载
│   │       └── DynamicIcon/         # 动态图标
│   ├── hooks/                # 自定义 Hooks
│   │   ├── useWebSocket.ts   # WebSocket Hook
│   │   ├── useDebounce.ts    # 防抖 Hook
│   │   ├── useLocalStorage.ts # LocalStorage Hook
│   │   └── index.ts
│   ├── layout/               # 布局组件
│   │   ├── PageLayout/       # 页面整体布局
│   │   ├── PageHeader/       # 顶部导航栏
│   │   └── PageSider/        # 侧边栏菜单
│   ├── model/                # 数据模型/类型定义
│   │   ├── user.ts           # 用户模型
│   │   ├── topology.ts       # 拓扑模型
│   │   ├── intent.ts         # 意图模型
│   │   └── monitor.ts        # 监控模型
│   ├── pages/                # 页面组件
│   │   ├── Login/            # 登录页
│   │   ├── Dashboard/        # 仪表盘
│   │   ├── Topology/         # 拓扑管理
│   │   ├── Intent/           # 意图编程
│   │   ├── Deploy/           # 部署管理
│   │   ├── Monitor/          # 监控中心
│   │   └── NotFound/         # 404 页面
│   ├── router/               # 路由配置
│   │   └── index.tsx         # 路由定义和配置
│   ├── stores/               # Zustand 状态管理
│   │   ├── user.ts           # 用户状态
│   │   ├── system.ts         # 系统状态
│   │   └── index.ts
│   ├── styles/               # 全局样式
│   │   └── global.less       # 全局样式定义
│   ├── utils/                # 工具函数
│   │   └── index.ts          # 工具函数集合
│   ├── App.tsx               # 应用入口组件
│   └── main.tsx              # 应用入口文件
├── .eslintrc.cjs             # ESLint 配置
├── .gitignore                # Git 忽略文件
├── index.html                # HTML 入口
├── package.json              # 项目依赖
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 配置
└── vite-env.d.ts             # Vite 环境类型定义
```

## 核心功能模块

### 1. 用户认证
- 登录/登出
- 路由守卫
- Token 管理

### 2. 拓扑管理
- 拓扑列表 CRUD
- 拓扑导入/导出
- 拓扑可视化编辑（待集成 AntV X6）

### 3. 意图编程
- DSL 代码编辑（待集成 Monaco Editor）
- 自然语言输入
- 意图编译和部署

### 4. 部署管理
- 部署任务管理
- 部署进度跟踪
- 配置回滚

### 5. 监控中心
- 实时告警展示
- 系统健康度监控
- 指标图表（待集成 ECharts）

## 开发指南

### 环境要求
- Node.js >= 18
- npm >= 9 或 pnpm >= 8

### 安装依赖
```bash
cd frontend
npm install
```

### 开发模式
```bash
npm run dev
```
访问 http://localhost:3000

### 生产构建
```bash
npm run build
```

### 预览构建
```bash
npm run preview
```

## 状态管理

使用 Zustand 进行状态管理，主要包括：
- `useUserStore`: 用户认证和信息
- `useSystemStore`: 系统配置（主题、侧边栏状态等）

## API 通信

### 基础配置
- Base URL: `/api`
- 超时时间: 30s
- 自动添加 Authorization Header
- 统一错误处理

### API 模块
- `authApi`: 认证相关
- `topologyApi`: 拓扑管理
- `intentApi`: 意图编程
- `deployApi`: 部署管理
- `monitorApi`: 监控数据

## 代码规范

- 使用 TypeScript 进行类型检查
- 使用 ESLint 进行代码检查
- 组件使用函数式组件 + Hooks
- 样式使用 CSS Modules + Less

## 后续开发计划

### Phase 2: 拓扑可视化
- [ ] 集成 AntV X6
- [ ] 实现拓扑编辑器
- [ ] 设备图标库

### Phase 3: 意图编程界面
- [ ] 集成 Monaco Editor
- [ ] DSL 语法高亮
- [ ] 自然语言交互

### Phase 4: 部署管理
- [ ] WebSocket 实时推送
- [ ] 部署向导
- [ ] 配置预览

### Phase 5: 监控中心
- [ ] 集成 ECharts
- [ ] 实时数据可视化
- [ ] 集成 xterm.js

### Phase 6: 优化完善
- [ ] 暗色主题
- [ ] 响应式布局优化
- [ ] 性能优化
- [ ] 单元测试
