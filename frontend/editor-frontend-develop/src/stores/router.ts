import { deepClone } from '@renzp/utils'
import { RouteObject, useLocation, useParams } from 'react-router-dom'
import { create } from 'zustand'

import { fetchAuths } from '@/api/v1/sys'
import { UserInfoModel } from '@/model/v1/sys'
import { RouteModel, getUserRoutes } from '@/router'
import { BUTTON_KEY } from '@/utils/constants'
import { useShallow } from 'zustand/shallow'
import { routes } from '../router'
import userInfoStore from './user'

export interface RouterStore {
  buttonKeys: string[]
  clear: () => void
  collapsed: boolean
  firstPath: string
  getUserAuths: () => void
  loading: boolean
  menus: RouteModel[]
  setCollapsed: (value: boolean) => void
  setLoading: (status: boolean) => void
  userAuths: RouteModel[]
  userRoutes: RouteObject[]
}

/**
 * 递归过滤掉除路由之外的数据
 * Tips: 此操作会改变数据源的children
 * @param item 权限数据
 * @returns true/false
 */
export const deepFilterHidden = (item: RouteModel) => {
  if (item?.children?.length) {
    item.children = item.children.filter(deepFilterHidden)
  }

  return !item.hidden
}

const useRouterStore = create<RouterStore>()(set => ({
  buttonKeys: [],
  clear: () => {
    set({ firstPath: '', menus: [], userAuths: [], userRoutes: [] })
  },
  collapsed: false,
  firstPath: '',
  getUserAuths: async () => {
    set({ loading: false })
    // mock start
    const [userRoutes, firstPath] = getUserRoutes(routes)
    const menus = deepClone(routes).filter(deepFilterHidden)
    set({ firstPath, loading: false, menus, userAuths: routes, userRoutes })
    // mock end
  },
  loading: true,
  menus: [],
  setCollapsed: (collapsed: boolean) => {
    set({ collapsed })
  },
  setLoading: (status: boolean) => set({ loading: status }),
  userAuths: [],
  userRoutes: [],
}))

/**
 * 获取当前页面按钮权限
 * @param path 当前路由地址，默认获取location.pathname，如果页面路径是/:xxx的需要自行处理传入
 * @returns 返回一个数组，数组第一个元素是判断是否有权限的函数，第二个元素是按钮权限数组
 */
export const useButtonAuth = (): [(key: BUTTON_KEY) => boolean, string[]] => {
  const location = useLocation()
  const buttonKeys = useRouterStore(useShallow(state => state.buttonKeys))
  // 处理params
  const params = useParams()
  const paramKeys = Object.keys(params)
  let paramsRep = paramKeys.join('/:')
  paramsRep = paramsRep ? `/:${paramsRep}` : ''
  const paramsPath = paramKeys.reduce((prev, curr) => `${prev}/${params[curr]}`, '')
  const key: string = location.pathname.replace(paramsPath, paramsRep)

  const auths = (buttonKeys?.[key as unknown as number] ?? []) as unknown as string[]
  const hasAuth = (key: BUTTON_KEY) => auths.includes(key)

  return [hasAuth, auths]
}
/**
 * 判断路由是否有权限，或者某个按钮是否在指定路由下是否有权限
 * @returns 有权限返回true，否则返回false
 */
export const usePageButtonAuth = () => {
  const [routes, buttonKeys] = useRouterStore(
    useShallow(state => [state.userRoutes, state.buttonKeys]),
  )

  const hasPageButtonAuth = (path: string, buttonKey?: BUTTON_KEY) => {
    if (buttonKey) {
      const pathKeys: string[] = buttonKeys[path as unknown as number] as unknown as string[]
      return pathKeys?.includes(buttonKey) ?? false
    }

    return !!routes.find(item => item.path === path)
  }

  return hasPageButtonAuth
}
export const isSystemAdmin = (userInfo?: UserInfoModel) => {
  return !!userInfo?.roleList?.find?.(item => item.id < 0)
}
export const useButtonDealAuth = () => {
  const userInfo = userInfoStore(useShallow(state => state.userInfo))
  const hasButtonDealAuth = (record: any) => {
    const sysadmin = isSystemAdmin(userInfo)
    return sysadmin || record?.createBy === userInfo?.userId
  }

  return hasButtonDealAuth
}

export default useRouterStore
