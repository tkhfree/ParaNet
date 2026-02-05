import type { RouteObject } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { CenterSpin } from '@/components/common/CenterSpin'
import PageLayout from '@/layout/PageLayout'
import AuthRoute from '@/components/common/AuthRoute'

// 懒加载页面组件
const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Topology = lazy(() => import('@/pages/Topology'))
const Intent = lazy(() => import('@/pages/Intent'))
const Deploy = lazy(() => import('@/pages/Deploy'))
const Monitor = lazy(() => import('@/pages/Monitor'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// 包装懒加载组件
const LazyLoad = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <Suspense fallback={<CenterSpin />}>
    <Component />
  </Suspense>
)

// 路由菜单配置
export interface RouteMenuItem {
  path: string
  title: string
  icon?: string
  hidden?: boolean
}

export const menuRoutes: RouteMenuItem[] = [
  {
    path: '/dashboard',
    title: '仪表盘',
    icon: 'DashboardOutlined',
  },
  {
    path: '/topology',
    title: '拓扑管理',
    icon: 'DeploymentUnitOutlined',
  },
  {
    path: '/intent',
    title: '模态开发智能体',
    icon: 'CodeOutlined',
  },
  {
    path: '/deploy',
    title: '部署管理',
    icon: 'CloudUploadOutlined',
  },
  {
    path: '/monitor',
    title: '监控中心',
    icon: 'MonitorOutlined',
  },
]

// 路由配置
export const routes: RouteObject[] = [
  {
    path: '/login',
    element: LazyLoad(Login),
  },
  {
    path: '/',
    element: (
      <AuthRoute>
        <PageLayout />
      </AuthRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: LazyLoad(Dashboard),
      },
      {
        path: 'topology',
        element: LazyLoad(Topology),
      },
      {
        path: 'intent',
        element: LazyLoad(Intent),
      },
      {
        path: 'deploy',
        element: LazyLoad(Deploy),
      },
      {
        path: 'monitor',
        element: LazyLoad(Monitor),
      },
    ],
  },
  {
    path: '*',
    element: LazyLoad(NotFound),
  },
]
