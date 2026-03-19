import type { MessageInstance } from 'antd/es/message/interface'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm'
import type { NotificationInstance } from 'antd/es/notification/interface'

import {
  App as antdApp,
  message as antdMessage,
  Modal as antdModal,
  notification as antdNotification,
} from 'antd'
import React from 'react'
import { useEffect, useRef } from 'react'
import { RouterProvider, createHashRouter } from 'react-router-dom'

import userInfoStore from '@/stores/user'
import { useShallow } from 'zustand/shallow'
import { CenterSpin } from './components'
import { mergeUserRoutes } from './router'
import useRouterStore from './stores/router'

let message: MessageInstance = antdMessage
let notification: NotificationInstance = antdNotification
let modal: Omit<ModalStaticFunctions, 'warn'> = antdModal

const App = () => {
  const staticFunctions = antdApp.useApp()
  message = staticFunctions.message
  notification = staticFunctions.notification
  modal = staticFunctions.modal

  const [token, refreshUserInfo] = userInfoStore(
    useShallow(state => [state.token, state.refreshUserInfo]),
  )
  const [loading, setLoading, userRoutes, getUserAuths] = useRouterStore(
    useShallow(state => [state.loading, state.setLoading, state.userRoutes, state.getUserAuths]),
  )
  // 此处将信息请求缓存，防止useEffect进入死循环
  const refreshWebData = useRef(() => {
    // refreshUserInfo()
    getUserAuths()
  })

  useEffect(() => {
    refreshWebData.current()
    // const isLoginPage = window?.location?.hash === '#/login'
    // if (!isLoginPage && token) {
    //   refreshWebData.current()
    // } else {
    //   setLoading(false)
    // }
  }, [token, setLoading])

  const routes = mergeUserRoutes(userRoutes)
  const router = createHashRouter(routes)

  return !loading ? <RouterProvider router={router} /> : <CenterSpin />
}

export default App
export { message, modal, notification }
