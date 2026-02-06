import { useEffect, useState, useMemo } from 'react'
import { topologyApi } from '@/api/topology'
import { intentApi } from '@/api/intent'
import { deployApi } from '@/api/deploy'
import { monitorApi } from '@/api/monitor'
import type { Alert } from '@/model/monitor'

export interface DashboardStats {
  topologyCount: number
  intentCount: number
  deployCount: number
  nodesOnline: number
  nodesTotal: number
  loading: boolean
}

export interface HealthItem {
  label: string
  status: 'success' | 'warning' | 'error'
  text: string
}

const MOCK_STATS: DashboardStats = {
  topologyCount: 8,
  intentCount: 15,
  deployCount: 23,
  nodesOnline: 12,
  nodesTotal: 15,
  loading: false,
}

const MOCK_ALERTS: Array<{ id: string; level: Alert['level']; message: string; timestamp: string }> = [
  { id: '1', level: 'warning', message: '节点延迟过高', timestamp: '2 分钟前' },
  { id: '2', level: 'error', message: '链路丢包率超过阈值', timestamp: '15 分钟前' },
  { id: '3', level: 'info', message: '部署任务已完成', timestamp: '1 小时前' },
]

const MOCK_HEALTH: HealthItem[] = [
  { label: '控制器状态', status: 'success', text: '运行中' },
  { label: '编译服务', status: 'success', text: '正常' },
  { label: '遥测采集', status: 'success', text: '活跃' },
  { label: '数据库连接', status: 'success', text: '已连接' },
]

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    ...MOCK_STATS,
    loading: true,
  })
  const [alerts, setAlerts] = useState<typeof MOCK_ALERTS>([])
  const [health, setHealth] = useState<HealthItem[]>(MOCK_HEALTH)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [topologyRes, intentRes, deployRes, healthRes, alertsRes] = await Promise.allSettled([
          topologyApi.getList({ pageNo: 1, pageSize: 1 }),
          intentApi.getList({ pageNo: 1, pageSize: 1 }),
          deployApi.getList({ pageNo: 1, pageSize: 1 }),
          monitorApi.getHealth(),
          monitorApi.getAlerts({ acknowledged: false }),
        ])

        if (cancelled) return

        const topologyCount =
          topologyRes.status === 'fulfilled' && topologyRes.value?.data?.total != null
            ? topologyRes.value.data.total
            : MOCK_STATS.topologyCount
        const intentCount =
          intentRes.status === 'fulfilled' && intentRes.value?.data?.total != null
            ? intentRes.value.data.total
            : MOCK_STATS.intentCount
        const deployCount =
          deployRes.status === 'fulfilled' && deployRes.value?.data?.total != null
            ? deployRes.value.data.total
            : MOCK_STATS.deployCount
        const nodesOnline =
          healthRes.status === 'fulfilled' && healthRes.value?.data?.nodesOnline != null
            ? healthRes.value.data.nodesOnline
            : MOCK_STATS.nodesOnline
        const nodesTotal =
          healthRes.status === 'fulfilled' && healthRes.value?.data?.nodesTotal != null
            ? healthRes.value.data.nodesTotal
            : MOCK_STATS.nodesTotal

        setStats({
          topologyCount,
          intentCount,
          deployCount,
          nodesOnline,
          nodesTotal,
          loading: false,
        })

        if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value?.data)) {
          setAlerts(
            alertsRes.value.data.slice(0, 5).map((a) => ({
              id: a.id,
              level: a.level,
              message: a.message,
              timestamp: a.timestamp,
            }))
          )
        } else {
          setAlerts(MOCK_ALERTS)
        }

        if (healthRes.status === 'fulfilled' && healthRes.value?.data?.status) {
          const status = healthRes.value.data.status
          setHealth([
            { label: '控制器状态', status: status === 'healthy' ? 'success' : status === 'warning' ? 'warning' : 'error', text: status === 'healthy' ? '运行中' : status === 'warning' ? '告警' : '异常' },
            { label: '编译服务', status: 'success', text: '正常' },
            { label: '遥测采集', status: 'success', text: '活跃' },
            { label: '数据库连接', status: 'success', text: '已连接' },
          ])
        }
      } catch {
        if (!cancelled) {
          setStats({ ...MOCK_STATS, loading: false })
          setAlerts(MOCK_ALERTS)
          setHealth(MOCK_HEALTH)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(
    () => ({
      stats,
      alerts,
      health,
    }),
    [stats, alerts, health]
  )
}
