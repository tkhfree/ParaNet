// 部署相关类型定义（与 api/deploy 对齐，供页面与 store 使用）

/** 部署预览配置：IP / NDN / GEO / P4 */
export interface DeploymentPreviewConfig {
  ip?: Record<string, unknown>
  ndn?: Record<string, unknown>
  geo?: Record<string, unknown>
  p4?: Record<string, unknown>
  [key: string]: Record<string, unknown> | undefined
}

export interface DeploymentPreviewResponse {
  configs: DeploymentPreviewConfig
}

/** WebSocket 进度事件（后端推送） */
export interface DeployProgressEvent {
  deploymentId: string
  status?: string
  progress?: number
  log?: {
    timestamp: string
    level: 'info' | 'warning' | 'error'
    message: string
    nodeId?: string
  }
}
