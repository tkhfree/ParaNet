import { 
  Layout, 
  Space, 
  Avatar, 
  Dropdown, 
  Button,
  Typography 
} from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/shallow'

import useUserStore from '@/stores/user'
import useSystemStore from '@/stores/system'

import styles from './index.module.less'

const { Header } = Layout
const { Text } = Typography

const PageHeader: React.FC = () => {
  const navigate = useNavigate()
  
  const [userInfo, logout] = useUserStore(
    useShallow((state) => [state.userInfo, state.logout])
  )
  
  const [collapsed, toggleCollapsed, themeMode, toggleThemeMode] = useSystemStore(
    useShallow((state) => [
      state.collapsed,
      state.toggleCollapsed,
      state.themeMode,
      state.toggleThemeMode,
    ])
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout()
    }
  }

  return (
    <Header className={styles.header}>
      <div className={styles.left}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapsed}
          className={styles.trigger}
        />
        <div className={styles.logo}>
          <span className={styles.logoText}>ParaNet</span>
          <Text type="secondary" className={styles.slogan}>
            意图驱动网络管理平台
          </Text>
        </div>
      </div>

      <div className={styles.right}>
        <Space size={16}>
          <Button
            type="text"
            icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleThemeMode}
            className={styles.iconButton}
            title={themeMode === 'dark' ? '切换为浅色' : '切换为深色'}
          />
          <Button 
            type="text" 
            icon={<BellOutlined />} 
            className={styles.iconButton}
          />
          
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleMenuClick }}
            placement="bottomRight"
          >
            <Space className={styles.userInfo}>
              <Avatar 
                size="small" 
                icon={<UserOutlined />}
                src={userInfo?.avatar}
              />
              <span className={styles.username}>
                {userInfo?.username || '用户'}
              </span>
            </Space>
          </Dropdown>
        </Space>
      </div>
    </Header>
  )
}

export default PageHeader
