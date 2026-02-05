import React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { login, loginMajor } from '@/api/v1/sys'
import userInfoStore from '@/stores/user'
import LoginForm, { type LoginFormFields } from './LoginForm'
import { removeRememberInfo, setRememberInfo } from './Remember'

import { MajorModel } from '@/model/v1/sys'
import useRouterStore from '@/stores/router'
import { isUnDef } from '@renzp/utils'
import { Button, Radio, message } from 'antd'
import { useShallow } from 'zustand/shallow'
import classes from './index.module.less'

const Login = () => {
  const [loading, setLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [allMajor, setAllMajor] = useState<MajorModel[]>([])
  const [major, setMajor] = useState<number | undefined>(undefined)
  const [show, setShow] = useState<boolean>(false)

  const setUserInfo = userInfoStore(useShallow(state => state.setUserInfo))

  const [refreshUserInfo] = userInfoStore(useShallow(state => [state.refreshUserInfo]))

  const [getUserAuths] = useRouterStore(useShallow(state => [state.getUserAuths]))
  const navigate = useNavigate()

  /**
   * 账号密码登录
   * @param values
   */
  const onLogin = async (values: LoginFormFields) => {
    const data = {
      token: '1111',
      userInfo: {},
    }
    setUserInfo(data.token, data.userInfo)
    getUserAuths()
    navigate('/project-manage')
  }

  return (
    <div className={classes.login}>
      <div className={classes.container}>
        <h1 className={classes.title}>集成开发系统</h1>
        <LoginForm loading={loading} onFinish={onLogin} />
      </div>
    </div>
  )
}

export default Login
