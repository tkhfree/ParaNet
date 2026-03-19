import type { RouteModel } from './tools'

const routes: RouteModel[] = [
  {
    hidden: false,
    path: '/project-manage',
    component: 'ProjectManage',
    title: '项目管理',
    icon: 'home',
  },
  {
    hidden: false,
    path: '/control-plane',
    component: 'ControlPlane',
    title: '控制面操作',
    icon: 'home',
  },
]

export default routes
