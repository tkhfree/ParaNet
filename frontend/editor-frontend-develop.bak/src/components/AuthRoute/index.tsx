import React from 'react'
import { Navigate, useMatch } from 'react-router-dom'

import storage, { TOKEN } from '@/utils/storage'

export interface AuthRouteProps {
  children: React.ReactNode
}

const AuthRoute = (props: AuthRouteProps) => {
  const isLogin = storage.get(TOKEN)
  const isLoginPath = useMatch('/project-manage')

  if (!isLogin && !isLoginPath) {
    return <Navigate replace to="/project-manage" />
  }

  return <>{props.children}</>
}

export default AuthRoute
