// 监控相关类型定义

export interface MetricData {
  timestamp: number
  value: number
}

export interface NodeMetrics {
  nodeId: string
  nodeName: string
  cpu: MetricData[]
  memory: MetricData[]
  traffic: {
    in: MetricData[]
    out: MetricData[]
  }
}

export interface LinkMetrics {
  linkId: string
  bandwidth: MetricData[]
  latency: MetricData[]
  packetLoss: MetricData[]
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  nodesOnline: number
  nodesTotal: number
  linksActive: number
  linksTotal: number
  alerts: Alert[]
}

export interface Alert {
  id: string
  level: AlertLevel
  type: AlertType
  message: string
  source: string
  timestamp: string
  acknowledged: boolean
}

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

export type AlertType = 
  | 'node_down' 
  | 'link_down' 
  | 'high_latency' 
  | 'packet_loss' 
  | 'cpu_high' 
  | 'memory_high'

export interface AlertRule {
  id: string
  name: string
  enabled: boolean
  type: AlertType
  threshold: number
  duration: number // seconds
  actions: AlertAction[]
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'notification'
  target: string
}
