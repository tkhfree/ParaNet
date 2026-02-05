import axios from './axios'
import type { ApiResponse, PaginatedResponse, PaginationParams } from './axios'

export interface Deployment {
  id: string
  intentId: string
  topologyId: string
  status: DeploymentStatus
  progress: number
  logs: DeploymentLog[]
  createdAt: string
  completedAt?: string
}

export type DeploymentStatus = 
  | 'pending' 
  | 'validating' 
  | 'deploying' 
  | 'completed' 
  | 'failed' 
  | 'rolled_back'

export interface DeploymentLog {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  nodeId?: string
}

export interface DeployRequest {
  intentId: string
  topologyId: string
  dryRun?: boolean
}

export const deployApi = {
  // 获取部署列表
  getList: (params?: PaginationParams) => {
    return axios.get<PaginationParams, ApiResponse<PaginatedResponse<Deployment>>>(
      '/deployments',
      { params }
    )
  },

  // 获取部署详情
  getById: (id: string) => {
    return axios.get<void, ApiResponse<Deployment>>(`/deployments/${id}`)
  },

  // 创建部署
  deploy: (data: DeployRequest) => {
    return axios.post<DeployRequest, ApiResponse<Deployment>>('/deployments', data)
  },

  // 获取部署日志
  getLogs: (id: string) => {
    return axios.get<void, ApiResponse<DeploymentLog[]>>(`/deployments/${id}/logs`)
  },

  // 回滚部署
  rollback: (id: string) => {
    return axios.post<void, ApiResponse<Deployment>>(`/deployments/${id}/rollback`)
  },

  // 取消部署
  cancel: (id: string) => {
    return axios.post<void, ApiResponse<void>>(`/deployments/${id}/cancel`)
  },

  // 预览部署配置
  preview: (data: DeployRequest) => {
    return axios.post<DeployRequest, ApiResponse<{ configs: Record<string, unknown> }>>(
      '/deployments/preview',
      data
    )
  },
}
