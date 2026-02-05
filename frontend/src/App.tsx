import type { MessageInstance } from 'antd/es/message/interface'
import type { ModalStaticFunctions } from 'antd/es/modal/confirm'
import type { NotificationInstance } from 'antd/es/notification/interface'

import {
  App as AntdApp,
  message as antdMessage,
  Modal as antdModal,
  notification as antdNotification,
} from 'antd'
import { useEffect } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useShallow } from 'zustand/shallow'

import { CenterSpin } from '@/components/common/CenterSpin'
import useUserStore from '@/stores/user'
import { routes } from '@/router'

// 导出全局消息/通知/模态框实例，供非组件环境使用
let message: MessageInstance = antdMessage
let notification: NotificationInstance = antdNotification
let modal: Omit<ModalStaticFunctions, 'warn'> = antdModal

const App = () => {
  const staticFunctions = AntdApp.useApp()
  message = staticFunctions.message
  notification = staticFunctions.notification
  modal = staticFunctions.modal

  const [loading, initUser] = useUserStore(
    useShallow((state) => [state.loading, state.initUser])
  )

  useEffect(() => {
    initUser()
  }, [initUser])

  const router = createBrowserRouter(routes)

  if (loading) {
    return <CenterSpin />
  }

  return <RouterProvider router={router} />
}

export default App
export { message, modal, notification }
