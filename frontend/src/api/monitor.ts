import axios from './axios'
import type { ApiResponse } from './axios'
import type { 
  NodeMetrics, 
  LinkMetrics, 
  SystemHealth, 
  Alert, 
  AlertRule 
} from '@/model/monitor'

export interface MetricsQuery {
  nodeIds?: string[]
  linkIds?: string[]
  startTime?: number
  endTime?: number
  interval?: number // seconds
}

export const monitorApi = {
  // 获取系统健康状态
  getHealth: () => {
    return axios.get<void, ApiResponse<SystemHealth>>('/monitor/health')
  },

  // 获取节点指标
  getNodeMetrics: (params: MetricsQuery) => {
    return axios.get<MetricsQuery, ApiResponse<NodeMetrics[]>>(
      '/monitor/metrics/nodes',
      { params }
    )
  },

  // 获取链路指标
  getLinkMetrics: (params: MetricsQuery) => {
    return axios.get<MetricsQuery, ApiResponse<LinkMetrics[]>>(
      '/monitor/metrics/links',
      { params }
    )
  },

  // 获取告警列表
  getAlerts: (params?: { acknowledged?: boolean; level?: string }) => {
    return axios.get<typeof params, ApiResponse<Alert[]>>('/monitor/alerts', { params })
  },

  // 确认告警
  acknowledgeAlert: (id: string) => {
    return axios.post<void, ApiResponse<void>>(`/monitor/alerts/${id}/acknowledge`)
  },

  // 获取告警规则
  getAlertRules: () => {
    return axios.get<void, ApiResponse<AlertRule[]>>('/monitor/alert-rules')
  },

  // 创建告警规则
  createAlertRule: (data: Omit<AlertRule, 'id'>) => {
    return axios.post<typeof data, ApiResponse<AlertRule>>('/monitor/alert-rules', data)
  },

  // 更新告警规则
  updateAlertRule: (id: string, data: Partial<AlertRule>) => {
    return axios.put<typeof data, ApiResponse<AlertRule>>(`/monitor/alert-rules/${id}`, data)
  },

  // 删除告警规则
  deleteAlertRule: (id: string) => {
    return axios.delete<void, ApiResponse<void>>(`/monitor/alert-rules/${id}`)
  },

  // 获取终端日志（历史片段，用于非 WebSocket 场景）
  getTerminalLogs: (params?: { nodeId?: string; lines?: number }) => {
    return axios.get<typeof params, ApiResponse<string>>('/monitor/terminal/logs', { params })
  },
}
