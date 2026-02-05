import { Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import React, { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useShallow } from 'zustand/shallow'

import { menuRoutes } from '@/router'
import DynamicIcon from '@/components/common/DynamicIcon'
import useSystemStore from '@/stores/system'

import styles from './index.module.less'

const { Sider } = Layout

type MenuItem = Required<MenuProps>['items'][number]

const PageSider: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  const collapsed = useSystemStore(useShallow((state) => state.collapsed))

  // 生成菜单项
  const menuItems: MenuItem[] = useMemo(() => {
    return menuRoutes
      .filter((route) => !route.hidden)
      .map((route) => ({
        key: route.path,
        icon: route.icon ? <DynamicIcon name={route.icon} /> : null,
        label: route.title,
      }))
  }, [])

  // 当前选中的菜单项
  const selectedKeys = useMemo(() => {
    const path = location.pathname
    const matchedRoute = menuRoutes.find((route) => path.startsWith(route.path))
    return matchedRoute ? [matchedRoute.path] : []
  }, [location.pathname])

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className={styles.sider}
      width={220}
      collapsedWidth={80}
    >
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        items={menuItems}
        onClick={handleMenuClick}
        className={styles.menu}
      />
    </Sider>
  )
}

export default PageSider
