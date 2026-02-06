import React, { useEffect, useState } from 'react'
import { Table, Tag, Button, Modal, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined, SettingOutlined } from '@ant-design/icons'
import { monitorApi } from '@/api/monitor'
import type { Alert, AlertRule, AlertLevel } from '@/model/monitor'
import styles from './index.module.less'

const LEVEL_COLOR: Record<AlertLevel, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'volcano',
  critical: 'red',
}

const LEVEL_TEXT: Record<AlertLevel, string> = {
  info: '信息',
  warning: '警告',
  error: '错误',
  critical: '严重',
}

export interface AlertListProps {
  /** 是否显示告警规则入口 */
  showRules?: boolean
  /** 刷新间隔(ms)，0 表示不轮询 */
  refreshInterval?: number
}

const AlertList: React.FC<AlertListProps> = ({
  showRules = true,
  refreshInterval = 0,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [rules, setRules] = useState<AlertRule[]>([])
  const [rulesModalOpen, setRulesModalOpen] = useState(false)
  const [rulesLoading, setRulesLoading] = useState(false)

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const res = await monitorApi.getAlerts()
      setAlerts(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const loadRules = async () => {
    setRulesLoading(true)
    try {
      const res = await monitorApi.getAlertRules()
      setRules(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setRules([])
    } finally {
      setRulesLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  useEffect(() => {
    if (refreshInterval <= 0) return
    const timer = setInterval(loadAlerts, refreshInterval)
    return () => clearInterval(timer)
  }, [refreshInterval])

  const handleAck = async (id: string) => {
    try {
      await monitorApi.acknowledgeAlert(id)
      message.success('已确认')
      loadAlerts()
    } catch {
      message.error('确认失败')
    }
  }

  const openRulesModal = () => {
    setRulesModalOpen(true)
    loadRules()
  }

  const columns: ColumnsType<Alert> = [
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 88,
      render: (level: AlertLevel) => (
        <Tag color={LEVEL_COLOR[level]}>{LEVEL_TEXT[level] ?? level}</Tag>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 172,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) =>
        !record.acknowledged ? (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleAck(record.id)}
          >
            确认
          </Button>
        ) : (
          <span className={styles.ackText}>已确认</span>
        ),
    },
  ]

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span>告警列表</span>
        {showRules && (
          <Button
            type="default"
            size="small"
            icon={<SettingOutlined />}
            onClick={openRulesModal}
          >
            告警规则
          </Button>
        )}
      </div>
      <Table<Alert>
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={alerts}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title="告警规则"
        open={rulesModalOpen}
        onCancel={() => setRulesModalOpen(false)}
        footer={null}
        width={640}
      >
        <p className={styles.rulesHint}>
          配置阈值与持续时间，触发后将生成告警并执行动作（如通知、Webhook）。
        </p>
        <Table<AlertRule>
          size="small"
          rowKey="id"
          loading={rulesLoading}
          dataSource={rules}
          columns={[
            { title: '名称', dataIndex: 'name', key: 'name' },
            { title: '类型', dataIndex: 'type', key: 'type' },
            {
              title: '启用',
              dataIndex: 'enabled',
              key: 'enabled',
              render: (v: boolean) => (v ? '是' : '否'),
            },
            { title: '阈值', dataIndex: 'threshold', key: 'threshold' },
            { title: '持续时间(s)', dataIndex: 'duration', key: 'duration' },
          ]}
          pagination={false}
        />
      </Modal>
    </div>
  )
}

export default AlertList
