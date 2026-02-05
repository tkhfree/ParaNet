import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useUserStore from '@/stores/user'

interface AuthRouteProps {
  children: React.ReactNode
}

const AuthRoute: React.FC<AuthRouteProps> = ({ children }) => {
  const token = useUserStore((state) => state.token)
  const location = useLocation()

  // 如果未登录，重定向到登录页
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default AuthRoute
