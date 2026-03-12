import Editor from '@monaco-editor/react'
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  List,
  Modal,
  Space,
  Tabs,
  Tree,
  Typography,
} from 'antd'
import type { DataNode } from 'antd/es/tree'
import {
  AppstoreOutlined,
  BarChartOutlined,
  CloseOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  SaveOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  NodeIndexOutlined,
  FormOutlined,
  MessageOutlined,
  AimOutlined,
} from '@ant-design/icons'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ChatInput } from '@/components/editor'
import InteractiveTerminal from '@/components/project/InteractiveTerminal'
import { D3TopologyEditor, D3TopologyPreviewer, type D3Node } from '@/components/topology'
import type {
  D3TopologyEditorHandle,
  D3TopologyEditorStats,
} from '@/components/topology/TopologyEditor/D3TopologyEditor'
import { DEVICE_IMAGE_MAP, DEVICE_NAMES } from '@/components/topology/d3-engine'
import {
  cancelCustomDeviceDrag,
  releaseCustomDeviceDrag,
  startCustomDeviceDrag,
  subscribeCustomDeviceDrag,
  updateCustomDeviceDrag,
} from '@/components/topology/d3-engine/dragDrop'
import { fileApi, topologyApi } from '@/api'
import type { ProjectFileNode } from '@/api/file'
import type { NodeType } from '@/model/topology'
import type { Topology } from '@/model/topology'
import { detectLanguage, useProjectStore } from '@/stores'

import styles from './index.module.less'

type FileModalMode = 'file' | 'folder' | 'rename'
type TopologyModalMode = 'create' | 'rename'
type WorkbenchRailMode = 'topology' | 'orchestrator' | 'stats' | 'assets'
type DragPreviewState = {
  deviceType: NodeType
  label: string
  imageSrc: string
  clientX: number
  clientY: number
} | null

type FloatingPreviewPosition = {
  left: number
  top: number
}

const TOPOLOGY_DEVICE_LEGEND: Array<{ type: NodeType; label: string }> = [
  { type: 'switch', label: DEVICE_NAMES.switch },
  { type: 'router', label: DEVICE_NAMES.router },
  { type: 'host', label: DEVICE_NAMES.host },
  { type: 'controller', label: DEVICE_NAMES.controller },
  { type: 'server', label: DEVICE_NAMES.server },
  { type: 'p4_switch', label: DEVICE_NAMES.p4_switch },
]

function buildTreeData(nodes: ProjectFileNode[]): DataNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: node.fileName,
    isLeaf: !node.isFolder,
    children: buildTreeData(node.children ?? []),
  }))
}

function flattenTree(nodes: ProjectFileNode[]): ProjectFileNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children ?? [])])
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

const DEFAULT_DSL_FILE_NAME = 'intent.pne'
const FLOATING_PREVIEW_MARGIN = 16

function calculateNetworkLoad(nodeCount: number, linkCount: number) {
  if (nodeCount === 0 && linkCount === 0) {
    return 0
  }

  return Number(Math.min(96.8, nodeCount * 2.7 + linkCount * 8.4).toFixed(1))
}

function clampFloatingPreviewPosition(
  position: FloatingPreviewPosition,
  width: number,
  height: number
): FloatingPreviewPosition {
  const maxLeft = Math.max(FLOATING_PREVIEW_MARGIN, window.innerWidth - width - FLOATING_PREVIEW_MARGIN)
  const maxTop = Math.max(FLOATING_PREVIEW_MARGIN, window.innerHeight - height - FLOATING_PREVIEW_MARGIN)

  return {
    left: Math.min(Math.max(position.left, FLOATING_PREVIEW_MARGIN), maxLeft),
    top: Math.min(Math.max(position.top, FLOATING_PREVIEW_MARGIN), maxTop),
  }
}

const Develop: React.FC = () => {
  const { message } = App.useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const topologyEditorRef = useRef<D3TopologyEditorHandle | null>(null)
  const floatingPreviewRef = useRef<HTMLDivElement | null>(null)
  const floatingPreviewDragRef = useRef<{
    pointerOffsetX: number
    pointerOffsetY: number
    width: number
    height: number
  } | null>(null)
  const {
    init,
    currentProject,
    currentProjectId,
    tabs,
    activeTabId,
    openFileTab,
    updateTabContent,
    markTabSaved,
    closeTab,
    setActiveTabId,
    updateCurrentProject,
  } = useProjectStore()

  const [treeLoading, setTreeLoading] = useState(false)
  const [treeNodes, setTreeNodes] = useState<ProjectFileNode[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [topologyList, setTopologyList] = useState<Topology[]>([])
  const [topologyLoading, setTopologyLoading] = useState(false)
  const [floatingPreviewOpen, setFloatingPreviewOpen] = useState(false)
  const [floatingPreviewPosition, setFloatingPreviewPosition] = useState<FloatingPreviewPosition | null>(null)
  const [topologyModalOpen, setTopologyModalOpen] = useState(false)
  const [topologyModalMode, setTopologyModalMode] = useState<TopologyModalMode>('create')
  const [topologyName, setTopologyName] = useState('')
  const [fileModalOpen, setFileModalOpen] = useState(false)
  const [fileModalMode, setFileModalMode] = useState<FileModalMode>('file')
  const [fileName, setFileName] = useState('')
  const [dragPreview, setDragPreview] = useState<DragPreviewState>(null)
  const [topologyWorkbenchMode, setTopologyWorkbenchMode] = useState<WorkbenchRailMode>('topology')
  const [devicePickerOpen, setDevicePickerOpen] = useState(false)
  const [selectedTopologyNode, setSelectedTopologyNode] = useState<D3Node | null>(null)
  const [topologyStats, setTopologyStats] = useState<D3TopologyEditorStats | null>(null)

  const flatNodes = useMemo(() => flattenTree(treeNodes), [treeNodes])
  const selectedNode = useMemo(
    () => flatNodes.find((node) => node.id === selectedNodeId) ?? null,
    [flatNodes, selectedNodeId]
  )
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs]
  )
  const activeTopologyId = currentProject?.topologyId ?? topologyList[0]?.id ?? null
  const activeTopology = useMemo(
    () => topologyList.find((topology) => topology.id === activeTopologyId) ?? null,
    [activeTopologyId, topologyList]
  )
  const topologyMetricCards = useMemo(() => {
    const nodeCount = topologyStats?.nodeCount ?? activeTopology?.nodes?.length ?? 0
    const linkCount = topologyStats?.linkCount ?? activeTopology?.links?.length ?? 0
    const networkLoad = calculateNetworkLoad(nodeCount, linkCount)

    return [
      { key: 'nodes', label: 'Total Nodes', value: String(nodeCount) },
      { key: 'links', label: 'Active Links', value: String(linkCount) },
      { key: 'rules', label: 'Flow Rules', value: selectedTopologyNode ? '1' : '0' },
      { key: 'load', label: 'Network Load', value: `${networkLoad}%` },
    ]
  }, [activeTopology?.links?.length, activeTopology?.nodes?.length, selectedTopologyNode, topologyStats])
  const stageLegendItems = useMemo(
    () => [
      { key: 'controller', label: 'Controller', color: '#10b981' },
      { key: 'router-switch', label: 'Router/Switch', color: '#3b82f6' },
      { key: 'host', label: 'Host', color: '#64748b' },
    ],
    []
  )
  const workbenchRailItems = useMemo(
    () => [
      { key: 'topology' as WorkbenchRailMode, label: '拓扑舞台', icon: <NodeIndexOutlined /> },
      { key: 'orchestrator' as WorkbenchRailMode, label: '编排面板', icon: <MessageOutlined /> },
      { key: 'stats' as WorkbenchRailMode, label: '统计摘要', icon: <BarChartOutlined /> },
      { key: 'assets' as WorkbenchRailMode, label: '设备资源', icon: <AppstoreOutlined /> },
    ],
    []
  )

  const startCustomLegendDrag = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, deviceType: NodeType, label: string) => {
      if (event.button !== 0) {
        return
      }

      if (!activeTopologyId) {
        message.warning('请先创建或选择一个拓扑示例，再拖拽设备到画布')
        return
      }

      event.preventDefault()

      const imageSrc = DEVICE_IMAGE_MAP[deviceType]
      startCustomDeviceDrag({
        deviceType,
        label,
        imageSrc,
        clientX: event.clientX,
        clientY: event.clientY,
      })

      const handleMouseMove = (moveEvent: MouseEvent) => {
        updateCustomDeviceDrag(moveEvent.clientX, moveEvent.clientY)
      }

      const handleMouseUp = (upEvent: MouseEvent) => {
        releaseCustomDeviceDrag(upEvent.clientX, upEvent.clientY)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('blur', handleWindowBlur)
      }

      const handleWindowBlur = () => {
        cancelCustomDeviceDrag()
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('blur', handleWindowBlur)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('blur', handleWindowBlur, { once: true })
    },
    [activeTopologyId, message]
  )

  useEffect(() => {
    return subscribeCustomDeviceDrag((state) => {
      if (state?.phase === 'dragging') {
        setDragPreview({
          deviceType: state.deviceType as NodeType,
          label: state.label,
          imageSrc: state.imageSrc ?? DEVICE_IMAGE_MAP[state.deviceType as NodeType],
          clientX: state.clientX,
          clientY: state.clientY,
        })
        return
      }

      setDragPreview(null)
    })
  }, [])

  const loadProjectFiles = useCallback(async () => {
    if (!currentProjectId) {
      setTreeNodes([])
      return
    }
    setTreeLoading(true)
    try {
      const res = await fileApi.getTree(currentProjectId)
      setTreeNodes(res.data ?? [])
    } finally {
      setTreeLoading(false)
    }
  }, [currentProjectId])

  const loadTopologies = useCallback(async () => {
    if (!currentProjectId) {
      setTopologyList([])
      return
    }
    setTopologyLoading(true)
    try {
      const res = await topologyApi.getList({ pageNo: 1, pageSize: 100, projectId: currentProjectId })
      const records = res.data?.records ?? []
      setTopologyList(records)
      if (records.length > 0 && !currentProject?.topologyId) {
        await updateCurrentProject({ topologyId: records[0].id })
      }
    } finally {
      setTopologyLoading(false)
    }
  }, [currentProject?.topologyId, currentProjectId, updateCurrentProject])

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    loadProjectFiles()
    loadTopologies()
  }, [loadProjectFiles, loadTopologies])

  useEffect(() => {
    setSelectedTopologyNode(null)
    setTopologyStats(null)
  }, [activeTopologyId])

  useEffect(() => {
    if (!activeTopologyId) {
      setFloatingPreviewOpen(false)
    }
  }, [activeTopologyId])

  useEffect(() => {
    if (!floatingPreviewOpen) {
      return
    }

    const handleResize = () => {
      const panel = floatingPreviewRef.current
      if (!panel || !floatingPreviewPosition) {
        return
      }

      setFloatingPreviewPosition(
        clampFloatingPreviewPosition(
          floatingPreviewPosition,
          panel.offsetWidth,
          panel.offsetHeight
        )
      )
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [floatingPreviewOpen, floatingPreviewPosition])

  const handleOpenFile = useCallback(
    async (fileNode: ProjectFileNode) => {
      const res = await fileApi.read(fileNode.id)
      openFileTab({
        id: fileNode.id,
        name: fileNode.fileName,
        path: fileNode.filePath,
        content: res.data ?? '',
        language: detectLanguage(fileNode.filePath),
        dirty: false,
      })
      await updateCurrentProject({ currentFileId: fileNode.id })
    },
    [openFileTab, updateCurrentProject]
  )

  const handleSaveFile = useCallback(async () => {
    if (!activeTab) {
      return
    }
    await fileApi.updateContent({
      fileId: activeTab.id,
      content: activeTab.content,
    })
    markTabSaved(activeTab.id)
    await updateCurrentProject({ currentFileId: activeTab.id })
    message.success(`已保存 ${activeTab.name}`)
    loadProjectFiles()
  }, [activeTab, loadProjectFiles, markTabSaved, message, updateCurrentProject])

  const openFileModal = (mode: FileModalMode) => {
    setFileModalMode(mode)
    setFileName(mode === 'rename' ? selectedNode?.fileName ?? '' : '')
    setFileModalOpen(true)
  }

  const handleSubmitFileModal = async () => {
    if (!currentProjectId) {
      return
    }
    const trimmedName = fileName.trim()
    if (!trimmedName) {
      message.warning('请输入名称')
      return
    }

    if (fileModalMode === 'rename' && selectedNode) {
      await fileApi.rename({ fileId: selectedNode.id, fileName: trimmedName })
      message.success('重命名成功')
    } else {
      const parentId = selectedNode?.isFolder ? selectedNode.id : selectedNode?.parentId ?? null
      const newFile = await fileApi.create({
        projectId: currentProjectId,
        fileName: trimmedName,
        isFolder: fileModalMode === 'folder' ? 1 : 0,
        parentId,
        fileType: fileModalMode === 'folder' ? 1 : 2,
        content: fileModalMode === 'file' ? '' : undefined,
      })
      if (fileModalMode === 'file' && newFile.data) {
        await handleOpenFile(newFile.data)
      }
      message.success(fileModalMode === 'folder' ? '文件夹已创建' : '文件已创建')
    }

    setFileModalOpen(false)
    setFileName('')
    loadProjectFiles()
  }

  const handleDeleteNode = async () => {
    if (!selectedNode) {
      message.warning('请先选择文件或目录')
      return
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定删除 ${selectedNode.fileName} 吗？`,
      onOk: async () => {
        await fileApi.delete(selectedNode.id)
        message.success('删除成功')
        if (activeTabId === selectedNode.id) {
          closeTab(selectedNode.id)
        }
        setSelectedNodeId(null)
        loadProjectFiles()
      },
    })
  }

  const handleExport = async () => {
    if (!currentProjectId) {
      return
    }
    const blob = await fileApi.exportZip(currentProjectId, selectedNode ? [selectedNode.id] : undefined)
    downloadBlob(blob, `${currentProject?.name ?? 'project'}.zip`)
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentProjectId) {
      return
    }
    const uploadFile = event.target.files?.[0]
    event.target.value = ''
    if (!uploadFile) {
      return
    }
    await fileApi.importZip(currentProjectId, uploadFile, selectedNode?.isFolder ? selectedNode.id : selectedNode?.parentId)
    message.success('导入成功')
    loadProjectFiles()
  }

  const openTopologyModal = (mode: TopologyModalMode) => {
    setTopologyModalMode(mode)
    setTopologyName(mode === 'rename' ? activeTopology?.name ?? '' : `${currentProject?.name ?? '项目'}-拓扑`)
    setTopologyModalOpen(true)
  }

  const handleSubmitTopologyModal = async () => {
    if (!currentProjectId) {
      return
    }
    const trimmedName = topologyName.trim()
    if (!trimmedName) {
      message.warning('请输入拓扑名称')
      return
    }
    if (topologyModalMode === 'rename' && activeTopology) {
      await topologyApi.update(activeTopology.id, {
        name: trimmedName,
        projectId: currentProjectId,
      })
      message.success('拓扑已重命名')
    } else {
      const res = await topologyApi.create({
        name: trimmedName,
        projectId: currentProjectId,
        nodes: [],
        links: [],
      })
      await updateCurrentProject({ topologyId: res.data.id })
      message.success('已创建项目拓扑')
    }
    setTopologyModalOpen(false)
    setTopologyName('')
    loadTopologies()
  }

  const handleDeleteTopology = async (topologyId: string) => {
    Modal.confirm({
      title: '确认删除拓扑',
      content: '删除后不可恢复，是否继续？',
      onOk: async () => {
        await topologyApi.delete(topologyId)
        const nextTopologies = topologyList.filter((item) => item.id !== topologyId)
        const nextTopologyId = nextTopologies[0]?.id ?? null
        await updateCurrentProject({ topologyId: nextTopologyId })
        message.success('拓扑已删除')
        loadTopologies()
      },
    })
  }

  const handleOpenDevicePicker = useCallback(() => {
    if (!activeTopologyId) {
      message.warning('请先创建或选择一个拓扑示例')
      return
    }

    setDevicePickerOpen(true)
  }, [activeTopologyId, message])

  const handleStartLinkMode = useCallback(() => {
    if (!activeTopologyId) {
      message.warning('请先创建或选择一个拓扑示例')
      return
    }

    topologyEditorRef.current?.startLinkMode()
  }, [activeTopologyId, message])

  const handleResetTopologyView = useCallback(() => {
    topologyEditorRef.current?.resetView()
  }, [])

  const handleToggleFloatingPreview = useCallback(async () => {
    if (floatingPreviewOpen) {
      setFloatingPreviewOpen(false)
      return
    }

    if (!activeTopologyId) {
      message.warning('请先创建或选择一个拓扑示例')
      return
    }

    try {
      await topologyEditorRef.current?.flushSave()
    } catch {
      message.warning('拓扑保存失败，预览可能显示旧内容')
    }
    setFloatingPreviewPosition(null)
    setFloatingPreviewOpen(true)
  }, [activeTopologyId, floatingPreviewOpen, message])

  const handleFloatingPreviewMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) {
      return
    }

    const panel = floatingPreviewRef.current
    if (!panel) {
      return
    }

    const rect = panel.getBoundingClientRect()
    floatingPreviewDragRef.current = {
      pointerOffsetX: event.clientX - rect.left,
      pointerOffsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    }

    setFloatingPreviewPosition({
      left: rect.left,
      top: rect.top,
    })

    event.preventDefault()
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const dragState = floatingPreviewDragRef.current
      if (!dragState) {
        return
      }

      setFloatingPreviewPosition(
        clampFloatingPreviewPosition(
          {
            left: event.clientX - dragState.pointerOffsetX,
            top: event.clientY - dragState.pointerOffsetY,
          },
          dragState.width,
          dragState.height
        )
      )
    }

    const handleMouseUp = () => {
      floatingPreviewDragRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handlePickDeviceType = useCallback((deviceType: NodeType) => {
    setDevicePickerOpen(false)
    topologyEditorRef.current?.openCreateDeviceDialog(deviceType)
  }, [])

  const handleApplyDsl = async (dslCode: string) => {
    if (!currentProjectId) {
      return
    }
    if (activeTab) {
      updateTabContent(activeTab.id, dslCode)
      return
    }
    const created = await fileApi.create({
      projectId: currentProjectId,
      fileName: DEFAULT_DSL_FILE_NAME,
      isFolder: 0,
      fileType: 2,
      content: dslCode,
    })
    if (created.data) {
      openFileTab({
        id: created.data.id,
        name: created.data.fileName,
        path: created.data.filePath,
        content: dslCode,
        language: detectLanguage(created.data.filePath),
        dirty: true,
      })
      await updateCurrentProject({ currentFileId: created.data.id })
      loadProjectFiles()
    }
  }

  const treeData = useMemo(() => buildTreeData(treeNodes), [treeNodes])

  if (!currentProject) {
    return (
      <div className={styles.emptyState}>
        <Empty description="请先在顶部选择或创建项目，然后进入模态开发子系统" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <Typography.Title level={2}>模态开发子系统</Typography.Title>
          <Typography.Text type="secondary">
            当前项目：{currentProject.name}。在这里统一完成文件管理、IDE 编辑、拓扑建模和终端调试。
          </Typography.Text>
        </div>
        <Space wrap>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveFile} disabled={!activeTab}>
            保存当前文件
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => openTopologyModal('create')}>
            新建拓扑示例
          </Button>
          <Button icon={<EyeOutlined />} onClick={() => void handleToggleFloatingPreview()}>
            {floatingPreviewOpen ? '关闭预览' : '打开预览'}
          </Button>
        </Space>
      </div>

      <div className={styles.mainGrid}>
        <Card
          className={styles.treeCard}
          loading={treeLoading}
          title="项目与文件"
          extra={
            <Space size={4}>
              <Button size="small" icon={<FolderAddOutlined />} onClick={() => openFileModal('folder')} />
              <Button size="small" icon={<FileAddOutlined />} onClick={() => openFileModal('file')} />
              <Button size="small" icon={<EditOutlined />} onClick={() => openFileModal('rename')} disabled={!selectedNode} />
              <Button size="small" icon={<DeleteOutlined />} onClick={handleDeleteNode} disabled={!selectedNode} />
            </Space>
          }
        >
          <div className={styles.treeActions}>
            <Space wrap>
              <Button size="small" icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
                导入
              </Button>
              <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
            </Space>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <Tree
            className={styles.tree}
            treeData={treeData}
            selectedKeys={selectedNodeId ? [selectedNodeId] : []}
            onSelect={async (keys) => {
              const fileId = keys[0] as string | undefined
              setSelectedNodeId(fileId ?? null)
              const node = flatNodes.find((item) => item.id === fileId)
              if (node && !node.isFolder) {
                await handleOpenFile(node)
              }
            }}
            titleRender={(node) => (
              <span className={styles.treeNode}>
                {flatNodes.find((item) => item.id === node.key)?.isFolder ? (
                  <FolderOpenOutlined />
                ) : (
                  <FileTextOutlined />
                )}
                <span>{String(node.title)}</span>
              </span>
            )}
          />
        </Card>

        <div className={styles.workspaceColumn}>
          <Card className={styles.workspaceCard} bodyStyle={{ height: '100%' }}>
            <Tabs
              className={styles.workspaceTabs}
              items={[
                {
                  key: 'code',
                  label: 'IDE 工作区',
                  children: tabs.length > 0 ? (
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
                      items={tabs.map((tab) => ({
                        key: tab.id,
                        label: `${tab.name}${tab.dirty ? ' *' : ''}`,
                        children: (
                          <Editor
                            height="58vh"
                            language={tab.language}
                            value={tab.content}
                            onChange={(value) => updateTabContent(tab.id, value ?? '')}
                            options={{
                              minimap: { enabled: false },
                              automaticLayout: true,
                              fontSize: 13,
                            }}
                          />
                        ),
                      }))}
                    />
                  ) : (
                    <Empty description="从左侧打开项目文件后，即可开始编辑" />
                  ),
                },
                {
                  key: 'topology',
                  label: '拓扑工作区',
                  children: (
                    <div className={styles.topologyPanel}>
                      <div className={styles.topologyWorkbench}>
                        <div className={styles.topologyRail}>
                          {workbenchRailItems.map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              className={`${styles.railButton} ${topologyWorkbenchMode === item.key ? styles.railButtonActive : ''}`}
                              title={item.label}
                              onClick={() => setTopologyWorkbenchMode(item.key)}
                            >
                              {item.icon}
                            </button>
                          ))}
                        </div>
                        <div className={styles.topologyMainView}>
                          {topologyWorkbenchMode === 'topology' && (
                            <div className={styles.topologyStageColumn}>
                              <div className={styles.topologyStageCard}>
                                <div className={styles.stageHeader}>
                                  <div>
                                    <Typography.Title level={4}>NetProgrammable</Typography.Title>
                                    <Typography.Text type="secondary">
                                      {currentProject.name}
                                      {' / '}
                                      {activeTopology?.name ?? '未选择拓扑'}
                                    </Typography.Text>
                                  </div>
                                  <Space wrap>
                                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenDevicePicker}>
                                      Add Device
                                    </Button>
                                    <Button icon={<NodeIndexOutlined />} onClick={handleStartLinkMode}>
                                      Add Link
                                    </Button>
                                    <Button icon={<AimOutlined />} onClick={handleResetTopologyView}>
                                      Reset View
                                    </Button>
                                    <Button icon={<EyeOutlined />} onClick={() => void handleToggleFloatingPreview()}>
                                      {floatingPreviewOpen ? '关闭预览' : '打开预览'}
                                    </Button>
                                  </Space>
                                </div>
                                <div className={styles.stageSurface}>
                                  <div className={styles.stageLegend}>
                                    {stageLegendItems.map((item) => (
                                      <div key={item.key} className={styles.stageLegendItem}>
                                        <span className={styles.stageLegendDot} style={{ backgroundColor: item.color }} />
                                        <span>{item.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className={styles.topologyCanvas}>
                                    {activeTopologyId ? (
                                      <D3TopologyEditor
                                        ref={topologyEditorRef}
                                        topologyId={activeTopologyId}
                                        title={activeTopology?.name ?? '项目拓扑'}
                                        onGraphStatsChange={setTopologyStats}
                                        onSelectionChange={setSelectedTopologyNode}
                                      />
                                    ) : (
                                      <Empty description="当前项目还没有关联拓扑，点击右上角按钮创建" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className={styles.topologyStatsGrid}>
                                {topologyMetricCards.map((item) => (
                                  <div key={item.key} className={styles.statCard}>
                                    <div className={styles.statLabel}>{item.label}</div>
                                    <div className={styles.statValue}>{item.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {topologyWorkbenchMode === 'orchestrator' && (
                            <div className={styles.sideModeCard}>
                              <div className={styles.orchestratorHeader}>
                                <MessageOutlined />
                                <span>Flow Orchestrator</span>
                              </div>
                              <div className={styles.orchestratorHero}>
                                <div className={styles.orchestratorHeroIcon}>▶</div>
                                <Typography.Paragraph type="secondary">
                                  描述网络编排逻辑，将拓扑、链路与后续配置生成流程串联起来。
                                </Typography.Paragraph>
                              </div>
                              <div className={styles.orchestratorComposer}>
                                <div className={styles.orchestratorComposerHint}>
                                  例如：将控制器连接到两台边缘路由器，并为接入终端预留链路带宽。
                                </div>
                                <div className={styles.orchestratorComposerButton}>
                                  <MessageOutlined />
                                </div>
                              </div>
                            </div>
                          )}

                          {topologyWorkbenchMode === 'assets' && (
                            <div className={styles.sideModeCard}>
                              <div className={styles.orchestratorSection}>
                                <div className={styles.orchestratorSectionTitle}>项目拓扑</div>
                                <List
                                  loading={topologyLoading}
                                  dataSource={topologyList}
                                  locale={{ emptyText: '当前项目还没有拓扑示例' }}
                                  renderItem={(item) => (
                                    <List.Item
                                      className={`${styles.topologyListItem} ${item.id === activeTopologyId ? styles.activeTopologyItem : ''}`}
                                      onClick={async () => {
                                        await updateCurrentProject({ topologyId: item.id })
                                      }}
                                    >
                                      <div className={styles.topologyItemContent}>
                                        <div className={styles.topologyItemName}>{item.name}</div>
                                        <div className={styles.topologyItemMeta}>
                                          更新时间：{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}
                                        </div>
                                      </div>
                                    </List.Item>
                                  )}
                                />
                                <Space wrap className={styles.orchestratorActions}>
                                  <Button icon={<PlusOutlined />} onClick={() => openTopologyModal('create')}>
                                    新建
                                  </Button>
                                  <Button icon={<FormOutlined />} onClick={() => openTopologyModal('rename')} disabled={!activeTopology}>
                                    重命名
                                  </Button>
                                  <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => activeTopologyId && handleDeleteTopology(activeTopologyId)}
                                    disabled={!activeTopologyId}
                                  >
                                    删除
                                  </Button>
                                </Space>
                              </div>
                              <div className={styles.orchestratorSection}>
                                <div className={styles.orchestratorSectionTitle}>设备图例</div>
                                <div className={styles.sidebarLegendGrid}>
                                  {TOPOLOGY_DEVICE_LEGEND.map((item) => (
                                    <div
                                      key={item.type}
                                      className={styles.legendItem}
                                      onMouseDown={(event) => {
                                        startCustomLegendDrag(event, item.type, item.label)
                                      }}
                                      onDoubleClick={() => {
                                        handlePickDeviceType(item.type)
                                      }}
                                    >
                                      <img
                                        src={DEVICE_IMAGE_MAP[item.type]}
                                        alt={item.label}
                                        className={styles.legendImage}
                                        draggable={false}
                                      />
                                      <span className={styles.legendLabel}>{item.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {topologyWorkbenchMode === 'stats' && (
                            <div className={styles.sideModeCard}>
                              <div className={styles.orchestratorSection}>
                                <div className={styles.orchestratorSectionTitle}>拓扑统计</div>
                                <div className={styles.topologyStatsGrid}>
                                  {topologyMetricCards.map((item) => (
                                    <div key={item.key} className={styles.statCard}>
                                      <div className={styles.statLabel}>{item.label}</div>
                                      <div className={styles.statValue}>{item.value}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className={styles.orchestratorSection}>
                                <div className={styles.orchestratorSectionTitle}>当前节点</div>
                                {selectedTopologyNode ? (
                                  <div className={styles.nodeDetailCard}>
                                    <div className={styles.nodeDetailTitle}>{selectedTopologyNode.name}</div>
                                    <div className={styles.nodeDetailMeta}>
                                      类型：{DEVICE_NAMES[selectedTopologyNode.type]}
                                    </div>
                                    <div className={styles.nodeDetailMeta}>
                                      坐标：({Math.round(selectedTopologyNode.x)}, {Math.round(selectedTopologyNode.y)})
                                    </div>
                                  </div>
                                ) : (
                                  <Typography.Paragraph type="secondary" className={styles.helperText}>
                                    点击画布中的节点后，可在此查看当前设备摘要。未选择节点时，这里显示拓扑级上下文。
                                  </Typography.Paragraph>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          <InteractiveTerminal projectId={currentProjectId} height={180} />
        </div>

        <Card className={styles.assistantCard} title="自然语言助手">
          <div className={styles.projectMeta}>
            <Typography.Text strong>项目备注</Typography.Text>
            <Typography.Paragraph type="secondary">
              {currentProject.remark || '暂无项目备注，可在后续迭代中补充项目信息说明。'}
            </Typography.Paragraph>
          </div>
          <ChatInput topologyId={activeTopologyId ?? undefined} onApplyDSL={handleApplyDsl} />
        </Card>
      </div>

      {floatingPreviewOpen && activeTopologyId && (
        <div
          ref={floatingPreviewRef}
          className={styles.floatingPreviewPanel}
          style={
            floatingPreviewPosition
              ? {
                  left: floatingPreviewPosition.left,
                  top: floatingPreviewPosition.top,
                  right: 'auto',
                  bottom: 'auto',
                }
              : undefined
          }
        >
          <div className={styles.floatingPreviewHeader} onMouseDown={handleFloatingPreviewMouseDown}>
            <div className={styles.floatingPreviewTitleGroup}>
              <span className={styles.floatingPreviewEyebrow}>Topology Preview</span>
              <div className={styles.floatingPreviewTitle}>
                {currentProject.name}
                {' / '}
                {activeTopology?.name ?? '项目拓扑'}
              </div>
            </div>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setFloatingPreviewOpen(false)}
            />
          </div>
          <div className={styles.floatingPreviewBody}>
            <D3TopologyPreviewer topologyId={activeTopologyId} />
          </div>
        </div>
      )}

      <Modal
        title={topologyModalMode === 'rename' ? '重命名拓扑' : '新建拓扑示例'}
        open={topologyModalOpen}
        onCancel={() => setTopologyModalOpen(false)}
        onOk={handleSubmitTopologyModal}
      >
        <Input
          value={topologyName}
          onChange={(event) => setTopologyName(event.target.value)}
          placeholder="请输入拓扑名称"
        />
      </Modal>

      <Modal
        title={
          fileModalMode === 'rename'
            ? '重命名文件'
            : fileModalMode === 'folder'
              ? '新建文件夹'
              : '新建文件'
        }
        open={fileModalOpen}
        onCancel={() => setFileModalOpen(false)}
        onOk={handleSubmitFileModal}
      >
        <Input
          value={fileName}
          onChange={(event) => setFileName(event.target.value)}
          placeholder={fileModalMode === 'folder' ? '例如 src' : '例如 intent.pne'}
        />
      </Modal>
      <Modal
        title="选择设备类型"
        open={devicePickerOpen}
        footer={null}
        onCancel={() => setDevicePickerOpen(false)}
      >
        <div className={styles.devicePickerGrid}>
          {TOPOLOGY_DEVICE_LEGEND.map((item) => (
            <button
              key={item.type}
              type="button"
              className={styles.devicePickerCard}
              onClick={() => handlePickDeviceType(item.type)}
            >
              <img src={DEVICE_IMAGE_MAP[item.type]} alt={item.label} className={styles.devicePickerImage} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </Modal>
      {dragPreview && (
        <div
          className={styles.dragPreview}
          style={{
            left: dragPreview.clientX + 18,
            top: dragPreview.clientY + 18,
          }}
        >
          <img src={dragPreview.imageSrc} alt={dragPreview.label} className={styles.dragPreviewImage} />
          <span>{dragPreview.label}</span>
        </div>
      )}
    </div>
  )
}

export default Develop
