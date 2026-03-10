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

/**
 * Workspace 终端 WebSocket URL。
 * 后端当前尚未实现，前端先统一收口到预期契约路径。
 */
export function getWorkspaceTerminalWsUrl(projectId?: string, nodeId?: string): string {
  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  if (nodeId) params.set('nodeId', nodeId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return getWsBaseUrl(`/ws/workspace/terminal${suffix}`)
}
