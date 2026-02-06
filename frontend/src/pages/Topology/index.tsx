import { useCallback, useRef, useEffect, useState } from 'react'
import { Button, Dropdown, Empty, message, Modal, Space, Table, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  PlusOutlined,
  DeploymentUnitOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { Topology } from '@/model/topology'
import { topologyApi } from '@/api/topology'
import { TopologyEditor, TopologyPreviewer } from '@/components/topology'
import styles from './index.module.less'

type ViewMode = 'list' | 'editor' | 'preview'

const { Title } = Typography

export default function TopologyPage() {
  const [list, setList] = useState<Topology[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewMode>('list')
  const [selectedId, setSelectedId] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [popupId, setPopupId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await topologyApi.getList({ pageNo: 1, pageSize: 100 })
      const records = (res as { data?: { records?: Topology[] } })?.data?.records ?? []
      setList(Array.isArray(records) ? records : [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleCreate = async () => {
    try {
      const res = await topologyApi.create({ name: '新拓扑', nodes: [], links: [] })
      const data = (res as { data?: Topology })?.data
      if (data?.id) {
        setSelectedId(data.id)
        setSelectedName(data.name)
        setView('editor')
        message.success('创建成功')
      } else {
        message.error('创建失败')
      }
    } catch (e: unknown) {
      message.error((e as Error)?.message ?? '创建失败')
    }
  }

  const handleEdit = (id: string, name: string) => {
    setSelectedId(id)
    setSelectedName(name)
    setView('editor')
  }

  const handleView = (id: string) => {
    setSelectedId(id)
    setView('preview')
  }

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除拓扑「${name}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await topologyApi.delete(id)
          message.success('已删除')
          if (view !== 'list') {
            setView('list')
            setSelectedId('')
          }
          fetchList()
        } catch (e: unknown) {
          message.error((e as Error)?.message ?? '删除失败')
        }
      },
    })
  }

  const backToList = () => {
    setView('list')
    setSelectedId('')
    setSelectedName('')
    setPopupId(null)
    fetchList()
  }

  const handleExport = async (id: string, name: string, format: 'json' | 'yaml') => {
    try {
      const res = await topologyApi.export(id, format)
      const blob = (res as { data?: Blob })?.data
      if (!blob) {
        message.error('导出失败')
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name || 'topology'}.${format === 'yaml' ? 'yml' : 'json'}`
      a.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (e: unknown) {
      message.error((e as Error)?.message ?? '导出失败')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    try {
      const res = await topologyApi.import(file)
      const data = (res as { data?: Topology })?.data
      if (data?.id) {
        message.success('导入成功')
        fetchList()
        setSelectedId(data.id)
        setSelectedName(data.name)
        setView('editor')
      } else {
        message.error('导入失败')
      }
    } catch (err: unknown) {
      message.error((err as Error)?.message ?? '导入失败')
    } finally {
      setImporting(false)
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: unknown, record: Topology) => {
        const exportItems: MenuProps['items'] = [
          { key: 'json', label: '导出 JSON', onClick: () => handleExport(record.id, record.name, 'json') },
          { key: 'yaml', label: '导出 YAML', onClick: () => handleExport(record.id, record.name, 'yaml') },
        ]
        return (
          <Space>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record.id)}>
              查看
            </Button>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.id, record.name)}>
              编辑
            </Button>
            <Dropdown menu={{ items: exportItems }} trigger={['click']}>
              <Button type="link" size="small" icon={<DownloadOutlined />}>
                导出
              </Button>
            </Dropdown>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id, record.name)}
            >
              删除
            </Button>
          </Space>
        )
      },
    },
  ]

  return (
    <div className={styles.topology}>
      {view === 'list' && (
        <>
          <div className={styles.header}>
            <Title level={4} style={{ margin: 0 }}>
              拓扑管理
            </Title>
            <Space>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yml,.yaml"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
              <Button
                icon={<UploadOutlined />}
                onClick={handleImportClick}
                loading={importing}
              >
                导入
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                创建拓扑
              </Button>
            </Space>
          </div>
          <div className={styles.listWrap}>
            {list.length === 0 && !loading ? (
              <Empty
                image={<DeploymentUnitOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
                description="暂无拓扑数据，点击上方按钮创建您的第一个网络拓扑"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  立即创建
                </Button>
              </Empty>
            ) : (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={list}
                columns={columns}
                pagination={false}
                size="small"
              />
            )}
          </div>
        </>
      )}

      {view === 'editor' && (
        <div className={styles.editorWrap}>
          <div className={styles.toolbarRow}>
            <Button type="text" className={styles.backBtn} icon={<ArrowLeftOutlined />} onClick={backToList}>
              返回列表
            </Button>
            <span>{selectedName || '拓扑编辑'}</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <TopologyEditor topologyId={selectedId} title={selectedName} />
          </div>
        </div>
      )}

      {view === 'preview' && (
        <div className={styles.previewWrap}>
          <div className={styles.toolbarRow}>
            <Button type="text" className={styles.backBtn} icon={<ArrowLeftOutlined />} onClick={backToList}>
              返回列表
            </Button>
            <span>拓扑预览</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <TopologyPreviewer topologyId={selectedId} onPopup={setPopupId} />
          </div>
        </div>
      )}

      {popupId && (
        <Modal
          title="拓扑预览"
          open
          width="90%"
          styles={{ body: { height: '70vh' } }}
          footer={null}
          onCancel={() => setPopupId(null)}
          destroyOnClose
        >
          <div style={{ height: '100%', minHeight: 400 }}>
            <TopologyPreviewer topologyId={popupId} />
          </div>
        </Modal>
      )}
    </div>
  )
}
