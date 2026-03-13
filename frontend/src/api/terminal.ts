import { getWsBaseUrl } from '@/utils/ws'

export function getTerminalWsUrl(projectId?: string | null): string {
  const baseUrl = getWsBaseUrl('/api/terminal')
  if (!projectId) {
    return baseUrl
  }
  return `${baseUrl}?projectId=${encodeURIComponent(projectId)}`
}
