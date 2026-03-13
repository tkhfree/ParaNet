import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Collapse, Empty, Progress, Select, Space, Table, Tabs, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  RollbackOutlined,
  StopOutlined,
} from '@ant-design/icons'

import { deployApi } from '@/api/deploy'
import type { Deployment, DeploymentLog, DeploymentStatus } from '@/api/deploy'
import { intentApi, topologyApi } from '@/api'
import type { DeploymentPreviewConfig } from '@/model/deploy'
import useDeployStore from '@/stores/deploy'
import useProjectStore from '@/stores/project'
import { formatDateTime } from '@/utils'

import styles from './index.module.less'

const { Title, Text } = Typography

const statusMap: Record<DeploymentStatus, { color: string; text: string }> = {
  pending: { color: 'default', text: '待执行' },
  validating: { color: 'processing', text: '校验中' },
  deploying: { color: 'processing', text: '部署中' },
  completed: { color: 'success', text: '已完成' },
  failed: { color: 'error', text: '失败' },
  rolled_back: { color: 'warning', text: '已回滚' },
  cancelled: { color: 'default', text: '已取消' },
}

function ConfigPreview({ config }: { config: DeploymentPreviewConfig }) {
  const items = [
    { key: 'ip', label: 'IP 配置', data: config.ip },
    { key: 'ndn', label: 'NDN 配置', data: config.ndn },
    { key: 'geo', label: 'GEO 配置', data: config.geo },
    { key: 'p4', label: 'P4 配置', data: config.p4 },
  ].filter((item) => item.data && Object.keys(item.data).length > 0)

  if (items.length === 0) {
    return <Text type="secondary">暂无配置预览</Text>
  }

  return (
    <Collapse
      defaultActiveKey={items.map((item) => item.key)}
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        children: <pre style={{ margin: 0 }}>{JSON.stringify(item.data, null, 2)}</pre>,
      }))}
    />
  )
}

const Deploy: React.FC = () => {
  const currentProject = useProjectStore((state) => state.currentProject)
  const currentProjectId = useProjectStore((state) => state.currentProjectId)
  const {
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
    setProgressLogs,
    progressPercent,
    setProgressPercent,
    clearProgress,
    deploymentList,
    setDeploymentList,
    listLoading,
  } = useDeployStore()

  const [intentOptions, setIntentOptions] = useState<Array<{ id: string; name: string }>>([])
  const [topologyOptions, setTopologyOptions] = useState<Array<{ id: string; name: string }>>([])
  const [deploying, setDeploying] = useState(false)
  const [rollbacking, setRollbacking] = useState(false)

  const loadProjectScopedResources = useCallback(async () => {
    if (!currentProjectId) {
      setIntentOptions([])
      setTopologyOptions([])
      setDeploymentList([])
      return
    }
    const [intentRes, topologyRes, deploymentRes] = await Promise.all([
      intentApi.getList({ pageNo: 1, pageSize: 100, projectId: currentProjectId }),
      topologyApi.getList({ pageNo: 1, pageSize: 100, projectId: currentProjectId }),
      deployApi.getList({ pageNo: 1, pageSize: 100, projectId: currentProjectId }),
    ])
    setIntentOptions((intentRes.data?.records ?? []).map((item) => ({ id: item.id, name: item.name })))
    setTopologyOptions((topologyRes.data?.records ?? []).map((item) => ({ id: item.id, name: item.name })))
    setDeploymentList(deploymentRes.data?.records ?? [])
  }, [currentProjectId, setDeploymentList])

  useEffect(() => {
    loadProjectScopedResources()
  }, [loadProjectScopedResources])

  useEffect(() => {
    if (currentProject?.lastIntentId) {
      setSelectedIntentId(currentProject.lastIntentId)
    }
    if (currentProject?.topologyId) {
      setSelectedTopologyId(currentProject.topologyId)
    }
  }, [currentProject?.lastIntentId, currentProject?.topologyId, setSelectedIntentId, setSelectedTopologyId])

  const loadPreview = useCallback(async () => {
    if (!selectedIntentId || !selectedTopologyId || !currentProjectId) {
      setPreviewConfig(null)
      return
    }
    setPreviewLoading(true)
    try {
      const res = await deployApi.preview({
        intentId: selectedIntentId,
        topologyId: selectedTopologyId,
        projectId: currentProjectId,
      })
      setPreviewConfig(res.data?.configs ?? null)
    } finally {
      setPreviewLoading(false)
    }
  }, [currentProjectId, selectedIntentId, selectedTopologyId, setPreviewConfig, setPreviewLoading])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const handleStartDeploy = async () => {
    if (!selectedIntentId || !selectedTopologyId || !currentProjectId) {
      return
    }
    setDeploying(true)
    clearProgress()
    try {
      const res = await deployApi.deploy({
        intentId: selectedIntentId,
        topologyId: selectedTopologyId,
        projectId: currentProjectId,
      })
      setCurrentDeployment(res.data)
      setProgressLogs(res.data.logs ?? [])
      setProgressPercent(res.data.progress ?? 0)
      await loadProjectScopedResources()
    } finally {
      setDeploying(false)
    }
  }

  const handleRollback = async (deploymentId: string) => {
    setRollbacking(true)
    try {
      await deployApi.rollback(deploymentId)
      await loadProjectScopedResources()
      if (currentDeployment?.id === deploymentId) {
        const detail = await deployApi.getById(deploymentId)
        setCurrentDeployment(detail.data)
      }
    } finally {
      setRollbacking(false)
    }
  }

  const handleCancel = async (deploymentId: string) => {
    await deployApi.cancel(deploymentId)
    await loadProjectScopedResources()
  }

  const currentDeploymentStatus = currentDeployment?.status ?? 'pending'
  const canDeploy = !!selectedIntentId && !!selectedTopologyId && !!currentProjectId
  const currentIntentName = intentOptions.find((item) => item.id === selectedIntentId)?.name ?? '未选择'
  const currentTopologyName = topologyOptions.find((item) => item.id === selectedTopologyId)?.name ?? '未选择'

  const deploymentColumns = useMemo(
    () => [
      { title: '部署 ID', dataIndex: 'id', key: 'id', ellipsis: true },
      { title: '意图', dataIndex: 'intentId', key: 'intentId' },
      { title: '拓扑', dataIndex: 'topologyId', key: 'topologyId' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: DeploymentStatus) => (
          <Tag color={statusMap[status]?.color}>{statusMap[status]?.text ?? status}</Tag>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: '操作',
        key: 'actions',
        render: (_: unknown, record: Deployment) => (
          <Space size="small">
            {record.status === 'completed' && (
              <Button type="link" danger size="small" onClick={() => handleRollback(record.id)}>
                回滚
              </Button>
            )}
            {(record.status === 'deploying' || record.status === 'validating') && (
              <Button type="link" size="small" onClick={() => handleCancel(record.id)}>
                取消
              </Button>
            )}
          </Space>
        ),
      },
    ],
    []
  )

  if (!currentProject) {
    return (
      <div className={styles.deploy}>
        <Empty description="请先选择项目，然后再进入模态部署" />
      </div>
    )
  }

  return (
    <Space direction="vertical" size={24} className={styles.deploy} style={{ width: '100%' }}>
      <div className={styles.header}>
        <div>
          <Title level={2}>模态部署</Title>
          <Text type="secondary">围绕当前项目的最近编译产物和项目拓扑完成部署与回滚。</Text>
        </div>
      </div>

      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text strong>当前项目：{currentProject.name}</Text>
          <Space wrap>
            <Select
              style={{ width: 260 }}
              value={selectedIntentId || undefined}
              placeholder="选择项目内可部署意图"
              options={intentOptions.map((item) => ({ value: item.id, label: item.name }))}
              onChange={setSelectedIntentId}
            />
            <Select
              style={{ width: 260 }}
              value={selectedTopologyId || undefined}
              placeholder="选择项目拓扑"
              options={topologyOptions.map((item) => ({ value: item.id, label: item.name }))}
              onChange={setSelectedTopologyId}
            />
            <Button icon={<ReloadOutlined />} onClick={loadProjectScopedResources} loading={listLoading}>
              刷新项目资源
            </Button>
          </Space>
          <Text type="secondary">
            当前将以意图「{currentIntentName}」和拓扑「{currentTopologyName}」作为部署输入。
          </Text>
        </Space>
      </Card>

      <Tabs
        items={[
          {
            key: 'wizard',
            label: '部署执行',
            children: (
              <Card>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <div>
                    <Text strong>配置预览</Text>
                    <div style={{ marginTop: 12 }}>
                      {previewLoading ? (
                        <Text type="secondary">正在加载项目部署预览…</Text>
                      ) : previewConfig ? (
                        <ConfigPreview config={previewConfig} />
                      ) : (
                        <Empty description="当前项目尚无可预览配置" />
                      )}
                    </div>
                  </div>

                  <Space>
                    <Button
                      type="primary"
                      icon={<CloudUploadOutlined />}
                      disabled={!canDeploy}
                      loading={deploying}
                      onClick={handleStartDeploy}
                    >
                      开始部署
                    </Button>
                  </Space>

                  {currentDeployment && (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <Space align="center">
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Tag color={statusMap[currentDeploymentStatus]?.color}>
                          {statusMap[currentDeploymentStatus]?.text ?? currentDeploymentStatus}
                        </Tag>
                        <Text type="secondary">部署 ID: {currentDeployment.id}</Text>
                      </Space>
                      <Progress percent={progressPercent} />
                      <div style={{ maxHeight: 240, overflow: 'auto', padding: 12, borderRadius: 8, background: '#fafafa' }}>
                        {progressLogs.map((log: DeploymentLog, index: number) => (
                          <div key={`${log.timestamp}-${index}`} style={{ marginBottom: 8 }}>
                            <Text type="secondary">[{log.timestamp}]</Text> {log.message}
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
                          <Button icon={<StopOutlined />} onClick={() => handleCancel(currentDeployment.id)}>
                            取消部署
                          </Button>
                        )}
                      </Space>
                    </Space>
                  )}
                </Space>
              </Card>
            ),
          },
          {
            key: 'history',
            label: '项目部署记录',
            children: (
              <Card>
                <Table<Deployment>
                  rowKey="id"
                  loading={listLoading}
                  dataSource={deploymentList}
                  columns={deploymentColumns}
                  pagination={false}
                  locale={{ emptyText: <Empty description="当前项目暂无部署记录" /> }}
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
