import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Tree,
  Typography,
} from 'antd'
import type { DataNode } from 'antd/es/tree'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  DeleteOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  ReloadOutlined,
  EditOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { workspaceApi, workspaceBackendRoadmap } from '@/api/workspace'
import { TerminalLog } from '@/components/monitoring'
import { getEditorLanguage } from '@/model/workspace'
import type { WorkspaceFileNode, WorkspaceProject, WorkspaceTab } from '@/model/workspace'
import useWorkspaceStore from '@/stores/workspace'
import { getWorkspaceTerminalWsUrl } from '@/utils/ws'

import styles from './index.module.less'

type CreateEntityType = 'file' | 'folder' | 'project'

interface CreateModalState {
  open: boolean
  type: CreateEntityType
}

interface RenameModalState {
  open: boolean
  fileId: string | null
}

const { Title, Text } = Typography

const findNodeById = (nodes: WorkspaceFileNode[], id?: string | null): WorkspaceFileNode | null => {
  if (!id) return null
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

const mapTreeData = (nodes: WorkspaceFileNode[]): DataNode[] =>
  nodes.map((node) => ({
    key: node.id,
    title: node.name,
    isLeaf: !node.isFolder,
    children: node.children?.length ? mapTreeData(node.children) : undefined,
  }))

const collectNodeIds = (node: WorkspaceFileNode | null): string[] => {
  if (!node) return []
  return [
    node.id,
    ...(node.children?.flatMap((child) => collectNodeIds(child)) ?? []),
  ]
}

const WorkspacePage: React.FC = () => {
  const navigate = useNavigate()
  const app = App.useApp()
  const {
    activeTabId,
    closeTab,
    fileTree,
    openFileTab,
    openTabs,
    projects,
    selectedProjectId,
    setActiveTabId,
    setFileTree,
    setProjects,
    setSelectedProjectId,
    markTabSaved,
    updateTabContent,
  } = useWorkspaceStore()

  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [createModal, setCreateModal] = useState<CreateModalState>({ open: false, type: 'file' })
  const [renameModal, setRenameModal] = useState<RenameModalState>({ open: false, fileId: null })
  const [createForm] = Form.useForm<{ name: string; remark?: string }>()
  const [renameForm] = Form.useForm<{ name: string }>()

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const activeTab = useMemo(
    () => openTabs.find((item) => item.id === activeTabId) ?? null,
    [activeTabId, openTabs],
  )
  const selectedNode = useMemo(
    () => findNodeById(fileTree, selectedNodeId),
    [fileTree, selectedNodeId],
  )
  const terminalWsUrl = useMemo(
    () => getWorkspaceTerminalWsUrl(selectedProjectId ?? undefined),
    [selectedProjectId],
  )

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const projectList = await workspaceApi.listProjects()
      setProjects(projectList)
      if (!selectedProjectId && projectList.length > 0) {
        setSelectedProjectId(projectList[0].id)
      }
    } catch (error) {
      app.message.error((error as Error).message || '加载项目列表失败')
    } finally {
      setLoadingProjects(false)
    }
  }, [app.message, selectedProjectId, setProjects, setSelectedProjectId])

  const loadFileTree = useCallback(
    async (projectId: string) => {
      setLoadingFiles(true)
      try {
        const tree = await workspaceApi.listFiles(projectId)
        setFileTree(tree)
      } catch (error) {
        app.message.error((error as Error).message || '加载文件树失败')
      } finally {
        setLoadingFiles(false)
      }
    },
    [app.message, setFileTree],
  )

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (selectedProjectId) {
      loadFileTree(selectedProjectId)
    }
  }, [loadFileTree, selectedProjectId])

  const handleOpenFile = async (fileId: string) => {
    const file = await workspaceApi.readFile(fileId)
    const tab: WorkspaceTab = {
      id: `tab-${file.id}`,
      fileId: file.id,
      projectId: file.projectId,
      title: file.name,
      type: file.type as WorkspaceTab['type'],
      content: file.content ?? '',
      dirty: false,
      updatedAt: file.updatedAt,
    }
    openFileTab(tab)
    setSelectedNodeId(fileId)
  }

  const handleCreate = async () => {
    const values = await createForm.validateFields()
    try {
      if (createModal.type === 'project') {
        const project = await workspaceApi.createProject({
          name: values.name,
          remark: values.remark,
        })
        const nextProjects = [project, ...projects]
        setProjects(nextProjects)
        setSelectedProjectId(project.id)
        app.message.success('项目已创建')
      } else if (selectedProjectId) {
        const parentId =
          createModal.type === 'folder'
            ? selectedNode?.isFolder
              ? selectedNode.id
              : selectedNode?.parentId ?? null
            : selectedNode?.isFolder
              ? selectedNode.id
              : selectedNode?.parentId ?? null

        const file = await workspaceApi.createFile({
          projectId: selectedProjectId,
          parentId,
          name: values.name,
          type: createModal.type === 'folder' ? 'folder' : 'text',
          content: createModal.type === 'folder' ? undefined : '',
        })
        await loadFileTree(selectedProjectId)
        app.message.success(createModal.type === 'folder' ? '文件夹已创建' : '文件已创建')
        if (!file.isFolder) {
          await handleOpenFile(file.id)
        }
      }
      createForm.resetFields()
      setCreateModal({ open: false, type: 'file' })
    } catch (error) {
      if ((error as Error)?.message) {
        app.message.error((error as Error).message)
      }
    }
  }

  const handleSave = async () => {
    if (!activeTab) {
      app.message.info('请先打开一个文件')
      return
    }
    setSaving(true)
    try {
      await workspaceApi.saveFile(activeTab.fileId, activeTab.content)
      markTabSaved(activeTab.id, activeTab.content)
      await loadFileTree(activeTab.projectId)
      app.message.success('文件已保存')
    } catch (error) {
      app.message.error((error as Error).message || '文件保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async () => {
    const values = await renameForm.validateFields()
    if (!renameModal.fileId) return
    try {
      const renamed = await workspaceApi.renameFile({
        fileId: renameModal.fileId,
        name: values.name,
      })
      setOpenTabsAfterRename(renamed.id, renamed.name)
      if (selectedProjectId) {
        await loadFileTree(selectedProjectId)
      }
      if (selectedNodeId === renamed.id) {
        setSelectedNodeId(renamed.id)
      }
      app.message.success('重命名成功')
      setRenameModal({ open: false, fileId: null })
      renameForm.resetFields()
    } catch (error) {
      app.message.error((error as Error).message || '重命名失败')
    }
  }

  const setOpenTabsAfterRename = (fileId: string, name: string) => {
    useWorkspaceStore.setState((state) => ({
      openTabs: state.openTabs.map((tab) =>
        tab.fileId === fileId
          ? {
              ...tab,
              title: name,
            }
          : tab,
      ),
    }))
  }

  const handleDelete = async () => {
    if (!selectedNode) {
      app.message.info('请先选择文件或文件夹')
      return
    }
    app.modal.confirm({
      title: `确认删除${selectedNode.isFolder ? '文件夹' : '文件'}？`,
      content: `将删除「${selectedNode.name}」${selectedNode.isFolder ? '及其子内容' : ''}。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const idsToDelete = new Set(collectNodeIds(selectedNode))
        await workspaceApi.deleteFile(selectedNode.id)
        const remainingTabs = useWorkspaceStore
          .getState()
          .openTabs.filter((tab) => !idsToDelete.has(tab.fileId))
        useWorkspaceStore.setState((state) => ({
          openTabs: remainingTabs,
          activeTabId:
            state.activeTabId &&
            remainingTabs.some((tab) => tab.id === state.activeTabId)
              ? state.activeTabId
              : (remainingTabs.length ? remainingTabs[remainingTabs.length - 1].id : null),
        }))
        setSelectedNodeId(null)
        if (selectedProjectId) {
          await loadFileTree(selectedProjectId)
        }
        app.message.success('删除成功')
      },
    })
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            项目工作台
          </Title>
          <Text type="secondary">
            以新前端为主的轻量 IDE 壳子，当前通过前端 API 适配层提供项目和文件上下文。
          </Text>
        </div>

        <div className={styles.headerActions}>
          <Select
            style={{ width: 260 }}
            placeholder="选择项目"
            loading={loadingProjects}
            value={selectedProjectId ?? undefined}
            options={projects.map((project: WorkspaceProject) => ({
              label: project.name,
              value: project.id,
            }))}
            onChange={(value) => setSelectedProjectId(value)}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadProjects()
              if (selectedProjectId) {
                loadFileTree(selectedProjectId)
              }
            }}
          >
            刷新
          </Button>
          <Button onClick={() => navigate('/intent')}>前往智能体页</Button>
          <Button
            type="primary"
            icon={<FileAddOutlined />}
            onClick={() => {
              createForm.resetFields()
              setCreateModal({ open: true, type: 'project' })
            }}
          >
            新建项目
          </Button>
        </div>
      </div>

      <div className={styles.main}>
        <Card title="项目文件" loading={loadingFiles} className={styles.panelCard}>
          <div className={styles.treeTools}>
            <Button
              size="small"
              icon={<FileAddOutlined />}
              disabled={!selectedProjectId}
              onClick={() => {
                createForm.resetFields()
                setCreateModal({ open: true, type: 'file' })
              }}
            >
              新建文件
            </Button>
            <Button
              size="small"
              icon={<FolderAddOutlined />}
              disabled={!selectedProjectId}
              onClick={() => {
                createForm.resetFields()
                setCreateModal({ open: true, type: 'folder' })
              }}
            >
              新建文件夹
            </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!selectedNode}
              onClick={() => {
                if (!selectedNode) return
                renameForm.setFieldsValue({ name: selectedNode.name })
                setRenameModal({ open: true, fileId: selectedNode.id })
              }}
            >
              重命名
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!selectedNode}
              onClick={handleDelete}
            >
              删除
            </Button>
          </div>
          <div className={styles.treeWrap}>
            {selectedProjectId ? (
              <Tree
                treeData={mapTreeData(fileTree)}
                selectedKeys={selectedNodeId ? [selectedNodeId] : []}
                onSelect={async (keys, info) => {
                  const nextSelected = String(keys[0] ?? '')
                  setSelectedNodeId(nextSelected || null)
                  if (info.node.isLeaf && nextSelected) {
                    await handleOpenFile(nextSelected)
                  }
                }}
              />
            ) : (
              <Empty description="请先选择项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </Card>

        <div className={styles.editorPanel}>
          <div className={styles.contextBar}>
            <Tag color={selectedProject ? 'blue' : 'default'}>
              项目：{selectedProject?.name ?? '未选择'}
            </Tag>
            <Tag color={activeTab ? 'purple' : 'default'}>
              活动文件：{activeTab?.title ?? '未打开'}
            </Tag>
            <Tag color="gold">适配层：workspace mock</Tag>
          </div>

          <Card
            title="多标签编辑器"
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={saving}
                >
                  保存
                </Button>
              </Space>
            }
            className={styles.editorCard}
          >
            {openTabs.length > 0 ? (
              <>
                <Tabs
                  type="editable-card"
                  hideAdd
                  activeKey={activeTabId ?? undefined}
                  onChange={(key) => setActiveTabId(key)}
                  onEdit={(targetKey, action) => {
                    if (action === 'remove') {
                      closeTab(String(targetKey))
                    }
                  }}
                  items={openTabs.map((tab) => ({
                    key: tab.id,
                    label: (
                      <span>
                        {tab.title}
                        {tab.dirty ? ' *' : ''}
                      </span>
                    ),
                    children: null,
                  }))}
                />
                {activeTab ? (
                  <Editor
                    height="100%"
                    language={getEditorLanguage(activeTab.type, activeTab.title)}
                    value={activeTab.content}
                    onChange={(value) => updateTabContent(activeTab.id, value ?? '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on',
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                    }}
                  />
                ) : (
                  <div className={styles.emptyState}>
                    <Empty description="请选择一个标签页" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                <Empty
                  description="从左侧文件树打开文件后，将在这里以多标签方式编辑"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )}
          </Card>

          <Card title="控制台" className={styles.consoleCard}>
            <Tabs
              defaultActiveKey="logs"
              items={[
                {
                  key: 'logs',
                  label: '历史日志',
                  children: (
                    <TerminalLog
                      height={280}
                      readOnly
                    />
                  ),
                },
                {
                  key: 'terminal',
                  label: '交互终端',
                  children: (
                    <div className={styles.consolePanel}>
                      <Alert
                        type="info"
                        showIcon
                        message="交互终端已预留接入位"
                        description={`后端完成 WS /ws/workspace/terminal 后，可直接使用工作台终端。当前预期地址：${terminalWsUrl}`}
                      />
                      <div className={styles.consoleRoadmap}>
                        {workspaceBackendRoadmap.map((item) => (
                          <Tag key={item.capability}>
                            {item.capability} · {item.status}
                          </Tag>
                        ))}
                      </div>
                      <TerminalLog
                        height={220}
                        readOnly={false}
                        wsUrl={terminalWsUrl}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </div>

      <Modal
        title={
          createModal.type === 'project'
            ? '新建项目'
            : createModal.type === 'folder'
              ? '新建文件夹'
              : '新建文件'
        }
        open={createModal.open}
        onCancel={() => setCreateModal({ open: false, type: 'file' })}
        onOk={handleCreate}
        destroyOnClose
      >
        <div className={styles.modalTip}>
          当前阶段由前端适配层托管数据，后续会切换到统一的后端 `workspace/*` 接口。
        </div>
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder={createModal.type === 'project' ? '例如：My Project' : '例如：intent.dsl'} />
          </Form.Item>
          {createModal.type === 'project' && (
            <Form.Item label="备注" name="remark">
              <Input.TextArea placeholder="可选：项目说明" autoSize={{ minRows: 2, maxRows: 4 }} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="重命名"
        open={renameModal.open}
        onCancel={() => setRenameModal({ open: false, fileId: null })}
        onOk={handleRename}
        destroyOnClose
      >
        <Form form={renameForm} layout="vertical">
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="输入新的文件名或文件夹名" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WorkspacePage
