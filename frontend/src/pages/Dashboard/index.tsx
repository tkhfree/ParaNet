import React from 'react'
import { Card, Row, Col, Statistic, Space, Typography } from 'antd'
import {
  DeploymentUnitOutlined,
  CodeOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import styles from './index.module.less'

const { Title } = Typography

const Dashboard: React.FC = () => {
  return (
    <div className={styles.container}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div>
          <Title level={2}>仪表盘</Title>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="拓扑总数"
                value={8}
                prefix={<DeploymentUnitOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="意图配置"
                value={15}
                prefix={<CodeOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="部署任务"
                value={23}
                prefix={<CloudUploadOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="在线节点"
                value={12}
                suffix="/ 15"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 系统状态 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="系统健康度" extra={<CheckCircleOutlined style={{ color: '#52c41a' }} />}>
              <div className={styles.healthStatus}>
                <div className={styles.healthItem}>
                  <span className={styles.label}>控制器状态</span>
                  <span className={styles.statusDot} data-status="success">运行中</span>
                </div>
                <div className={styles.healthItem}>
                  <span className={styles.label}>编译服务</span>
                  <span className={styles.statusDot} data-status="success">正常</span>
                </div>
                <div className={styles.healthItem}>
                  <span className={styles.label}>遥测采集</span>
                  <span className={styles.statusDot} data-status="success">活跃</span>
                </div>
                <div className={styles.healthItem}>
                  <span className={styles.label}>数据库连接</span>
                  <span className={styles.statusDot} data-status="success">已连接</span>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="最近告警" extra={<WarningOutlined style={{ color: '#faad14' }} />}>
              <div className={styles.alertList}>
                <div className={styles.alertItem}>
                  <ClockCircleOutlined style={{ color: '#faad14' }} />
                  <div className={styles.alertContent}>
                    <div className={styles.alertTitle}>节点延迟过高</div>
                    <div className={styles.alertTime}>2 分钟前</div>
                  </div>
                </div>
                <div className={styles.alertItem}>
                  <WarningOutlined style={{ color: '#ff4d4f' }} />
                  <div className={styles.alertContent}>
                    <div className={styles.alertTitle}>链路丢包率超过阈值</div>
                    <div className={styles.alertTime}>15 分钟前</div>
                  </div>
                </div>
                <div className={styles.alertItem}>
                  <ClockCircleOutlined style={{ color: '#1890ff' }} />
                  <div className={styles.alertContent}>
                    <div className={styles.alertTitle}>部署任务已完成</div>
                    <div className={styles.alertTime}>1 小时前</div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 快速入口 */}
        <Card title="快速操作">
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card className={styles.quickAction} hoverable>
                <DeploymentUnitOutlined className={styles.quickIcon} />
                <div>创建拓扑</div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className={styles.quickAction} hoverable>
                <CodeOutlined className={styles.quickIcon} />
                <div>编写意图</div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className={styles.quickAction} hoverable>
                <CloudUploadOutlined className={styles.quickIcon} />
                <div>部署配置</div>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className={styles.quickAction} hoverable>
                <CheckCircleOutlined className={styles.quickIcon} />
                <div>查看监控</div>
              </Card>
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  )
}

export default Dashboard
