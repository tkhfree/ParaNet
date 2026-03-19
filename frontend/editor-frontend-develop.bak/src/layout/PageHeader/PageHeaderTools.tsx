import LockIcon from '@/assets/svg/lock.svg'
import { Dropdown, Flex, Space } from 'antd'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { modal } from '@/App'
import LogoutIcon from '@/assets/svg/logout.svg'
import userInfoStore from '@/stores/user'
import storage, { TOKEN } from '@/utils/storage'

import { logout } from '@/api/v1/sys'
import useModal from '@/utils/useModal'
import { CaretDownOutlined } from '@ant-design/icons'
import { useShallow } from 'zustand/shallow'
import ChangePasswordModal from './ChangePasswordModal'
import classes from './index.module.less'

const PageHeaderTools = () => {
  const navigate = useNavigate()
  const [userInfo, clearUserInfo] = userInfoStore(
    useShallow(state => [state.userInfo, state.clear]),
  )
  const changeModal = useModal('修改密码')

  const onLogout = () => {
    modal.confirm({
      onOk: async () => {
        await logout()
        clearUserInfo()
        storage.remove(TOKEN)
        navigate('/login')
      },
      title: '确定退出登录？',
    })
  }

  const onMenuClick = ({ key }: { key: string }) => {
    const methods: any = {
      logout: onLogout,
      changePassword: changeModal.showModal,
    }
    methods?.[key]?.()
  }

  const dropdownMenus = [
    {
      label: '修改密码',
      key: 'changePassword',
      icon: <LockIcon width="16px" height="16px" />,
    },
    {
      icon: <LogoutIcon height="16px" width="16px" />,
      key: 'logout',
      label: '退出系统',
    },
  ]

  return (
    <>
      <Space className={classes.tools} size={24}>
        {/* <Dropdown
          menu={{
            items: dropdownMenus,
            onClick: onMenuClick,
          }}
          placement="bottomRight"
          trigger={['click']}
        >
          <div className={classes.username}>
            <div>{userInfo?.nickname}</div>
            <CaretDownOutlined />
          </div>
        </Dropdown> */}
        <div className={classes.username}>
          <div className={classes.icon}></div>
          <div className={classes.nickname}>{userInfo?.nickname || '用户名'}</div>
          <div className={classes.loginOut} onClick={onLogout}></div>
        </div>
      </Space>
      <ChangePasswordModal
        {...changeModal.modalProps}
        setConfirmLoading={changeModal.setConfirmLoading}
      />
    </>
  )
}

export default PageHeaderTools
