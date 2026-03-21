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
  ClusterOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import styles from './index.module.less'

const { Title, Text } = Typography

const QUICK_ACTIONS = [
  { path: '/develop', icon: DeploymentUnitOutlined, label: '进入开发子系统' },
  { path: '/compile', icon: CodeOutlined, label: '查看编译过程' },
  { path: '/deploy', icon: CloudUploadOutlined, label: '执行项目部署' },
  { path: '/monitor', icon: ClusterOutlined, label: '进入监控中心' },
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
        color: 'blue',
      },
      {
        key: 'intent',
        title: '编译产物记录',
        value: stats.intentCount,
        prefix: <CodeOutlined />,
        color: 'green',
      },
      {
        key: 'deploy',
        title: '部署任务',
        value: stats.deployCount,
        prefix: <CloudUploadOutlined />,
        color: 'orange',
      },
      {
        key: 'nodes',
        title: '在线节点',
        value: stats.nodesOnline,
        suffix: `/ ${stats.nodesTotal}`,
        prefix: <CheckCircleOutlined />,
        color: 'cyan',
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
      <div className={styles.pageHeader}>
        <Title level={2} style={{ margin: 0 }}>
          仪表盘
        </Title>
        <Text type="secondary">欢迎回来，这里是 ParaNet 系统的概览</Text>
      </div>

      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* 统计卡片 */}
        <Row gutter={[20, 20]} className={styles.statRow}>
          {statCards.map((item) => (
            <Col xs={24} sm={12} lg={6} key={item.key}>
              <Card className={styles.statCard} data-color={item.color}>
                <div className={styles.statContent}>
                  <div className={styles.statInfo}>
                    <div className={styles.statTitle}>{item.title}</div>
                    <div className={styles.statValueWrapper}>
                      <Statistic
                        value={item.value}
                        suffix={item.suffix}
                        valueStyle={{
                          color: `var(--color-${item.color})`,
                          fontSize: 32,
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  </div>
                  <div className={styles.statIcon} data-color={item.color}>
                    {item.prefix}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 系统状态与最近告警 */}
        <Row gutter={[20, 20]} className={styles.statusRow}>
          <Col xs={24} lg={12}>
            <Card
              className={styles.statusCard}
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
            <Card
              className={styles.statusCard}
              title="最近告警"
              extra={<WarningOutlined style={{ color: '#faad14' }} />}
            >
              {alerts.length > 0 ? (
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
                        <Icon className={styles.alertIcon} style={{ color: iconColor }} />
                        <div className={styles.alertContent}>
                          <div className={styles.alertTitle}>{item.message}</div>
                          <div className={styles.alertTime}>{item.timestamp}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className={styles.emptyAlert}>
                  <CheckCircleOutlined />
                  <div>暂无告警</div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 快速入口 */}
        <Card className={styles.quickCard} title="快速操作">
          <div className={styles.quickGrid}>
            {QUICK_ACTIONS.map(({ path, icon: Icon, label }) => (
              <div
                key={path}
                className={styles.quickAction}
                onClick={() => navigate(path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(path)}
              >
                <Icon className={styles.quickIcon} />
                <span className={styles.quickLabel}>{label}</span>
              </div>
            ))}
          </div>
        </Card>
      </Space>
    </div>
  )
}

export default memo(Dashboard)
