import { useEffect, useRef } from 'react'
import { deployApi } from '@/api/deploy'
import type { DeploymentStatus } from '@/api/deploy'
import useDeployStore from '@/stores/deploy'

/**
 * 订阅部署进度 WebSocket：更新进度条、SSH 连接状态；结束时拉取完整部署详情。
 */
export function useDeployProgressWebSocket(deployId: string | undefined, enabled: boolean) {
  const setProgressPercent = useDeployStore((s) => s.setProgressPercent)
  const setSshConnections = useDeployStore((s) => s.setSshConnections)
  const setProgressLogs = useDeployStore((s) => s.setProgressLogs)
  const setCurrentDeployment = useDeployStore((s) => s.setCurrentDeployment)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!deployId || !enabled) {
      return
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}/ws/deployments/${deployId}/progress`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as {
          heartbeat?: boolean
          deploymentId?: string
          progress?: number
          status?: DeploymentStatus
          sshConnections?: import('@/api/deploy').SshConnectionStatus[]
          message?: string
        }
        if (data.heartbeat) return

        if (typeof data.progress === 'number') {
          setProgressPercent(data.progress)
        }
        if (Array.isArray(data.sshConnections)) {
          setSshConnections(data.sshConnections)
        }

        const terminal =
          data.status === 'completed' ||
          data.status === 'failed' ||
          data.status === 'cancelled'

        if (data.status) {
          const state = useDeployStore.getState()
          const cur = state.currentDeployment
          if (cur?.id === deployId) {
            setCurrentDeployment({
              ...cur,
              status: data.status,
              progress: data.progress ?? cur.progress,
            })
          }
        }

        if (terminal) {
          void deployApi.getById(deployId).then((res) => {
            if (res.data) {
              setCurrentDeployment(res.data)
              setProgressLogs(res.data.logs ?? [])
              setSshConnections(res.data.sshConnections ?? [])
              setProgressPercent(res.data.progress ?? 0)
            }
          })
          ws.close()
        }
      } catch {
        /* ignore malformed */
      }
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [
    deployId,
    enabled,
    setCurrentDeployment,
    setProgressLogs,
    setProgressPercent,
    setSshConnections,
  ])
}
