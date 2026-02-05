# ParaNet 前端架构文档

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **UI 组件库**: Ant Design 5
- **状态管理**: Zustand 5
- **路由**: React Router DOM 7
- **样式**: CSS Modules + Less
- **HTTP 客户端**: Axios

## 目录结构

```
src/
├── api/                    # API 请求层
│   ├── axios.ts            # Axios 配置与拦截器
│   ├── auth.ts             # 认证相关 API
│   ├── topology.ts         # 拓扑管理 API
│   ├── intent.ts           # 意图编程 API
│   ├── deploy.ts           # 部署管理 API
│   └── monitor.ts          # 监控中心 API
├── assets/                 # 静态资源
├── components/             # 通用组件
│   └── common/             # 基础组件
│       ├── AntdConfigProvider/  # Ant Design 配置
│       ├── AuthRoute/           # 路由守卫
│       ├── CenterSpin/          # 居中加载
│       └── DynamicIcon/         # 动态图标
├── layout/                 # 布局组件
│   ├── PageLayout/         # 主布局
│   ├── PageHeader/         # 页面头部
│   └── PageSider/          # 侧边栏
├── model/                  # 类型定义
│   ├── user.ts             # 用户类型
│   ├── topology.ts         # 拓扑类型
│   ├── intent.ts           # 意图类型
│   └── monitor.ts          # 监控类型
├── pages/                  # 页面组件
│   ├── Login/              # 登录页
│   ├── Dashboard/          # 仪表盘
│   ├── Topology/           # 拓扑管理
│   ├── Intent/             # 意图编程
│   ├── Deploy/             # 部署管理
│   ├── Monitor/            # 监控中心
│   └── NotFound/           # 404 页面
├── router/                 # 路由配置
│   └── index.tsx           # 路由定义
├── stores/                 # Zustand 状态管理
│   ├── user.ts             # 用户状态
│   └── system.ts           # 系统状态
├── styles/                 # 全局样式
│   └── global.less         # 全局样式定义
├── utils/                  # 工具函数
│   ├── storage.ts          # 本地存储工具
│   └── index.ts            # 通用工具函数
├── App.tsx                 # 应用根组件
└── main.tsx                # 应用入口
```

## 核心功能模块

### 1. 认证与路由

- **路由守卫**: `AuthRoute` 组件检查用户登录状态
- **Token 管理**: 使用 LocalStorage 存储 JWT Token
- **自动跳转**: 未登录用户自动跳转到登录页

### 2. 状态管理

使用 Zustand 进行状态管理，主要的 Store 包括：

- **UserStore**: 用户信息、登录/登出
- **SystemStore**: 系统设置（侧边栏状态、主题模式）

### 3. API 层设计

所有 API 请求统一通过 `axios` 实例，具备：

- **请求拦截**: 自动添加 Authorization Header
- **响应拦截**: 统一处理错误码和消息提示
- **类型安全**: 完整的 TypeScript 类型定义

### 4. 布局系统

采用经典的后台管理布局：

```
┌─────────────────────────────────────┐
│         PageHeader (顶部导航)         │
├──────────┬──────────────────────────┤
│          │                          │
│ PageSider│   PageContent (主内容)   │
│ (侧边栏) │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

## 开发规范

### 组件命名

- **页面组件**: PascalCase (如 `Dashboard`)
- **通用组件**: PascalCase (如 `CenterSpin`)
- **工具函数**: camelCase (如 `formatDateTime`)

### 样式规范

- 使用 CSS Modules 避免样式冲突
- 文件命名: `index.module.less`
- 类名使用 camelCase

### API 调用

```typescript
import { topologyApi } from '@/api'

// 获取列表
const { data } = await topologyApi.getList({ pageNo: 1, pageSize: 10 })

// 创建拓扑
await topologyApi.create({ name: 'My Topology', nodes: [], links: [] })
```

### 状态管理

```typescript
import useUserStore from '@/stores/user'
import { useShallow } from 'zustand/shallow'

// 单个状态
const token = useUserStore((state) => state.token)

// 多个状态（使用 shallow 优化）
const [userInfo, logout] = useUserStore(
  useShallow((state) => [state.userInfo, state.logout])
)
```

## 环境配置

### 开发环境

- 端口: `3000`
- API 代理: `/api` -> `http://localhost:8000`
- WebSocket 代理: `/ws` -> `ws://localhost:8000`

### 生产环境

修改 `vite.config.ts` 中的 `server.proxy` 配置以适配实际的后端地址。

## 下一步计划

### Phase 2: 拓扑可视化模块 (待实施)

- [ ] 集成 AntV X6
- [ ] 实现拓扑编辑器
- [ ] 节点/链路 CRUD 操作
- [ ] 拓扑导入/导出

### Phase 3: 意图编程界面 (待实施)

- [ ] 集成 Monaco Editor
- [ ] DSL 语法高亮
- [ ] 自然语言输入组件
- [ ] 编译结果预览

### Phase 4: 部署管理模块 (待实施)

- [ ] 部署向导
- [ ] 配置预览
- [ ] WebSocket 实时进度
- [ ] 回滚操作

### Phase 5: 监控中心 (待实施)

- [ ] 集成 ECharts
- [ ] 实时指标图表
- [ ] 告警管理
- [ ] 终端日志查看

## 性能优化建议

1. **代码分割**: 使用动态 import() 进行路由级别的代码分割
2. **组件懒加载**: 使用 React.lazy() + Suspense
3. **列表虚拟化**: 长列表使用 react-window 或 react-virtualized
4. **图片优化**: 使用 WebP 格式，添加 lazy loading
5. **状态管理**: 合理使用 Zustand 的 shallow 比较

## 常见问题

### Q: 如何添加新的 API 接口？

1. 在 `src/model` 中定义类型
2. 在 `src/api` 中创建对应的 API 模块
3. 导出到 `src/api/index.ts`

### Q: 如何添加新的菜单项？

在 `src/router/index.tsx` 的 `menuRoutes` 数组中添加新的路由配置。

### Q: 如何自定义 Ant Design 主题？

修改 `src/components/common/AntdConfigProvider/index.tsx` 中的 `theme` 配置。
