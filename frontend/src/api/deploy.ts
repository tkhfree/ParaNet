import axios from './axios'
import type { ApiResponse, PaginatedResponse, PaginationParams } from './axios'

export type SshConnectionStatusValue = 'pending' | 'connected' | 'failed' | 'skipped'

/** 部署时与各拓扑节点的 SSH 探测结果 */
export interface SshConnectionStatus {
  nodeId: string
  name: string
  host: string
  port: number
  status: SshConnectionStatusValue
  message?: string
}

export interface Deployment {
  id: string
  intentId: string
  /** 与 intentId 同值；部署输入的编译产物记录 id */
  compileArtifactId?: string
  topologyId: string
  projectId?: string | null
  status: DeploymentStatus
  progress: number
  logs: DeploymentLog[]
  /** 按拓扑节点顺序的 SSH 连接状态（与模态开发中设备 SSH 配置对应） */
  sshConnections?: SshConnectionStatus[]
  previewConfig?: import('@/model/deploy').DeploymentPreviewConfig
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
  | 'cancelled'

export interface DeploymentLog {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  nodeId?: string
}

export interface DeployRequest {
  /** 与 intentId 二选一，优先本字段 */
  compileArtifactId: string
  topologyId: string
  projectId?: string | null
  dryRun?: boolean
}

export const deployApi = {
  // 获取部署列表
  getList: (params?: PaginationParams & { projectId?: string }) => {
    return axios.get<typeof params, ApiResponse<PaginatedResponse<Deployment>>>(
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

  // 预览部署配置（返回 IP/NDN/GEO/P4 等）
  preview: (data: DeployRequest) => {
    return axios.post<DeployRequest, ApiResponse<{ configs: import('@/model/deploy').DeploymentPreviewConfig }>>(
      '/deployments/preview',
      data
    )
  },
}
