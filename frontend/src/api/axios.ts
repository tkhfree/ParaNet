import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { message } from '@/App'

const TOKEN_KEY = 'paranet_token'

// 创建 axios 实例
const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 处理未授权，跳转登录
const handleUnauthorized = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('paranet_user')
  window.location.href = '/login'
}

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response
    
    // 处理 Blob 类型响应（文件下载）
    if (response.data instanceof Blob) {
      return response
    }

    // 统一处理业务错误码
    if (data.code !== 0 && data.code !== 200) {
      // 401 未授权
      if (data.code === 401) {
        handleUnauthorized()
        return Promise.reject(new Error('未授权，请重新登录'))
      }

      // 显示错误消息
      const showError = (response.config as any)?._showErrorMessage !== false
      if (showError && data.message) {
        message?.error(data.message)
      }

      return Promise.reject(new Error(data.message || '请求失败'))
    }

    return data as any
  },
  (error) => {
    // HTTP 错误处理
    if (error.response) {
      const { status, config } = error.response
      
      if (status === 401) {
        handleUnauthorized()
        return Promise.reject(new Error('未授权，请重新登录'))
      }

      if (status === 403) {
        message?.error('没有权限访问该资源')
        return Promise.reject(new Error('没有权限'))
      }

      if (status === 404) {
        message?.error(`接口不存在: ${config?.url}`)
        return Promise.reject(new Error('接口不存在'))
      }

      if (status === 500) {
        message?.error('服务器内部错误')
        return Promise.reject(new Error('服务器错误'))
      }

      if (status >= 500) {
        message?.error('服务暂不可用，请稍后重试')
        return Promise.reject(new Error('服务不可用'))
      }
    }

    // 网络错误
    if (error.message?.includes('Network Error')) {
      message?.error('网络连接失败，请检查网络')
      return Promise.reject(new Error('网络错误'))
    }

    // 超时错误
    if (error.message?.includes('timeout')) {
      message?.error('请求超时，请稍后重试')
      return Promise.reject(new Error('请求超时'))
    }

    return Promise.reject(error)
  }
)

// API 响应类型
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

// 分页响应类型
export interface PaginatedResponse<T> {
  records: T[]
  total: number
  pageNo: number
  pageSize: number
}

// 分页参数
export interface PaginationParams {
  pageNo?: number
  pageSize?: number
}

export default instance
