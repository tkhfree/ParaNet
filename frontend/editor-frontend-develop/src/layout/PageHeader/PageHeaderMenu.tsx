import type { RouteModel } from '@/router'

import { ConfigProvider, Menu } from 'antd'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import useRouterStore from '@/stores/router'

import { DynamicIcon } from '@/components'
import { flatten } from '@renzp/utils'
import { ItemType } from 'antd/es/menu/interface'
import { useShallow } from 'zustand/shallow'
import classes from './index.module.less'

const HeaderMenu = () => {
  const [menus, userAuths] = useRouterStore(useShallow(state => [state.menus, state.userAuths]))
  const location = useLocation()
  const navigate = useNavigate()

  const onClick = ({ key }: { key: string }) => {
    // if (key === '/project-manage') {
    //   // 统计大屏 在新标签页中打开
    //   const target = '_blank'
    //   const url = window.location.origin
    //   window.open(`${url}/#/project-manage`, target)
    // } else {
    navigate(key)
    // }
  }

  const menuItems: ItemType[] = getMenuItems(menus)
  let selectedKeys: string[] = [location.pathname]
  const allRoutes = flatten(userAuths, { deepKey: 'children' })
  const currentRoute = allRoutes.find(item => item.path === location.pathname)
  // 如果当前路由的菜单是隐藏的，则通过meta配置activeMenuPath的值来设置高亮路由，否则通过当前路由的path来设置高亮路由
  if (currentRoute?.hidden && currentRoute?.meta) {
    const meta = JSON.parse(currentRoute.meta)
    if (meta?.activeMenuPath) {
      selectedKeys = [meta?.activeMenuPath ?? location.pathname]
    }
  }

  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: { activeBarHeight: 0, itemMarginBlock: 8, itemMarginInline: 8 },
        },
      }}
    >
      <Menu
        className={classes.menu}
        items={menuItems}
        mode="horizontal"
        onClick={onClick}
        selectedKeys={selectedKeys}
        expandIcon={null}
      />
    </ConfigProvider>
  )
}

export default HeaderMenu

const getMenuItems = (routes?: RouteModel[]): ItemType[] => {
  return (
    routes?.map(item => {
      let icon = null
      if (item.icon) {
        icon =
          typeof item.icon === 'string' ? (
            <DynamicIcon name={`menu/${item.icon}`} height="2em" width="2em" />
          ) : (
            item.icon
          )
      }
      return {
        children: item?.children?.length ? getMenuItems(item?.children) : undefined,
        icon,
        key: item.path,
        label: '',
        popupClassName: classes.menuPopup,
        popupOffset: [8, 0],
      }
    }) ?? []
  )
}

// 获取最深层path
const getDeepestPath = (menu: RouteModel): string =>
  menu?.children?.length ? getDeepestPath(menu.children[0]) : menu.path
