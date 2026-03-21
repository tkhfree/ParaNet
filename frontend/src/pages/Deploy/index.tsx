import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  RollbackOutlined,
  StopOutlined,
} from '@ant-design/icons'

import { deployApi } from '@/api/deploy'
import type {
  Deployment,
  DeploymentLog,
  DeploymentStatus,
  SshConnectionStatus,
  SshConnectionStatusValue,
} from '@/api/deploy'
import { intentApi, projectApi, topologyApi } from '@/api'
import type { ProjectResourceCheckData } from '@/api/project'
import type { DeploymentPreviewConfig } from '@/model/deploy'
import useDeployStore from '@/stores/deploy'
import useProjectStore from '@/stores/project'
import { formatDateTime } from '@/utils'
import { useDeployProgressWebSocket } from '@/hooks/useDeployProgressWebSocket'

import styles from './index.module.less'

const { Title, Text } = Typography

const COMPILE_ARTIFACT_TOOLTIP =
  '来自「模态编译」页点击「保存为可部署产物」生成的记录：包含当时 DSL、编译 IR，以及写入项目 output/ 目录的 P4、entries.json、manifest 等，作为本次部署使用的数据面配置来源。'

const TOPOLOGY_TOOLTIP =
  '项目中的拓扑快照，用于确定设备节点、链路与各设备 SSH 信息；应与编译该产物时采用的拓扑一致（或节点集合兼容），以便将配置正确映射到目标设备。'

const statusMap: Record<DeploymentStatus, { color: string; text: string }> = {
  pending: { color: 'default', text: '待执行' },
  validating: { color: 'processing', text: '校验中' },
  deploying: { color: 'processing', text: '部署中' },
  completed: { color: 'success', text: '已完成' },
  failed: { color: 'error', text: '失败' },
  rolled_back: { color: 'warning', text: '已回滚' },
  cancelled: { color: 'default', text: '已取消' },
}

const sshStatusMap: Record<SshConnectionStatusValue, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待' },
  connected: { color: 'success', text: '已连接' },
  failed: { color: 'error', text: '失败' },
  skipped: { color: 'warning', text: '跳过' },
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

function ResourceCheckResultModal({
  open,
  onClose,
  payload,
}: {
  open: boolean
  onClose: () => void
  payload: ProjectResourceCheckData | null
}) {
  if (!payload) return null
  const checks = payload.checks as Record<string, unknown> | undefined
  const summary = checks?.summary as Record<string, unknown> | undefined
  const ssh = (checks?.ssh as Array<Record<string, unknown>>) ?? []
  const topoFile = checks?.topologyFile as Record<string, unknown> | undefined
  const out = checks?.outputArtifacts as Record<string, unknown> | undefined
  const record = checks?.compileArtifactRecord as Record<string, unknown> | undefined
  const perNode = (out?.perNode as Array<Record<string, unknown>>) ?? []
  const manifest = out?.manifest as Record<string, unknown> | undefined
  const hints = (summary?.hints as string[]) ?? []

  return (
    <Modal
      title="项目资源检查结果"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={720}
      destroyOnClose
    >
      {!payload.ok && payload.error ? (
        <Text type="danger">{payload.error}</Text>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Text strong>总览 </Text>
            <Tag color={summary?.ok ? 'success' : 'error'}>{summary?.ok ? '通过' : '存在问题'}</Tag>
            {hints.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {hints.map((h, i) => (
                  <li key={i}>
                    <Text type="warning">{h}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="编译产物记录">
              {record?.exists ? <Tag color="success">存在</Tag> : <Tag>缺失</Tag>}
              <Text type="secondary"> {String(record?.message ?? '')}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="物化拓扑文件">
              {topoFile ? (
                <>
                  <div>{String(topoFile.expectedPath ?? '')}</div>
                  <Tag color={topoFile.onDisk ? 'success' : 'default'}>磁盘 {topoFile.onDisk ? '有' : '无'}</Tag>
                  <Tag color={topoFile.inEditorFileTree ? 'success' : 'default'}>
                    文件树 {topoFile.inEditorFileTree ? '已登记' : '未登记'}
                  </Tag>
                </>
              ) : (
                <Text type="secondary">—</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="output/manifest">
              {manifest ? (
                <>
                  <Tag color={manifest.onDisk ? 'success' : 'default'}>磁盘 {manifest.onDisk ? '有' : '无'}</Tag>
                  <Tag color={manifest.inEditor ? 'success' : 'default'}>
                    文件树 {manifest.inEditor ? '已登记' : '未登记'}
                  </Tag>
                  {manifest.parseError ? (
                    <Text type="danger"> {String(manifest.parseError)}</Text>
                  ) : null}
                </>
              ) : (
                '—'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="产物目录">{String(out?.note ?? '—')}</Descriptions.Item>
          </Descriptions>

          {ssh.length > 0 && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                SSH 探测（按拓扑节点）
              </Text>
              <Table
                size="small"
                pagination={false}
                rowKey={(r) => String(r.nodeId)}
                dataSource={ssh}
                columns={[
                  { title: '设备', dataIndex: 'name', key: 'name', width: 120, ellipsis: true },
                  { title: '地址', key: 'addr', render: (_, r) => `${r.host || '—'}:${r.port}` },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 100,
                    render: (s: string) => (
                      <Tag color={sshStatusMap[s as SshConnectionStatusValue]?.color}>{s}</Tag>
                    ),
                  },
                  { title: '说明', dataIndex: 'message', key: 'message', ellipsis: true },
                ]}
              />
            </div>
          )}

          {perNode.length > 0 && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                各节点 output 文件
              </Text>
              <Table
                size="small"
                pagination={false}
                rowKey={(r) => String(r.nodeId)}
                dataSource={perNode}
                columns={[
                  { title: '节点', dataIndex: 'nodeId', width: 100 },
                  {
                    title: 'program.p4',
                    key: 'p4',
                    render: (_, r) => {
                      const p = r.programP4 as Record<string, unknown>
                      return (
                        <Space size={4} wrap>
                          <Tag color={p?.onDisk ? 'success' : 'error'}>盘</Tag>
                          <Tag color={p?.inEditor ? 'success' : 'default'}>树</Tag>
                        </Space>
                      )
                    },
                  },
                  {
                    title: 'entries.json',
                    key: 'ent',
                    render: (_, r) => {
                      const p = r.entriesJson as Record<string, unknown>
                      return (
                        <Space size={4} wrap>
                          <Tag color={p?.onDisk ? 'success' : 'error'}>盘</Tag>
                          <Tag color={p?.inEditor ? 'success' : 'default'}>树</Tag>
                        </Space>
                      )
                    },
                  },
                ]}
              />
            </div>
          )}
        </Space>
      )}
    </Modal>
  )
}

const Deploy: React.FC = () => {
  const { message } = App.useApp()
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
    sshConnections,
    setSshConnections,
    setListLoading,
  } = useDeployStore()

  useDeployProgressWebSocket(
    currentDeployment?.id,
    currentDeployment?.status === 'deploying'
  )

  const [intentOptions, setIntentOptions] = useState<Array<{ id: string; name: string }>>([])
  const [topologyOptions, setTopologyOptions] = useState<Array<{ id: string; name: string }>>([])
  const [deploying, setDeploying] = useState(false)
  const [rollbacking, setRollbacking] = useState(false)
  const [resourceCheckOpen, setResourceCheckOpen] = useState(false)
  const [resourceCheckPayload, setResourceCheckPayload] = useState<ProjectResourceCheckData | null>(null)

  const refreshListsOnly = useCallback(async () => {
    if (!currentProjectId) {
      setIntentOptions([])
      setTopologyOptions([])
      setDeploymentList([])
      return
    }
    setListLoading(true)
    try {
      const [intentRes, topologyRes, deploymentRes] = await Promise.all([
        intentApi.getList({ pageNo: 1, pageSize: 100, projectId: currentProjectId }),
        topologyApi.getList({ pageNo: 1, pageSize: 100, projectId: currentProjectId }),
        deployApi.getList({ pageNo: 1, pageSize: 100, projectId: currentProjectId }),
      ])
      setIntentOptions((intentRes.data?.records ?? []).map((item) => ({ id: item.id, name: item.name })))
      setTopologyOptions((topologyRes.data?.records ?? []).map((item) => ({ id: item.id, name: item.name })))
      setDeploymentList(deploymentRes.data?.records ?? [])
    } finally {
      setListLoading(false)
    }
  }, [currentProjectId, setDeploymentList, setListLoading])

  const refreshListsAndRunChecks = useCallback(async () => {
    await refreshListsOnly()
    if (!currentProjectId) return
    try {
      const checkRes = await projectApi.checkProjectResources({
        projectId: currentProjectId,
        topologyId: selectedTopologyId || undefined,
        compileArtifactId: selectedIntentId || undefined,
      })
      setResourceCheckPayload(checkRes.data ?? null)
      setResourceCheckOpen(true)
    } catch (e) {
      message.error((e as Error).message || '资源检查请求失败')
    }
  }, [currentProjectId, message, refreshListsOnly, selectedIntentId, selectedTopologyId])

  useEffect(() => {
    void refreshListsOnly()
  }, [refreshListsOnly])

  useEffect(() => {
    if (currentProject?.lastCompileArtifactId) {
      setSelectedIntentId(currentProject.lastCompileArtifactId)
    }
    if (currentProject?.topologyId) {
      setSelectedTopologyId(currentProject.topologyId)
    }
  }, [currentProject?.lastCompileArtifactId, currentProject?.topologyId, setSelectedIntentId, setSelectedTopologyId])

  const loadPreview = useCallback(async () => {
    if (!selectedIntentId || !selectedTopologyId || !currentProjectId) {
      setPreviewConfig(null)
      return
    }
    setPreviewLoading(true)
    try {
      const res = await deployApi.preview({
        compileArtifactId: selectedIntentId,
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
        compileArtifactId: selectedIntentId,
        topologyId: selectedTopologyId,
        projectId: currentProjectId,
      })
      setCurrentDeployment(res.data)
      setProgressLogs(res.data.logs ?? [])
      setProgressPercent(res.data.progress ?? 0)
      setSshConnections(res.data.sshConnections ?? [])
      await refreshListsOnly()
    } finally {
      setDeploying(false)
    }
  }

  const handleRollback = async (deploymentId: string) => {
    setRollbacking(true)
    try {
      await deployApi.rollback(deploymentId)
      await refreshListsOnly()
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
    await refreshListsOnly()
  }

  const currentDeploymentStatus = currentDeployment?.status ?? 'pending'
  const canDeploy = !!selectedIntentId && !!selectedTopologyId && !!currentProjectId
  const currentIntentName = intentOptions.find((item) => item.id === selectedIntentId)?.name ?? '未选择'
  const currentTopologyName = topologyOptions.find((item) => item.id === selectedTopologyId)?.name ?? '未选择'

  const deploymentColumns = useMemo(
    () => [
      { title: '部署 ID', dataIndex: 'id', key: 'id', ellipsis: true },
      {
        title: '编译产物记录',
        key: 'artifact',
        render: (_: unknown, r: Deployment) => r.compileArtifactId || r.intentId,
      },
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
        <Empty description="请先选择项目，然后再使用模态部署子系统" />
      </div>
    )
  }

  return (
    <Space direction="vertical" size={24} className={styles.deploy} style={{ width: '100%' }}>
      <div className={styles.header}>
        <div>
          <Title level={2}>模态部署子系统</Title>
          <Text type="secondary">围绕当前项目的最近编译产物和项目拓扑完成部署与回滚。</Text>
        </div>
      </div>

      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text strong>当前项目：{currentProject.name}</Text>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div style={{ maxWidth: 420 }}>
              <Space size={6} align="center" style={{ marginBottom: 6 }}>
                <Text strong>可部署编译产物</Text>
                <Tooltip title={COMPILE_ARTIFACT_TOOLTIP}>
                  <InfoCircleOutlined style={{ color: 'var(--ant-color-text-tertiary)', cursor: 'help' }} />
                </Tooltip>
              </Space>
              <Select
                style={{ width: '100%' }}
                value={selectedIntentId || undefined}
                placeholder="选择一条已保存的编译产物记录"
                options={intentOptions.map((item) => ({ value: item.id, label: item.name }))}
                onChange={setSelectedIntentId}
              />
            </div>
            <div style={{ maxWidth: 420 }}>
              <Space size={6} align="center" style={{ marginBottom: 6 }}>
                <Text strong>拓扑</Text>
                <Tooltip title={TOPOLOGY_TOOLTIP}>
                  <InfoCircleOutlined style={{ color: 'var(--ant-color-text-tertiary)', cursor: 'help' }} />
                </Tooltip>
              </Space>
              <Select
                style={{ width: '100%' }}
                value={selectedTopologyId || undefined}
                placeholder="选择用于本次部署的拓扑"
                options={topologyOptions.map((item) => ({ value: item.id, label: item.name }))}
                onChange={setSelectedTopologyId}
              />
            </div>
            <div>
            <Button icon={<ReloadOutlined />} onClick={() => void refreshListsAndRunChecks()} loading={listLoading}>
              刷新项目资源
            </Button>
            </div>
          </Space>
          <Text type="secondary">
            将使用编译产物记录「{currentIntentName}」与拓扑「{currentTopologyName}」作为本次部署输入。
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
                      {(sshConnections.length > 0 || currentDeployment.status === 'deploying') && (
                        <div style={{ width: '100%' }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            SSH 连接状态（与模态开发拓扑中设备 SSH 配置对应）
                          </Text>
                          <Table<SshConnectionStatus>
                            size="small"
                            pagination={false}
                            rowKey={(row) => `${row.nodeId}-${row.host}-${row.port}`}
                            dataSource={sshConnections}
                            locale={{
                              emptyText:
                                currentDeployment.status === 'deploying'
                                  ? '正在按拓扑节点建立 SSH 连接…'
                                  : '暂无 SSH 记录',
                            }}
                            columns={[
                              { title: '设备', dataIndex: 'name', key: 'name', ellipsis: true },
                              {
                                title: 'SSH 地址',
                                key: 'addr',
                                render: (_, row) => (
                                  <span>
                                    {row.host || '—'}:{row.port}
                                  </span>
                                ),
                              },
                              {
                                title: '状态',
                                dataIndex: 'status',
                                key: 'status',
                                width: 100,
                                render: (s: SshConnectionStatusValue) => (
                                  <Tag color={sshStatusMap[s]?.color}>{sshStatusMap[s]?.text ?? s}</Tag>
                                ),
                              },
                              {
                                title: '说明',
                                dataIndex: 'message',
                                key: 'message',
                                ellipsis: true,
                              },
                            ]}
                          />
                        </div>
                      )}
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
      <ResourceCheckResultModal
        open={resourceCheckOpen}
        onClose={() => setResourceCheckOpen(false)}
        payload={resourceCheckPayload}
      />
    </Space>
  )
}

export default Deploy
