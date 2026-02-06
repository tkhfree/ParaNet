import React, { useEffect, useCallback } from 'react'
import {
  Card,
  Space,
  Typography,
  Steps,
  Button,
  Select,
  Form,
  Collapse,
  Progress,
  Table,
  Tag,
  Empty,
  message as antdMessage,
  Tabs,
} from 'antd'
import {
  CloudUploadOutlined,
  RollbackOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { deployApi } from '@/api/deploy'
import type { Deployment, DeploymentLog, DeploymentStatus } from '@/api/deploy'
import { intentApi } from '@/api/intent'
import { topologyApi } from '@/api/topology'
import useDeployStore from '@/stores/deploy'
import { useWebSocket } from '@/hooks/useWebSocket'
import { getDeployProgressWsUrl } from '@/utils/ws'
import type { DeploymentPreviewConfig } from '@/model/deploy'
import { formatDateTime } from '@/utils'
import styles from './index.module.less'

const { Title, Text } = Typography

const STEP_TITLES = ['选择意图与拓扑', '配置预览', '执行部署', '完成']

const statusMap: Record<DeploymentStatus, { color: string; text: string }> = {
  pending: { color: 'default', text: '待执行' },
  validating: { color: 'processing', text: '校验中' },
  deploying: { color: 'processing', text: '部署中' },
  completed: { color: 'success', text: '已完成' },
  failed: { color: 'error', text: '失败' },
  rolled_back: { color: 'warning', text: '已回滚' },
}

/** 渲染配置块（IP/NDN/GEO/P4） */
function ConfigPreview({ config }: { config: DeploymentPreviewConfig }) {
  const items = [
    { key: 'ip', label: 'IP 配置', data: config.ip },
    { key: 'ndn', label: 'NDN 配置', data: config.ndn },
    { key: 'geo', label: 'GEO 配置', data: config.geo },
    { key: 'p4', label: 'P4 配置', data: config.p4 },
  ].filter((x) => x.data && Object.keys(x.data).length > 0)

  if (items.length === 0) {
    return <Text type="secondary">暂无配置项</Text>
  }

  return (
    <Collapse
      defaultActiveKey={items.map((i) => i.key)}
      items={items.map(({ key, label, data }) => ({
        key,
        label,
        children: (
          <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        ),
      }))}
    />
  )
}

const Deploy: React.FC = () => {
  const {
    wizardStep,
    setWizardStep,
    resetWizard,
    selectedIntentId,
    selectedTopologyId,
    setSelectedIntentId,
    setSelectedTopologyId,
    previewConfig,
    previewLoading,
    setPreviewConfig,
    setPreviewLoading,
    currentDeployment,
    setCurrentDeployment,
    progressLogs,
    progressPercent,
    setProgressLogs,
    appendProgressLog,
    setProgressPercent,
    setDeploymentStatus,
    clearProgress,
    deploymentList,
    setDeploymentList,
    listLoading,
    setListLoading,
  } = useDeployStore()

  const [intentOptions, setIntentOptions] = React.useState<{ id: string; name: string }[]>([])
  const [topologyOptions, setTopologyOptions] = React.useState<{ id: string; name: string }[]>([])
  const [intentLoading, setIntentLoading] = React.useState(false)
  const [topologyLoading, setTopologyLoading] = React.useState(false)
  const [deploying, setDeploying] = React.useState(false)
  const [rollbacking, setRollbacking] = React.useState(false)

  const isDeploying =
    currentDeployment &&
    (currentDeployment.status === 'deploying' || currentDeployment.status === 'validating')
  const wsUrl = currentDeployment?.id && isDeploying ? getDeployProgressWsUrl(currentDeployment.id) : ''
  const shouldConnectWs = !!wsUrl

  useWebSocket(shouldConnectWs ? wsUrl : '', {
    onMessage: useCallback(
      (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as {
            progress?: number
            status?: DeploymentStatus
            log?: DeploymentLog
            logs?: DeploymentLog[]
          }
          if (typeof data.progress === 'number') setProgressPercent(data.progress)
          if (data.status) setDeploymentStatus(data.status)
          if (data.log) appendProgressLog(data.log)
          if (Array.isArray(data.logs)) setProgressLogs(data.logs)
        } catch {
          // 非 JSON 或其它格式忽略
        }
      },
      [appendProgressLog, setProgressLogs, setProgressPercent, setDeploymentStatus]
    ),
    reconnect: true,
    reconnectInterval: 2000,
    maxReconnectAttempts: 10,
  })

  // 部署进行中时轮询详情（无 WebSocket 时仍可更新进度）
  useEffect(() => {
    if (!currentDeployment?.id || !isDeploying) return
    const timer = setInterval(async () => {
      try {
        const res = await deployApi.getById(currentDeployment.id)
        const d = res?.data as Deployment | undefined
        if (!d) return
        setDeploymentStatus(d.status)
        setProgressPercent(d.progress ?? 0)
        if (d.logs?.length) setProgressLogs(d.logs)
      } catch {
        // 忽略轮询错误
      }
    }, 2000)
    return () => clearInterval(timer)
  }, [currentDeployment?.id, isDeploying, setDeploymentStatus, setProgressPercent, setProgressLogs])

  const loadIntents = useCallback(async () => {
    setIntentLoading(true)
    try {
      const res = await intentApi.getList({ pageNo: 1, pageSize: 100 })
      const list = (res?.data?.records ?? []) as { id: string; name: string }[]
      setIntentOptions(list)
    } finally {
      setIntentLoading(false)
    }
  }, [])

  const loadTopologies = useCallback(async () => {
    setTopologyLoading(true)
    try {
      const res = await topologyApi.getList({ pageNo: 1, pageSize: 100 })
      const list = (res?.data?.records ?? []) as { id: string; name: string }[]
      setTopologyOptions(list)
    } finally {
      setTopologyLoading(false)
    }
  }, [])

  const loadPreview = useCallback(async () => {
    if (!selectedIntentId || !selectedTopologyId) return
    setPreviewLoading(true)
    setPreviewConfig(null)
    try {
      const res = await deployApi.preview({
        intentId: selectedIntentId,
        topologyId: selectedTopologyId,
      })
      const config = res?.data?.configs as DeploymentPreviewConfig | undefined
      setPreviewConfig(config ?? null)
    } catch {
      setPreviewConfig(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [selectedIntentId, selectedTopologyId, setPreviewConfig, setPreviewLoading])

  const loadDeploymentList = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await deployApi.getList({ pageNo: 1, pageSize: 50 })
      const list = (res?.data?.records ?? []) as Deployment[]
      setDeploymentList(list)
    } finally {
      setListLoading(false)
    }
  }, [setDeploymentList, setListLoading])

  useEffect(() => {
    loadIntents()
    loadTopologies()
  }, [loadIntents, loadTopologies])

  useEffect(() => {
    if (wizardStep === 1 && selectedIntentId && selectedTopologyId) {
      loadPreview()
    }
  }, [wizardStep, selectedIntentId, selectedTopologyId, loadPreview])

  useEffect(() => {
    loadDeploymentList()
  }, [loadDeploymentList])

  const handleStartDeploy = async () => {
    if (!selectedIntentId || !selectedTopologyId) return
    setDeploying(true)
    clearProgress()
    try {
      const res = await deployApi.deploy({ intentId: selectedIntentId, topologyId: selectedTopologyId })
      const deployment = res?.data as Deployment
      setCurrentDeployment(deployment)
      setProgressPercent(deployment.progress ?? 0)
      if (deployment.logs?.length) setProgressLogs(deployment.logs)
      setWizardStep(3)
      antdMessage.success('部署已启动')
      loadDeploymentList()
    } catch {
      antdMessage.error('启动部署失败')
    } finally {
      setDeploying(false)
    }
  }

  const handleRollback = async (id: string) => {
    setRollbacking(true)
    try {
      await deployApi.rollback(id)
      antdMessage.success('回滚已提交')
      if (currentDeployment?.id === id) {
        setDeploymentStatus('rolled_back')
      }
      loadDeploymentList()
    } catch {
      antdMessage.error('回滚失败')
    } finally {
      setRollbacking(false)
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await deployApi.cancel(id)
      antdMessage.success('已取消')
      if (currentDeployment?.id === id) {
        setCurrentDeployment(null)
        clearProgress()
      }
      loadDeploymentList()
    } catch {
      antdMessage.error('取消失败')
    }
  }

  const canNextStep0 = !!selectedIntentId && !!selectedTopologyId
  const canNextStep1 = !!previewConfig && !previewLoading

  return (
    <Space direction="vertical" size={24} className={styles.deploy} style={{ width: '100%' }}>
      <div className={styles.header}>
        <Title level={2}>部署管理</Title>
      </div>

      <Tabs
        defaultActiveKey="wizard"
        items={[
          {
            key: 'wizard',
            label: '新建部署',
            children: (
              <Card>
                <Steps
                  current={wizardStep}
                  items={STEP_TITLES.map((title) => ({ title }))}
                  style={{ marginBottom: 24 }}
                />

                {wizardStep === 0 && (
                  <Form layout="vertical" style={{ maxWidth: 480 }}>
                    <Form.Item label="选择意图" required>
                      <Select
                        placeholder="请选择已编译的意图"
                        value={selectedIntentId || undefined}
                        onChange={setSelectedIntentId}
                        loading={intentLoading}
                        options={intentOptions.map((o) => ({ value: o.id, label: o.name || o.id }))}
                        allowClear
                      />
                    </Form.Item>
                    <Form.Item label="选择拓扑" required>
                      <Select
                        placeholder="请选择拓扑"
                        value={selectedTopologyId || undefined}
                        onChange={setSelectedTopologyId}
                        loading={topologyLoading}
                        options={topologyOptions.map((o) => ({ value: o.id, label: o.name || o.id }))}
                        allowClear
                      />
                    </Form.Item>
                    <Button type="primary" disabled={!canNextStep0} onClick={() => setWizardStep(1)}>
                      下一步：配置预览
                    </Button>
                  </Form>
                )}

                {wizardStep === 1 && (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {previewLoading && <Text type="secondary">加载配置预览中…</Text>}
                    {!previewLoading && previewConfig && (
                      <ConfigPreview config={previewConfig} />
                    )}
                    {!previewLoading && !previewConfig && selectedIntentId && selectedTopologyId && (
                      <Text type="secondary">暂无预览配置</Text>
                    )}
                    <Space>
                      <Button onClick={() => setWizardStep(0)}>上一步</Button>
                      <Button
                        type="primary"
                        disabled={!canNextStep1}
                        onClick={() => {
                          setWizardStep(2)
                          clearProgress()
                        }}
                      >
                        下一步：执行部署
                      </Button>
                    </Space>
                  </Space>
                )}

                {wizardStep === 2 && (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>将根据所选意图与拓扑执行部署，确认后点击「开始部署」。</Text>
                    <Space>
                      <Button onClick={() => setWizardStep(1)}>上一步</Button>
                      <Button
                        type="primary"
                        icon={<CloudUploadOutlined />}
                        loading={deploying}
                        onClick={handleStartDeploy}
                      >
                        开始部署
                      </Button>
                    </Space>
                  </Space>
                )}

                {wizardStep === 3 && (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {currentDeployment && (
                      <>
                        <Space align="center">
                          {currentDeployment.status === 'completed' && (
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
                          )}
                          {currentDeployment.status === 'failed' && (
                            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
                          )}
                          {(currentDeployment.status === 'deploying' ||
                            currentDeployment.status === 'validating') && (
                            <Text type="secondary">部署进行中…</Text>
                          )}
                          <Tag color={statusMap[currentDeployment.status as DeploymentStatus]?.color}>
                            {statusMap[currentDeployment.status as DeploymentStatus]?.text}
                          </Tag>
                          <Text type="secondary">部署 ID: {currentDeployment.id}</Text>
                        </Space>
                        <Progress percent={progressPercent} status={currentDeployment.status === 'failed' ? 'exception' : undefined} />
                        <div style={{ maxHeight: 240, overflow: 'auto', background: '#fafafa', padding: 12, borderRadius: 8 }}>
                          {progressLogs.length === 0 && (
                            <Text type="secondary">暂无日志，或正在通过 WebSocket 接收…</Text>
                          )}
                          {progressLogs.map((log: DeploymentLog, i: number) => (
                            <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                              <Text type="secondary">[{log.timestamp}] </Text>
                              <Tag color={log.level === 'error' ? 'red' : log.level === 'warning' ? 'orange' : 'default'}>
                                {log.level}
                              </Tag>
                              {log.message}
                            </div>
                          ))}
                        </div>
                        <Space>
                          {currentDeployment.status === 'completed' && (
                            <Button
                              danger
                              icon={<RollbackOutlined />}
                              loading={rollbacking}
                              onClick={() => handleRollback(currentDeployment.id)}
                            >
                              回滚
                            </Button>
                          )}
                          {(currentDeployment.status === 'deploying' ||
                            currentDeployment.status === 'validating') && (
                            <Button
                              icon={<StopOutlined />}
                              onClick={() => handleCancel(currentDeployment.id)}
                            >
                              取消部署
                            </Button>
                          )}
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              resetWizard()
                              setWizardStep(0)
                            }}
                          >
                            新建部署
                          </Button>
                        </Space>
                      </>
                    )}
                  </Space>
                )}
              </Card>
            ),
          },
          {
            key: 'list',
            label: '部署记录',
            children: (
              <Card>
                <Button type="primary" icon={<ReloadOutlined />} onClick={loadDeploymentList} loading={listLoading} style={{ marginBottom: 16 }}>
                  刷新
                </Button>
                <Table<Deployment>
                  rowKey="id"
                  loading={listLoading}
                  dataSource={deploymentList}
                  columns={[
                    { title: '部署 ID', dataIndex: 'id', ellipsis: true, width: 120 },
                    { title: '意图 ID', dataIndex: 'intentId', ellipsis: true, width: 100 },
                    { title: '拓扑 ID', dataIndex: 'topologyId', ellipsis: true, width: 100 },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      width: 100,
                      render: (status: DeploymentStatus) => (
                        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text ?? status}</Tag>
                      ),
                    },
                    {
                      title: '进度',
                      dataIndex: 'progress',
                      width: 80,
                      render: (p: number) => `${p ?? 0}%`,
                    },
                    {
                      title: '创建时间',
                      dataIndex: 'createdAt',
                      width: 180,
                      render: (t: string) => formatDateTime(t),
                    },
                    {
                      title: '操作',
                      key: 'actions',
                      width: 160,
                      render: (_, record) => (
                        <Space size="small">
                          {record.status === 'completed' && (
                            <Button
                              type="link"
                              size="small"
                              danger
                              icon={<RollbackOutlined />}
                              loading={rollbacking}
                              onClick={() => handleRollback(record.id)}
                            >
                              回滚
                            </Button>
                          )}
                          {(record.status === 'deploying' || record.status === 'validating') && (
                            <Button
                              type="link"
                              size="small"
                              icon={<StopOutlined />}
                              onClick={() => handleCancel(record.id)}
                            >
                              取消
                            </Button>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                  pagination={false}
                  locale={{ emptyText: <Empty description="暂无部署记录" /> }}
                />
              </Card>
            ),
          },
        ]}
      />
    </Space>
  )
}

export default Deploy
