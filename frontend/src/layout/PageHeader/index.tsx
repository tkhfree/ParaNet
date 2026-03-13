import { 
  Layout, 
  Space, 
  Avatar, 
  Dropdown, 
  Button,
  Typography,
  Select,
  Input,
  Modal,
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
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/shallow'

import useUserStore from '@/stores/user'
import useSystemStore from '@/stores/system'
import useProjectStore from '@/stores/project'

import styles from './index.module.less'

const { Header } = Layout
const { Text } = Typography

const PageHeader: React.FC = () => {
  const navigate = useNavigate()
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectRemark, setProjectRemark] = useState('')
  
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

  const [
    initProjects,
    projectList,
    currentProjectId,
    currentProject,
    selectProject,
    createProject,
    removeProject,
  ] = useProjectStore(
    useShallow((state) => [
      state.init,
      state.projectList,
      state.currentProjectId,
      state.currentProject,
      state.selectProject,
      state.createProject,
      state.removeProject,
    ])
  )

  useEffect(() => {
    initProjects()
  }, [initProjects])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleCreateProject = async () => {
    const trimmedName = projectName.trim()
    if (!trimmedName) return
    await createProject({
      name: trimmedName,
      remark: projectRemark.trim(),
    })
    setProjectModalOpen(false)
    setProjectName('')
    setProjectRemark('')
    navigate('/develop')
  }

  const handleDeleteProject = () => {
    if (!currentProjectId || !currentProject) {
      return
    }

    Modal.confirm({
      title: '确认删除当前项目',
      content: `项目「${currentProject.name}」及其文件、拓扑等上下文将被一并删除，删除后不可恢复。`,
      okText: '删除项目',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await removeProject(currentProjectId)
        navigate('/develop')
      },
    })
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
            网络模态集成开发系统
          </Text>
        </div>
        <div className={styles.projectSwitcher}>
          <Select
            value={currentProjectId ?? undefined}
            placeholder="选择当前项目"
            className={styles.projectSelect}
            options={projectList.map((project) => ({
              value: project.id,
              label: project.name,
            }))}
            onChange={async (value) => {
              await selectProject(value)
            }}
          />
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={() => setProjectModalOpen(true)}
            className={styles.projectActionButton}
          >
            新建项目
          </Button>
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={handleDeleteProject}
            className={`${styles.projectActionButton} ${styles.dangerButton}`}
            disabled={!currentProjectId}
          >
            删除项目
          </Button>
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
      <Modal
        title="新建项目"
        open={projectModalOpen}
        onCancel={() => setProjectModalOpen(false)}
        onOk={handleCreateProject}
        okText="创建"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="请输入项目名称"
          />
          <Input.TextArea
            value={projectRemark}
            onChange={(event) => setProjectRemark(event.target.value)}
            placeholder="请输入项目说明（可选）"
            rows={4}
          />
        </Space>
      </Modal>
    </Header>
  )
}

export default PageHeader
