import axios from './axios'
import type { ApiResponse } from './axios'
import type { LoginRequest, LoginResponse, UserInfo } from '@/model/user'

export const authApi = {
  // 登录
  login: (params: LoginRequest) => {
    return axios.post<LoginRequest, ApiResponse<LoginResponse>>('/auth/login', params)
  },

  // 登出
  logout: () => {
    return axios.post<void, ApiResponse<void>>('/auth/logout')
  },

  // 获取当前用户信息
  getCurrentUser: () => {
    return axios.get<void, ApiResponse<UserInfo>>('/auth/me')
  },

  // 刷新 Token
  refreshToken: () => {
    return axios.post<void, ApiResponse<{ token: string }>>('/auth/refresh')
  },
}
