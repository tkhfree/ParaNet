import type { RouteObject } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { CenterSpin } from '@/components/common/CenterSpin'
import PageLayout from '@/layout/PageLayout'
import AuthRoute from '@/components/common/AuthRoute'

// 懒加载页面组件
const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Develop = lazy(() => import('@/pages/Develop'))
const Compile = lazy(() => import('@/pages/Compile'))
const Deploy = lazy(() => import('@/pages/Deploy'))
const Monitor = lazy(() => import('@/pages/Monitor'))
const Poly = lazy(() => import('@/pages/Poly'))
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
    path: '/develop',
    title: '模态开发',
    icon: 'CodeOutlined',
  },
  {
    path: '/compile',
    title: '模态编译',
    icon: 'CodeSandboxOutlined',
  },
  {
    path: '/deploy',
    title: '模态部署',
    icon: 'CloudUploadOutlined',
  },
  {
    path: '/monitor',
    title: '监控中心',
    icon: 'MonitorOutlined',
  },
  {
    path: '/poly',
    title: '协议设计',
    icon: 'ExperimentOutlined',
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
        path: 'develop',
        element: LazyLoad(Develop),
      },
      {
        path: 'compile',
        element: LazyLoad(Compile),
      },
      {
        path: 'deploy',
        element: LazyLoad(Deploy),
      },
      {
        path: 'topology',
        element: <Navigate to="/develop" replace />,
      },
      {
        path: 'intent',
        element: <Navigate to="/compile" replace />,
      },
      {
        path: 'monitor',
        element: LazyLoad(Monitor),
      },
      {
        path: 'poly',
        element: LazyLoad(Poly),
      },
    ],
  },
  {
    path: '*',
    element: LazyLoad(NotFound),
  },
]
