import styles from './index.module.less'

import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Splitter,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRequest } from 'ahooks'
import {
  ActionParam,
  ControlPlaneDevice,
  FlowTableEntry,
  MatchField,
  deleteFlowTable,
  disableFlowTable,
  enableFlowTable,
  fetchControlPlaneDevices,
  fetchFlowTable,
  saveFlowTable,
} from '@/api/control-plane'
import { getTopologyDetail } from '@/api/file'
import { fetchProjectList } from '@/api/project'
import { Previewer } from '@/pages/ProjectManage/Topology/topology-engine'
import { INodeClickEvent, ITopology } from '@/pages/ProjectManage/Topology/types'

interface MatchFieldFormItem extends MatchField {}

interface ActionParamFormItem extends ActionParam {}

interface FlowFormData {
  action: string
  actionName: string
  actionParams: ActionParamFormItem[]
  byteCount?: number
  enabled?: boolean
  id?: string
  matchRule: string
  matchFields: MatchFieldFormItem[]
  packetCount?: number
  priority?: number
  remark?: string
  tableId?: string
}

const MATCH_TYPE_OPTIONS = [
  { label: 'EXACT', value: 'EXACT' },
  { label: 'LPM', value: 'LPM' },
  { label: 'TERNARY', value: 'TERNARY' },
  { label: 'RANGE', value: 'RANGE' },
]

const createEmptyMatchField = (): MatchFieldFormItem => ({
  fieldName: '',
  mask: '',
  matchType: 'EXACT',
  value: '',
})

const createEmptyActionParam = (): ActionParamFormItem => ({
  paramName: '',
  value: '',
})

const parseMatchRuleText = (matchRule?: string): MatchFieldFormItem[] => {
  if (!matchRule?.trim()) return [createEmptyMatchField()]
  return matchRule
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const [fieldName = '', rawValue = ''] = item.split('=', 2)
      if (rawValue.includes('/')) {
        const [value, mask] = rawValue.split('/', 2)
        return {
          fieldName: fieldName.trim(),
          mask: mask?.trim() || '',
          matchType: 'LPM',
          value: value.trim(),
        }
      }
      return {
        fieldName: fieldName.trim(),
        mask: '',
        matchType: 'EXACT',
        value: rawValue.trim(),
      }
    })
}

const parseActionText = (
  actionText?: string,
): {
  actionName: string
  actionParams: ActionParamFormItem[]
} => {
  if (!actionText?.trim()) {
    return { actionName: '', actionParams: [] }
  }
  const trimmed = actionText.trim()
  const leftIndex = trimmed.indexOf('(')
  const rightIndex = trimmed.lastIndexOf(')')
  if (leftIndex > 0 && rightIndex > leftIndex) {
    const actionName = trimmed.slice(0, leftIndex).trim()
    const rawParams = trimmed.slice(leftIndex + 1, rightIndex)
    const actionParams = rawParams
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .map((item, index) => {
        const [paramName, value] = item.split('=', 2)
        if (value !== undefined) {
          return {
            paramName: paramName.trim(),
            value: value.trim(),
          }
        }
        return {
          paramName: `param${index + 1}`,
          value: paramName.trim(),
        }
      })
    return {
      actionName,
      actionParams,
    }
  }

  const [maybeActionName, maybeValue] = trimmed.split(':', 2)
  if (maybeValue !== undefined) {
    return {
      actionName: maybeActionName.trim(),
      actionParams: [{ paramName: 'param1', value: maybeValue.trim() }],
    }
  }

  return {
    actionName: trimmed,
    actionParams: [],
  }
}

const normalizeMatchFields = (matchFields?: MatchFieldFormItem[]): MatchFieldFormItem[] =>
  (matchFields || [])
    .map(item => ({
      fieldName: item?.fieldName?.trim() || '',
      mask: item?.mask?.trim() || '',
      matchType: item?.matchType || 'EXACT',
      value: item?.value?.trim() || '',
    }))
    .filter(item => item.fieldName && item.value)

const normalizeActionParams = (params?: ActionParamFormItem[]): ActionParamFormItem[] =>
  (params || [])
    .map(item => ({
      paramName: item?.paramName?.trim() || '',
      value: item?.value?.trim() || '',
    }))
    .filter(item => item.paramName && item.value)

const buildMatchRuleFromFields = (matchFields: MatchFieldFormItem[]): string =>
  matchFields
    .map(item =>
      item.matchType === 'LPM' && item.mask
        ? `${item.fieldName}=${item.value}/${item.mask}`
        : `${item.fieldName}=${item.value}`,
    )
    .join(', ')

const buildActionText = (actionName: string, actionParams: ActionParamFormItem[]): string => {
  const normalizedActionName = actionName.trim()
  if (!normalizedActionName) return ''
  if (!actionParams.length) return normalizedActionName
  const paramsText = actionParams.map(item => `${item.paramName}=${item.value}`).join(', ')
  return `${normalizedActionName}(${paramsText})`
}

const renderMatchFieldsBlock = (record: FlowTableEntry) => {
  const items =
    record.matchFields && record.matchFields.length
      ? record.matchFields
      : parseMatchRuleText(record.matchRule)

  if (!items.length) {
    return <Typography.Text type="secondary">暂无匹配字段</Typography.Text>
  }

  return (
    <div className={styles.structuredCell}>
      {items.map((item, index) => (
        <div key={`${record.id}-match-${index}`} className={styles.structuredLine}>
          <Tag color="blue">{item.matchType || 'EXACT'}</Tag>
          <span className={styles.structuredKey}>{item.fieldName}</span>
          <span className={styles.structuredValue}>
            {item.value}
            {item.mask ? ` / ${item.mask}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

const renderActionBlock = (record: FlowTableEntry) => {
  const parsedAction =
    record.actionName || (record.actionParams && record.actionParams.length)
      ? {
          actionName: record.actionName || parseActionText(record.action).actionName,
          actionParams:
            record.actionParams && record.actionParams.length
              ? record.actionParams
              : parseActionText(record.action).actionParams,
        }
      : parseActionText(record.action)

  return (
    <div className={styles.structuredCell}>
      <div className={styles.structuredLine}>
        <Tag color="purple">Action</Tag>
        <span className={styles.structuredKey}>{parsedAction.actionName || '未命名动作'}</span>
      </div>
      {!!parsedAction.actionParams.length && (
        <div className={styles.structuredParams}>
          {parsedAction.actionParams.map((item, index) => (
            <Tag key={`${record.id}-action-${index}`}>
              {item.paramName}={item.value}
            </Tag>
          ))}
        </div>
      )}
    </div>
  )
}

const ControlPlane = () => {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [previewer, setPreviewer] = useState<Previewer>()
  const [projectId, setProjectId] = useState<string>()
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [topology, setTopology] = useState<ITopology>()
  const [devices, setDevices] = useState<ControlPlaneDevice[]>([])
  const [flowEntries, setFlowEntries] = useState<FlowTableEntry[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>()
  const [flowModalVisible, setFlowModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingTopology, setLoadingTopology] = useState(false)
  const [loadingDevices, setLoadingDevices] = useState(false)
  const [loadingFlows, setLoadingFlows] = useState(false)
  const [editingFlow, setEditingFlow] = useState<FlowTableEntry>()
  const [form] = Form.useForm<FlowFormData>()
  const watchedActionName = Form.useWatch('actionName', form)
  const watchedActionParams = Form.useWatch('actionParams', form)
  const watchedMatchFields = Form.useWatch('matchFields', form)

  const { data: projectList } = useRequest(() => fetchProjectList())

  useEffect(() => {
    if (!previewContainerRef.current) return
    const instance = new Previewer(previewContainerRef.current)
    setPreviewer(instance)

    return () => {
      instance.dispose()
    }
  }, [])

  useEffect(() => {
    if (!previewer) return

    const onNodeClick = (event: INodeClickEvent) => {
      const deviceName = event.data.设备名称
      setSelectedDevice(deviceName)
    }

    previewer.bus.on('NODE_CLICK', onNodeClick)
    return () => {
      previewer.bus.off('NODE_CLICK', onNodeClick)
    }
  }, [previewer])

  useEffect(() => {
    const renderTopology = async () => {
      if (!previewer) return
      if (!topology) {
        previewer.clear()
        return
      }
      await previewer.init()
      previewer.clear()
      previewer.deserialize(topology)
    }

    renderTopology()
  }, [previewer, topology])

  useEffect(() => {
    const normalizedMatchFields = normalizeMatchFields(watchedMatchFields)
    const normalizedActionParams = normalizeActionParams(watchedActionParams)
    form.setFieldValue('matchRule', buildMatchRuleFromFields(normalizedMatchFields))
    form.setFieldValue('action', buildActionText(watchedActionName || '', normalizedActionParams))
  }, [form, watchedActionName, watchedActionParams, watchedMatchFields])

  useEffect(() => {
    if (!projectId) {
      setTopology(undefined)
      setDevices([])
      setSelectedDevice(undefined)
      setFlowEntries([])
      return
    }

    const loadProjectContext = async () => {
      setLoadingTopology(true)
      setLoadingDevices(true)
      try {
        const [topologyResponse, deviceResponse] = await Promise.all([
          getTopologyDetail(projectId),
          fetchControlPlaneDevices(projectId),
        ])

        setTopology(JSON.parse(topologyResponse.data))
        setDevices(deviceResponse.data)
        setSelectedDevice(prev => {
          if (prev && deviceResponse.data.some(item => item.deviceName === prev)) {
            return prev
          }
          return deviceResponse.data[0]?.deviceName
        })
      } catch (error) {
        setTopology(undefined)
        setDevices([])
        setSelectedDevice(undefined)
        setFlowEntries([])
        message.error(typeof error === 'string' ? error : '加载控制面数据失败')
      } finally {
        setLoadingTopology(false)
        setLoadingDevices(false)
      }
    }

    loadProjectContext()
  }, [projectId, refreshIndex])

  useEffect(() => {
    if (!projectId || !selectedDevice) {
      setFlowEntries([])
      return
    }

    const loadFlowEntries = async () => {
      setLoadingFlows(true)
      try {
        const response = await fetchFlowTable(projectId, selectedDevice)
        setFlowEntries(response.data)
      } catch (error) {
        setFlowEntries([])
        message.error(typeof error === 'string' ? error : '加载流表失败')
      } finally {
        setLoadingFlows(false)
      }
    }

    loadFlowEntries()
  }, [projectId, selectedDevice])

  const selectedDeviceInfo = useMemo(
    () => devices.find(item => item.deviceName === selectedDevice),
    [devices, selectedDevice],
  )

  const refreshFlows = async () => {
    if (!projectId || !selectedDevice) return
    setLoadingFlows(true)
    try {
      const response = await fetchFlowTable(projectId, selectedDevice)
      setFlowEntries(response.data)
    } catch (error) {
      message.error(typeof error === 'string' ? error : '刷新流表失败')
    } finally {
      setLoadingFlows(false)
    }
  }

  const openCreateModal = () => {
    setEditingFlow(undefined)
    form.setFieldsValue({
      action: '',
      actionName: '',
      actionParams: [],
      byteCount: 0,
      enabled: true,
      matchRule: '',
      matchFields: [createEmptyMatchField()],
      packetCount: 0,
      priority: 100,
      remark: '',
      tableId: '0',
    })
    setFlowModalVisible(true)
  }

  const openEditModal = (record: FlowTableEntry) => {
    setEditingFlow(record)
    const actionParsed =
      record.actionName || (record.actionParams && record.actionParams.length)
        ? {
            actionName: record.actionName || parseActionText(record.action).actionName,
            actionParams:
              record.actionParams && record.actionParams.length
                ? record.actionParams
                : parseActionText(record.action).actionParams,
          }
        : parseActionText(record.action)
    const matchFields =
      record.matchFields && record.matchFields.length
        ? record.matchFields
        : parseMatchRuleText(record.matchRule)
    form.setFieldsValue({
      action: record.action,
      actionName: actionParsed.actionName,
      actionParams: actionParsed.actionParams,
      byteCount: record.byteCount,
      enabled: record.enabled,
      id: record.id,
      matchRule: record.matchRule,
      matchFields,
      packetCount: record.packetCount,
      priority: record.priority,
      remark: record.remark,
      tableId: record.tableId,
    })
    setFlowModalVisible(true)
  }

  const submitFlow = async () => {
    if (!projectId || !selectedDevice) {
      message.warning('请先选择项目和网元')
      return
    }

    const values = await form.validateFields()
    const matchFields = normalizeMatchFields(values.matchFields)
    const actionParams = normalizeActionParams(values.actionParams)
    const actionName = values.actionName.trim()

    if (!matchFields.length) {
      message.warning('请至少填写一条匹配字段')
      return
    }
    if (!actionName) {
      message.warning('请填写动作名称')
      return
    }

    const matchRule = buildMatchRuleFromFields(matchFields)
    const action = buildActionText(actionName, actionParams)
    setSaving(true)
    try {
      await saveFlowTable({
        ...values,
        action,
        actionName,
        actionParams,
        deviceName: selectedDevice,
        matchFields,
        matchRule,
        projectId,
      })
      message.success(editingFlow ? '流表更新成功' : '流表创建成功')
      setFlowModalVisible(false)
      await refreshFlows()
    } catch (error) {
      message.error(typeof error === 'string' ? error : '保存流表失败')
    } finally {
      setSaving(false)
    }
  }

  const toggleFlow = async (record: FlowTableEntry, enabled: boolean) => {
    if (!projectId || !selectedDevice) return
    try {
      if (enabled) {
        await enableFlowTable({ deviceName: selectedDevice, id: record.id, projectId })
      } else {
        await disableFlowTable({ deviceName: selectedDevice, id: record.id, projectId })
      }
      message.success(enabled ? '流表已启用' : '流表已禁用')
      await refreshFlows()
    } catch (error) {
      message.error(typeof error === 'string' ? error : '更新流表状态失败')
    }
  }

  const removeFlow = (record: FlowTableEntry) => {
    if (!projectId || !selectedDevice) return
    Modal.confirm({
      onOk: async () => {
        await deleteFlowTable({ deviceName: selectedDevice, id: record.id, projectId })
        message.success('流表删除成功')
        await refreshFlows()
      },
      title: `确定删除流表 ${record.id} 吗？`,
    })
  }

  const columns = [
    {
      dataIndex: 'tableId',
      key: 'tableId',
      title: '表 ID',
      width: 90,
    },
    {
      dataIndex: 'priority',
      key: 'priority',
      title: '优先级',
      width: 90,
    },
    {
      key: 'matchRule',
      render: (_: unknown, record: FlowTableEntry) => renderMatchFieldsBlock(record),
      title: '匹配字段',
      width: 320,
    },
    {
      key: 'action',
      render: (_: unknown, record: FlowTableEntry) => renderActionBlock(record),
      title: '动作',
      width: 260,
    },
    {
      dataIndex: 'enabled',
      key: 'enabled',
      title: '状态',
      render: (_: unknown, record: FlowTableEntry) => (
        <Switch checked={record.enabled} onChange={checked => toggleFlow(record, checked)} />
      ),
      width: 100,
    },
    {
      dataIndex: 'packetCount',
      key: 'packetCount',
      title: '报文数',
      width: 110,
    },
    {
      dataIndex: 'byteCount',
      key: 'byteCount',
      title: '字节数',
      width: 110,
    },
    {
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      title: '更新时间',
      width: 190,
    },
    {
      dataIndex: 'remark',
      key: 'remark',
      title: '备注',
      width: 160,
    },
    {
      key: 'operation',
      render: (_: unknown, record: FlowTableEntry) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button danger size="small" type="link" onClick={() => removeFlow(record)}>
            删除
          </Button>
        </Space>
      ),
      title: '操作',
      width: 120,
    },
  ]

  return (
    <div className={styles.container}>
      <Card className={styles.toolbar}>
        <Space wrap>
          <Typography.Text strong>项目</Typography.Text>
          <Select
            style={{ width: 280 }}
            placeholder="请选择项目"
            value={projectId}
            onChange={value => setProjectId(value)}
            options={(projectList?.data || []).map((item: { id: string; name: string }) => ({
              label: item.name,
              value: String(item.id),
            }))}
          />
          <Button onClick={() => projectId && setRefreshIndex(value => value + 1)}>
            刷新页面数据
          </Button>
        </Space>
      </Card>

      <div className={styles.content}>
        <Splitter>
          <Splitter.Panel min="420px" defaultSize="46%">
            <Card
              className={styles.topologyCard}
              title="网络拓扑"
              extra={
                selectedDeviceInfo ? (
                  <Tag color="blue">{selectedDeviceInfo.deviceName}</Tag>
                ) : (
                  <Tag>未选择网元</Tag>
                )
              }
            >
              <div className={styles.topologyContent}>
                <div ref={previewContainerRef} className={styles.topologyPreview}></div>
                {!projectId && (
                  <div className={styles.topologyMask}>
                    <Empty description="请先选择项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                )}
                {projectId && loadingTopology && (
                  <div className={styles.topologyMask}>拓扑加载中...</div>
                )}
                {projectId && !loadingTopology && !topology && (
                  <div className={styles.topologyMask}>
                    <Empty
                      description="当前项目暂无可用拓扑"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </div>
                )}
              </div>
            </Card>
          </Splitter.Panel>
          <Splitter.Panel min="520px">
            <div className={styles.rightPanel}>
              <Card
                title="网元列表"
                extra={
                  <Button disabled={!selectedDevice} onClick={() => refreshFlows()}>
                    刷新流表
                  </Button>
                }
              >
                {projectId ? (
                  <List
                    loading={loadingDevices}
                    dataSource={devices}
                    renderItem={item => (
                      <List.Item
                        className={
                          item.deviceName === selectedDevice ? styles.activeDeviceItem : ''
                        }
                        onClick={() => setSelectedDevice(item.deviceName)}
                      >
                        <div className={styles.deviceItem}>
                          <div>
                            <div className={styles.deviceName}>{item.deviceName}</div>
                            <div className={styles.deviceIp}>{item.ip}</div>
                          </div>
                          <Tag>{item.flowCount} 条</Tag>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="请先选择项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>

              <Card
                title="流表操作"
                extra={
                  <Space>
                    {selectedDeviceInfo && <Tag color="processing">{selectedDeviceInfo.ip}</Tag>}
                    <Tag color="purple">P4Runtime 结构化表单</Tag>
                    <Button type="primary" disabled={!selectedDevice} onClick={openCreateModal}>
                      新增流表
                    </Button>
                  </Space>
                }
              >
                {selectedDevice ? (
                  <>
                    <div className={styles.deviceSummary}>
                      <Typography.Text>
                        当前网元：<Typography.Text strong>{selectedDevice}</Typography.Text>
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        点击左侧拓扑中的网元，或在上方列表中选择网元后查看和操作流表。
                      </Typography.Text>
                    </div>
                    <Table
                      rowKey="id"
                      loading={loadingFlows}
                      columns={columns}
                      dataSource={flowEntries}
                      pagination={{ pageSize: 8 }}
                      scroll={{ x: 1100 }}
                    />
                  </>
                ) : (
                  <Empty description="请选择一个网元" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </div>
          </Splitter.Panel>
        </Splitter>
      </div>

      <Modal
        title={editingFlow ? '编辑流表' : '新增流表'}
        open={flowModalVisible}
        onOk={submitFlow}
        onCancel={() => setFlowModalVisible(false)}
        confirmLoading={saving}
        destroyOnClose
        width={920}
      >
        <Form form={form} layout="vertical">
          <Alert
            className={styles.formAlert}
            message="当前弹窗使用标准 P4Runtime 结构化表单。你填写 matchFields 与 action params 后，页面会自动生成摘要字符串并提交给后端。"
            type="info"
            showIcon
          />
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="表 ID" name="tableId">
            <Input placeholder="例如 0" />
          </Form.Item>
          <Form.Item label="优先级" name="priority">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <div className={styles.formSectionTitle}>匹配字段 Match Fields</div>
          <div className={styles.formSectionHint}>
            每一项对应一个匹配字段，常见字段如 `hdr.ipv4.dstAddr`、`hdr.tcp.dstPort`。
          </div>
          <Form.List name="matchFields">
            {(fields, { add, remove }) => (
              <div className={styles.listBlock}>
                {!fields.length && (
                  <div className={styles.formSectionHint}>
                    当前没有匹配字段，请先新增一条匹配条件。
                  </div>
                )}
                {fields.map(field => (
                  <div key={field.key} className={styles.listRow}>
                    <Form.Item
                      {...field}
                      className={styles.listField}
                      label="字段名"
                      name={[field.name, 'fieldName']}
                      rules={[{ required: true, message: '请输入字段名' }]}
                    >
                      <Input placeholder="例如 hdr.ipv4.dstAddr" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      className={styles.listType}
                      label="匹配类型"
                      name={[field.name, 'matchType']}
                      rules={[{ required: true, message: '请选择匹配类型' }]}
                    >
                      <Select options={MATCH_TYPE_OPTIONS} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      className={styles.listField}
                      label="值"
                      name={[field.name, 'value']}
                      rules={[{ required: true, message: '请输入匹配值' }]}
                    >
                      <Input placeholder="例如 10.0.0.1" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      className={styles.listField}
                      label="掩码/前缀"
                      name={[field.name, 'mask']}
                    >
                      <Input placeholder="LPM/TERNARY 可选，例如 32 或 255.255.255.0" />
                    </Form.Item>
                    <Button
                      danger
                      className={styles.rowDelete}
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}
                <Button block icon={<PlusOutlined />} onClick={() => add(createEmptyMatchField())}>
                  新增匹配字段
                </Button>
              </div>
            )}
          </Form.List>

          <div className={styles.formSectionTitle}>动作 Action</div>
          <div className={styles.formSectionHint}>
            推荐填写标准动作名和参数，后端会自动组装为 P4Runtime 风格动作定义。
          </div>
          <Form.Item
            label="动作名称"
            name="actionName"
            rules={[{ required: true, message: '请输入动作名称' }]}
          >
            <Input placeholder="例如 set_nhop / ipv4_forward" />
          </Form.Item>
          <Form.List name="actionParams">
            {(fields, { add, remove }) => (
              <div className={styles.listBlock}>
                {fields.map(field => (
                  <div key={field.key} className={styles.listRow}>
                    <Form.Item
                      {...field}
                      className={styles.listField}
                      label="参数名"
                      name={[field.name, 'paramName']}
                      rules={[{ required: true, message: '请输入参数名' }]}
                    >
                      <Input placeholder="例如 port" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      className={styles.listField}
                      label="参数值"
                      name={[field.name, 'value']}
                      rules={[{ required: true, message: '请输入参数值' }]}
                    >
                      <Input placeholder="例如 1" />
                    </Form.Item>
                    <Button
                      danger
                      className={styles.rowDelete}
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}
                <Button block icon={<PlusOutlined />} onClick={() => add(createEmptyActionParam())}>
                  新增动作参数
                </Button>
              </div>
            )}
          </Form.List>
          <Form.Item label="自动生成的匹配规则摘要" name="matchRule">
            <Input.TextArea
              rows={2}
              placeholder="提交时会根据上面的 Match Fields 自动生成"
              disabled
            />
          </Form.Item>
          <Form.Item label="自动生成的动作摘要" name="action">
            <Input.TextArea rows={2} placeholder="提交时会根据动作名称和参数自动生成" disabled />
          </Form.Item>
          <Form.Item label="报文数" name="packetCount">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="字节数" name="byteCount">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
          <Form.Item label="启用状态" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ControlPlane
