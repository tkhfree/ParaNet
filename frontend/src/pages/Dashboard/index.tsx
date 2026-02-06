import React, { memo, useMemo } from 'react'
import { Card, Row, Col, Statistic, Space, Typography, Spin } from 'antd'
import {
  DeploymentUnitOutlined,
  CodeOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import styles from './index.module.less'

const { Title } = Typography

const QUICK_ACTIONS = [
  { path: '/topology', icon: DeploymentUnitOutlined, label: '创建拓扑' },
  { path: '/intent', icon: CodeOutlined, label: '编写意图' },
  { path: '/deploy', icon: CloudUploadOutlined, label: '部署配置' },
  { path: '/monitor', icon: CheckCircleOutlined, label: '查看监控' },
] as const

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { stats, alerts, health } = useDashboardStats()

  const statCards = useMemo(
    () => [
      {
        key: 'topology',
        title: '拓扑总数',
        value: stats.topologyCount,
        prefix: <DeploymentUnitOutlined />,
        color: '#1890ff',
      },
      {
        key: 'intent',
        title: '意图配置',
        value: stats.intentCount,
        prefix: <CodeOutlined />,
        color: '#52c41a',
      },
      {
        key: 'deploy',
        title: '部署任务',
        value: stats.deployCount,
        prefix: <CloudUploadOutlined />,
        color: '#fa8c16',
      },
      {
        key: 'nodes',
        title: '在线节点',
        value: stats.nodesOnline,
        suffix: `/ ${stats.nodesTotal}`,
        prefix: <CheckCircleOutlined />,
        color: '#13c2c2',
      },
    ],
    [stats]
  )

  const alertIconMap = {
    info: InfoCircleOutlined,
    warning: WarningOutlined,
    error: WarningOutlined,
    critical: WarningOutlined,
  }

  if (stats.loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrap}>
          <Spin size="large" tip="加载概览数据..." />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div>
          <Title level={2}>仪表盘</Title>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]}>
          {statCards.map((item) => (
            <Col xs={24} sm={12} lg={6} key={item.key}>
              <Card>
                <Statistic
                  title={item.title}
                  value={item.value}
                  suffix={item.suffix}
                  prefix={item.prefix}
                  valueStyle={{ color: item.color }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* 系统状态与最近告警 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title="系统健康度"
              extra={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            >
              <div className={styles.healthStatus}>
                {health.map((item) => (
                  <div className={styles.healthItem} key={item.label}>
                    <span className={styles.label}>{item.label}</span>
                    <span
                      className={styles.statusDot}
                      data-status={item.status}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="最近告警" extra={<WarningOutlined style={{ color: '#faad14' }} />}>
              <div className={styles.alertList}>
                {alerts.map((item) => {
                  const Icon = alertIconMap[item.level] ?? ClockCircleOutlined
                  const iconColor =
                    item.level === 'error' || item.level === 'critical'
                      ? '#ff4d4f'
                      : item.level === 'warning'
                        ? '#faad14'
                        : '#1890ff'
                  return (
                    <div className={styles.alertItem} key={item.id}>
                      <Icon style={{ color: iconColor }} />
                      <div className={styles.alertContent}>
                        <div className={styles.alertTitle}>{item.message}</div>
                        <div className={styles.alertTime}>{item.timestamp}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 快速入口 */}
        <Card title="快速操作">
          <Row gutter={[16, 16]}>
            {QUICK_ACTIONS.map(({ path, icon: Icon, label }) => (
              <Col xs={12} sm={6} key={path}>
                <Card
                  className={styles.quickAction}
                  hoverable
                  onClick={() => navigate(path)}
                >
                  <Icon className={styles.quickIcon} />
                  <div>{label}</div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      </Space>
    </div>
  )
}

export default memo(Dashboard)
