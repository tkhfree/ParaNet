// 用户相关类型定义

export interface UserInfo {
  id: string
  username: string
  email?: string
  avatar?: string
  role: UserRole
  permissions: string[]
  createdAt: string
  lastLoginAt?: string
}

export type UserRole = 'admin' | 'operator' | 'viewer'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: UserInfo
}
