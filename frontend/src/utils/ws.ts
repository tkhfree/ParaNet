/**
 * 获取 WebSocket 基础 URL（与当前页面同源，用于部署进度等）
 */
export function getWsBaseUrl(path = '/ws'): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}${path}`
}

/**
 * 部署进度 WebSocket URL（按部署 ID 订阅）
 */
export function getDeployProgressWsUrl(deploymentId: string): string {
  return getWsBaseUrl(`/ws/deployments/${deploymentId}/progress`)
}
