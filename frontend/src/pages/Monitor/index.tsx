import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Tabs, Space, Typography, Statistic, Spin, Empty } from 'antd'
import {
  MonitorOutlined,
  LineChartOutlined,
  BellOutlined,
  ConsoleSqlOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { MetricsChart, AlertList, TerminalLog } from '@/components/monitoring'
import { monitorApi } from '@/api/monitor'
import type { NodeMetrics, LinkMetrics, SystemHealth } from '@/model/monitor'
import styles from './index.module.less'

const { Title } = Typography

const Monitor: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [nodeMetrics, setNodeMetrics] = useState<NodeMetrics[]>([])
  const [linkMetrics, setLinkMetrics] = useState<LinkMetrics[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const end = Math.floor(Date.now() / 1000)
        const start = end - 3600
        const [healthRes, nodesRes, linksRes] = await Promise.allSettled([
          monitorApi.getHealth(),
          monitorApi.getNodeMetrics({ startTime: start, endTime: end, interval: 60 }),
          monitorApi.getLinkMetrics({ startTime: start, endTime: end, interval: 60 }),
        ])
        if (healthRes.status === 'fulfilled' && healthRes.value?.data) {
          setHealth(healthRes.value.data)
        }
        if (nodesRes.status === 'fulfilled' && nodesRes.value?.data) {
          setNodeMetrics(Array.isArray(nodesRes.value.data) ? nodesRes.value.data : [])
        }
        if (linksRes.status === 'fulfilled' && linksRes.value?.data) {
          setLinkMetrics(Array.isArray(linksRes.value.data) ? linksRes.value.data : [])
        }
      } catch {
        setHealth(null)
        setNodeMetrics([])
        setLinkMetrics([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const hasMetrics = nodeMetrics.length > 0 || linkMetrics.length > 0
  const firstNode = nodeMetrics[0]
  const firstLink = linkMetrics[0]

  const tabItems = [
    {
      key: 'charts',
      label: (
        <span>
          <LineChartOutlined /> 指标图表
        </span>
      ),
      children: (
        <div className={styles.tabCharts}>
          {loading ? (
            <div className={styles.centerSpin}>
              <Spin size="large" />
            </div>
          ) : !hasMetrics ? (
            <Empty
              image={<LineChartOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
              description="暂无遥测数据，部署配置后将开始采集"
            />
          ) : (
            <Row gutter={[16, 16]}>
              {firstNode && (
                <>
                  <Col xs={24} lg={12}>
                    <MetricsChart
                      title="CPU 使用率"
                      unit="%"
                      series={[{ name: firstNode.nodeName, data: firstNode.cpu }]}
                      empty={firstNode.cpu.length === 0}
                    />
                  </Col>
                  <Col xs={24} lg={12}>
                    <MetricsChart
                      title="内存使用率"
                      unit="%"
                      series={[{ name: firstNode.nodeName, data: firstNode.memory }]}
                      empty={firstNode.memory.length === 0}
                    />
                  </Col>
                  <Col xs={24} lg={12}>
                    <MetricsChart
                      title="流量入"
                      unit="Mbps"
                      series={[{ name: firstNode.nodeName, data: firstNode.traffic.in }]}
                      empty={firstNode.traffic.in.length === 0}
                    />
                  </Col>
                  <Col xs={24} lg={12}>
                    <MetricsChart
                      title="流量出"
                      unit="Mbps"
                      series={[{ name: firstNode.nodeName, data: firstNode.traffic.out }]}
                      empty={firstNode.traffic.out.length === 0}
                    />
                  </Col>
                </>
              )}
              {firstLink && (
                <>
                  <Col xs={24} lg={12}>
                    <MetricsChart
                      title="链路延迟"
                      unit="ms"
                      series={[{ name: firstLink.linkId, data: firstLink.latency }]}
                      empty={firstLink.latency.length === 0}
                    />
                  </Col>
                  <Col xs={24} lg={12}>
                    <MetricsChart
                      title="丢包率"
                      unit="%"
                      series={[{ name: firstLink.linkId, data: firstLink.packetLoss }]}
                      empty={firstLink.packetLoss.length === 0}
                    />
                  </Col>
                </>
              )}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'alerts',
      label: (
        <span>
          <BellOutlined /> 告警管理
        </span>
      ),
      children: (
        <Card>
          <AlertList showRules refreshInterval={30000} />
        </Card>
      ),
    },
    {
      key: 'terminal',
      label: (
        <span>
          <ConsoleSqlOutlined /> 终端日志
        </span>
      ),
      children: (
        <Card>
          <TerminalLog readOnly height={420} />
        </Card>
      ),
    },
  ]

  return (
    <div className={styles.monitor}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div>
          <Title level={2}>监控中心</Title>
        </div>

        {health && (
          <Row gutter={[16, 16]} className={styles.statsRow}>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic
                  title="节点在线"
                  value={health.nodesOnline}
                  suffix={`/ ${health.nodesTotal}`}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic
                  title="链路活跃"
                  value={health.linksActive}
                  suffix={`/ ${health.linksTotal}`}
                  prefix={<MonitorOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic
                  title="系统状态"
                  value={health.status === 'healthy' ? '正常' : health.status === 'warning' ? '警告' : '异常'}
                  prefix={
                    health.status === 'healthy' ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <WarningOutlined style={{ color: '#faad14' }} />
                    )
                  }
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic
                  title="未确认告警"
                  value={health.alerts?.filter((a) => !a.acknowledged).length ?? 0}
                  prefix={<BellOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Card>
            </Col>
          </Row>
        )}

        <Card>
          <Tabs defaultActiveKey="charts" items={tabItems} />
        </Card>
      </Space>
    </div>
  )
}

export default Monitor
