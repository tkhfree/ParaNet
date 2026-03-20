import Editor from '@monaco-editor/react'
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  List,
  Modal,
  Select,
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
  AimOutlined,
} from '@ant-design/icons'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ChatInput } from '@/components/editor'
import { useResizeObserver } from '@/hooks/useResizeObserver'
import InteractiveTerminal from '@/components/project/InteractiveTerminal'
import { D3TopologyEditor, D3TopologyPreviewer, type D3Node } from '@/components/topology'
import type {
  D3TopologyEditorHandle,
  D3TopologyEditorStats,
} from '@/components/topology/TopologyEditor/D3TopologyEditor'
import {
  DEFAULT_DEVICE_LEGENDS,
  DEVICE_IMAGE_OPTIONS,
  resolveDeviceImage,
  resolveDeviceName,
  setDeviceLegendRegistry,
} from '@/components/topology/d3-engine'
import {
  cancelCustomDeviceDrag,
  releaseCustomDeviceDrag,
  startCustomDeviceDrag,
  subscribeCustomDeviceDrag,
  updateCustomDeviceDrag,
} from '@/components/topology/d3-engine/dragDrop'
import { deviceLegendApi, fileApi, topologyApi } from '@/api'
import type { ProjectFileNode } from '@/api/file'
import type { DeviceLegend, NodeType, Topology } from '@/model/topology'
import { detectLanguage, useProjectStore } from '@/stores'

import styles from './index.module.less'

type FileModalMode = 'file' | 'folder' | 'rename'
type TopologyModalMode = 'create' | 'rename'
type DeviceLegendModalMode = 'create' | 'edit'
type WorkbenchRailMode = 'topology' | 'overview' | 'assets'
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

type DevelopLayoutWidths = {
  left: number
  right: number
}

type DevelopLayoutDragState = {
  handle: 'left' | 'right'
  startX: number
  initialWidths: DevelopLayoutWidths
  containerWidth: number
} | null

type WorkspaceVerticalDragState = {
  startY: number
  initialTopHeight: number
  containerHeight: number
} | null

const DEVICE_LEGEND_IMAGE_OPTIONS = Object.keys(DEVICE_IMAGE_OPTIONS).map((key) => ({
  label: key,
  value: key,
}))

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

function getStoredDeviceLegends(): DeviceLegend[] {
  if (typeof window === 'undefined') {
    return DEFAULT_DEVICE_LEGENDS
  }

  try {
    const raw = window.localStorage.getItem(DEVICE_LEGEND_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_DEVICE_LEGENDS
    }
    const parsed = JSON.parse(raw) as DeviceLegend[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DEVICE_LEGENDS
  } catch {
    return DEFAULT_DEVICE_LEGENDS
  }
}

function persistDeviceLegends(legends: DeviceLegend[]) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(DEVICE_LEGEND_STORAGE_KEY, JSON.stringify(legends))
}

const DEFAULT_DSL_FILE_NAME = 'intent.pne'
const FLOATING_PREVIEW_MARGIN = 16
const DEVELOP_LAYOUT_STORAGE_KEY = 'paranet-develop-layout-widths'
const DEVELOP_WORKSPACE_SPLIT_STORAGE_KEY = 'paranet-develop-workspace-split'
const DEVICE_LEGEND_STORAGE_KEY = 'paranet-device-legends'
const DEVELOP_LAYOUT_GAP = 16
const DEVELOP_LEFT_MIN = 240
const DEVELOP_LEFT_MAX = 420
const DEVELOP_RIGHT_MIN = 300
const DEVELOP_RIGHT_MAX = 520
const DEVELOP_MIDDLE_MIN = 560
// 窄屏时适当降低最小宽度，避免左右栏被 clamp 直接钉死导致“看起来能拖、实际上不动”
const DEVELOP_LEFT_MIN_NARROW = 200
const DEVELOP_RIGHT_MIN_NARROW = 240
const DEVELOP_MIDDLE_MIN_NARROW = 420
const DEVELOP_NARROW_CONTAINER_THRESHOLD = 1280
const DEVELOP_WORKSPACE_GAP = 12
const DEVELOP_WORKSPACE_TOP_MIN = 360
const DEVELOP_WORKSPACE_BOTTOM_MIN = 140

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

function clampDevelopLayoutWidths(
  widths: DevelopLayoutWidths,
  containerWidth: number
): DevelopLayoutWidths {
  const available = containerWidth - DEVELOP_LAYOUT_GAP * 2
  if (available <= 0) {
    return widths
  }

  const isNarrow = containerWidth < DEVELOP_NARROW_CONTAINER_THRESHOLD
  const leftMin = isNarrow ? DEVELOP_LEFT_MIN_NARROW : DEVELOP_LEFT_MIN
  const rightMin = isNarrow ? DEVELOP_RIGHT_MIN_NARROW : DEVELOP_RIGHT_MIN
  const middleMin = isNarrow ? DEVELOP_MIDDLE_MIN_NARROW : DEVELOP_MIDDLE_MIN

  const leftUpperBound = Math.max(
    leftMin,
    Math.min(DEVELOP_LEFT_MAX, available - rightMin - middleMin)
  )
  const left = Math.min(Math.max(widths.left, leftMin), leftUpperBound)

  const rightUpperBound = Math.max(
    rightMin,
    Math.min(DEVELOP_RIGHT_MAX, available - left - middleMin)
  )
  const right = Math.min(Math.max(widths.right, rightMin), rightUpperBound)

  const adjustedLeftUpperBound = Math.max(
    leftMin,
    Math.min(DEVELOP_LEFT_MAX, available - right - middleMin)
  )

  return {
    left: Math.min(left, adjustedLeftUpperBound),
    right,
  }
}

function clampWorkspaceTopHeight(topHeight: number, containerHeight: number): number {
  const available = containerHeight - DEVELOP_WORKSPACE_GAP
  const maxTop = Math.max(0, available - DEVELOP_WORKSPACE_BOTTOM_MIN)
  const minTop = Math.max(0, Math.min(DEVELOP_WORKSPACE_TOP_MIN, maxTop))

  return Math.min(Math.max(topHeight, minTop), maxTop)
}

const Develop: React.FC = () => {
  const { message } = App.useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mainGridRef = useRef<HTMLDivElement | null>(null)
  const workspaceColumnRef = useRef<HTMLDivElement | null>(null)
  const topologyEditorRef = useRef<D3TopologyEditorHandle | null>(null)
  const floatingPreviewRef = useRef<HTMLDivElement | null>(null)
  const floatingPreviewDragRef = useRef<{
    pointerOffsetX: number
    pointerOffsetY: number
    width: number
    height: number
  } | null>(null)
  const layoutDragRef = useRef<DevelopLayoutDragState>(null)
  const workspaceVerticalDragRef = useRef<WorkspaceVerticalDragState>(null)
  const mainGridSize = useResizeObserver(mainGridRef)
  const workspaceColumnSize = useResizeObserver(workspaceColumnRef)
  const {
    init,
    projectList,
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
  const [deviceLegendList, setDeviceLegendList] = useState<DeviceLegend[]>([])
  const [deviceLegendLoading, setDeviceLegendLoading] = useState(false)
  const [selectedLegendId, setSelectedLegendId] = useState<string | null>(null)
  const [deviceLegendModalOpen, setDeviceLegendModalOpen] = useState(false)
  const [deviceLegendModalMode, setDeviceLegendModalMode] = useState<DeviceLegendModalMode>('create')
  const [deviceLegendType, setDeviceLegendType] = useState('')
  const [deviceLegendLabel, setDeviceLegendLabel] = useState('')
  const [deviceLegendImageKey, setDeviceLegendImageKey] = useState('device1')
  const [deviceLegendColor, setDeviceLegendColor] = useState('#64748b')
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
  const [workspaceTopHeight, setWorkspaceTopHeight] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 620
    }

    try {
      const raw = window.localStorage.getItem(DEVELOP_WORKSPACE_SPLIT_STORAGE_KEY)
      if (!raw) {
        return 620
      }
      const parsed = JSON.parse(raw) as { topHeight?: number }
      return typeof parsed.topHeight === 'number' ? parsed.topHeight : 620
    } catch {
      return 620
    }
  })
  const [layoutWidths, setLayoutWidths] = useState<DevelopLayoutWidths>(() => {
    if (typeof window === 'undefined') {
      return { left: 280, right: 360 }
    }

    try {
      const raw = window.localStorage.getItem(DEVELOP_LAYOUT_STORAGE_KEY)
      if (!raw) {
        return { left: 280, right: 360 }
      }
      const parsed = JSON.parse(raw) as Partial<DevelopLayoutWidths>
      return {
        left: typeof parsed.left === 'number' ? parsed.left : 280,
        right: typeof parsed.right === 'number' ? parsed.right : 360,
      }
    } catch {
      return { left: 280, right: 360 }
    }
  })

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
  const selectedLegend = useMemo(
    () => deviceLegendList.find((item) => item.id === selectedLegendId) ?? null,
    [deviceLegendList, selectedLegendId]
  )
  const deviceLegendPreviewLabel = deviceLegendLabel.trim() || '设备显示名称预览'
  const deviceLegendPreviewType = deviceLegendType.trim() || 'device_type'
  const deviceLegendPreviewColor = deviceLegendColor.trim() || '#64748b'
  const deviceLegendPreviewImage = DEVICE_IMAGE_OPTIONS[deviceLegendImageKey] ?? DEVICE_IMAGE_OPTIONS.device1
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
      { key: 'overview' as WorkbenchRailMode, label: '上下文总览', icon: <BarChartOutlined /> },
      { key: 'assets' as WorkbenchRailMode, label: '设备资源', icon: <AppstoreOutlined /> },
    ],
    []
  )
  const isWorkspaceCompact = workspaceTopHeight < 620
  const isWorkspaceTight = workspaceTopHeight < 500
  const isWorkspaceUltraTight = workspaceTopHeight < 420

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

      const imageSrc = resolveDeviceImage(deviceType)
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
          imageSrc: state.imageSrc ?? resolveDeviceImage(state.deviceType as NodeType),
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

  const loadDeviceLegends = useCallback(async () => {
    setDeviceLegendLoading(true)
    try {
      const res = await deviceLegendApi.list()
      const legends = (res.data?.length ? res.data : getStoredDeviceLegends()) ?? getStoredDeviceLegends()
      persistDeviceLegends(legends)
      setDeviceLegendList(legends)
      setDeviceLegendRegistry(legends)
      setSelectedLegendId((current) => legends.some((item) => item.id === current) ? current : legends[0]?.id ?? null)
    } catch {
      const legends = getStoredDeviceLegends()
      setDeviceLegendList(legends)
      setDeviceLegendRegistry(legends)
      setSelectedLegendId((current) => legends.some((item) => item.id === current) ? current : legends[0]?.id ?? null)
    } finally {
      setDeviceLegendLoading(false)
    }
  }, [])

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    void loadDeviceLegends()
  }, [loadDeviceLegends])

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
    if (mainGridSize.width <= 0) {
      return
    }

    setLayoutWidths((current) => clampDevelopLayoutWidths(current, mainGridSize.width))
  }, [mainGridSize.width])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(DEVELOP_LAYOUT_STORAGE_KEY, JSON.stringify(layoutWidths))
  }, [layoutWidths])

  useEffect(() => {
    if (workspaceColumnSize.height <= 0) {
      return
    }

    setWorkspaceTopHeight((current) =>
      clampWorkspaceTopHeight(current, workspaceColumnSize.height)
    )
  }, [workspaceColumnSize.height])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      DEVELOP_WORKSPACE_SPLIT_STORAGE_KEY,
      JSON.stringify({ topHeight: workspaceTopHeight })
    )
  }, [workspaceTopHeight])

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

  const openDeviceLegendModal = useCallback(
    (mode: DeviceLegendModalMode) => {
      setDeviceLegendModalMode(mode)
      if (mode === 'edit' && selectedLegend) {
        setDeviceLegendType(selectedLegend.type)
        setDeviceLegendLabel(selectedLegend.label)
        setDeviceLegendImageKey(selectedLegend.imageKey)
        setDeviceLegendColor(selectedLegend.color)
      } else {
        setDeviceLegendType('')
        setDeviceLegendLabel('')
        setDeviceLegendImageKey('device1')
        setDeviceLegendColor('#64748b')
      }
      setDeviceLegendModalOpen(true)
    },
    [selectedLegend]
  )

  const handleSubmitDeviceLegendModal = async () => {
    const type = deviceLegendType.trim()
    const label = deviceLegendLabel.trim()
    if (!type || !label) {
      message.warning('请填写设备类型标识和显示名称')
      return
    }

    const payload = {
      type,
      label,
      imageKey: deviceLegendImageKey,
      color: deviceLegendColor.trim() || '#64748b',
    }

    if (deviceLegendModalMode === 'edit' && selectedLegend) {
      try {
        await deviceLegendApi.update(selectedLegend.id, payload)
      } catch {
        const nextLegends = deviceLegendList.map((item) =>
          item.id === selectedLegend.id
            ? {
                ...item,
                ...payload,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
        persistDeviceLegends(nextLegends)
      }
      message.success('设备图例已更新')
    } else {
      try {
        await deviceLegendApi.create(payload)
      } catch {
        const now = new Date().toISOString()
        const nextLegends = [
          ...deviceLegendList,
          {
            id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
            ...payload,
            sort: deviceLegendList.length * 10 + 10,
            createdAt: now,
            updatedAt: now,
          },
        ]
        persistDeviceLegends(nextLegends)
      }
      message.success('设备图例已创建')
    }

    setDeviceLegendModalOpen(false)
    await loadDeviceLegends()
  }

  const handleDeleteDeviceLegend = () => {
    if (!selectedLegend) {
      message.warning('请先选择要删除的设备图例')
      return
    }

    Modal.confirm({
      title: '确认删除设备图例',
      content: `图例「${selectedLegend.label}」删除后将不再出现在设备资源区，是否继续？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deviceLegendApi.delete(selectedLegend.id)
        } catch {
          const nextLegends = deviceLegendList.filter((item) => item.id !== selectedLegend.id)
          persistDeviceLegends(nextLegends.length > 0 ? nextLegends : DEFAULT_DEVICE_LEGENDS)
        }
        message.success('设备图例已删除')
        await loadDeviceLegends()
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

  const handleLayoutResizerMouseDown = useCallback(
    (handle: 'left' | 'right', event: React.MouseEvent<HTMLDivElement>) => {
      if (!mainGridRef.current) {
        return
      }

      layoutDragRef.current = {
        handle,
        startX: event.clientX,
        initialWidths: layoutWidths,
        containerWidth: mainGridRef.current.clientWidth,
      }
      event.preventDefault()
    },
    [layoutWidths]
  )

  const handleWorkspaceVerticalResizerMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!workspaceColumnRef.current) {
        return
      }

      workspaceVerticalDragRef.current = {
        startY: event.clientY,
        initialTopHeight: workspaceTopHeight,
        containerHeight: workspaceColumnRef.current.clientHeight,
      }
      event.preventDefault()
    },
    [workspaceTopHeight]
  )

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

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const dragState = layoutDragRef.current
      if (!dragState) {
        return
      }

      const deltaX = event.clientX - dragState.startX
      const nextWidths =
        dragState.handle === 'left'
          ? {
              left: dragState.initialWidths.left + deltaX,
              right: dragState.initialWidths.right,
            }
          : {
              left: dragState.initialWidths.left,
              right: dragState.initialWidths.right - deltaX,
            }

      setLayoutWidths(clampDevelopLayoutWidths(nextWidths, dragState.containerWidth))
    }

    const handleMouseUp = () => {
      layoutDragRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const dragState = workspaceVerticalDragRef.current
      if (!dragState) {
        return
      }

      const deltaY = event.clientY - dragState.startY
      setWorkspaceTopHeight(
        clampWorkspaceTopHeight(
          dragState.initialTopHeight + deltaY,
          dragState.containerHeight
        )
      )
    }

    const handleMouseUp = () => {
      workspaceVerticalDragRef.current = null
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
        <Empty
          description={
            projectList.length === 0
              ? '当前已经没有任何项目了。请在顶部点击“新建项目”创建第一个项目后，再进入模态开发子系统。'
              : '请先在顶部选择或创建项目，然后进入模态开发子系统。'
          }
        />
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

      <div ref={mainGridRef} className={styles.mainGrid}>
        <div
          className={styles.leftPane}
          style={{ width: layoutWidths.left, flexBasis: layoutWidths.left }}
        >
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
        </div>

        <div
          className={styles.columnResizer}
          onMouseDown={(event) => handleLayoutResizerMouseDown('left', event)}
        />

        <div
          ref={workspaceColumnRef}
          className={`${styles.workspaceColumn} ${styles.workspacePane} ${isWorkspaceCompact ? styles.workspaceColumnCompact : ''} ${isWorkspaceUltraTight ? styles.workspaceColumnUltraTight : ''}`}
        >
          <div
            className={`${styles.workspaceMainPane} ${isWorkspaceCompact ? styles.workspaceMainPaneCompact : ''}`}
            style={{ height: workspaceTopHeight, flexBasis: workspaceTopHeight }}
          >
            <Card className={styles.workspaceCard} bodyStyle={{ height: '100%' }}>
              <Tabs
                className={styles.workspaceTabs}
                items={[
                  {
                    key: 'code',
                    label: 'IDE 工作区',
                    children: tabs.length > 0 ? (
                      <Tabs
                        className={isWorkspaceUltraTight ? styles.editorTabsCompact : undefined}
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
                              height="100%"
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
                      <div className={`${styles.topologyPanel} ${isWorkspaceCompact ? styles.topologyPanelCompact : ''}`}>
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
                                  <div className={`${styles.stageHeader} ${isWorkspaceTight ? styles.stageHeaderCompact : ''}`}>
                                    <div>
                                      <Typography.Title level={4}>NetProgrammable</Typography.Title>
                                      {!isWorkspaceUltraTight && (
                                        <Typography.Text type="secondary">
                                          {currentProject.name}
                                          {' / '}
                                          {activeTopology?.name ?? '未选择拓扑'}
                                        </Typography.Text>
                                      )}
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
                                    {!isWorkspaceTight && (
                                      <div className={styles.stageLegend}>
                                        {stageLegendItems.map((item) => (
                                          <div key={item.key} className={styles.stageLegendItem}>
                                            <span className={styles.stageLegendDot} style={{ backgroundColor: item.color }} />
                                            <span>{item.label}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
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
                                        <Empty description="拓扑加载失败，请稍后重试" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {!isWorkspaceCompact && (
                                  <div className={styles.topologyStatsGrid}>
                                    {topologyMetricCards.map((item) => (
                                      <div key={item.key} className={styles.statCard}>
                                        <div className={styles.statLabel}>{item.label}</div>
                                        <div className={styles.statValue}>{item.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {topologyWorkbenchMode === 'overview' && (
                              <div className={`${styles.sideModeCard} ${styles.overviewPanel}`}>
                                <div className={styles.orchestratorHeader}>
                                  <BarChartOutlined />
                                  <span>上下文总览</span>
                                </div>
                                <div className={styles.orchestratorHero}>
                                  <div className={styles.orchestratorHeroIcon}>▶</div>
                                  <Typography.Paragraph type="secondary">
                                    这里统一汇总当前项目、拓扑统计与节点上下文，供右侧多模态网络Agent生成协议与代码时参考。
                                  </Typography.Paragraph>
                                </div>
                                <div className={styles.orchestratorSection}>
                                  <div className={styles.orchestratorSectionTitle}>项目与拓扑</div>
                                  <div className={`${styles.nodeDetailCard} ${styles.overviewSummaryCard}`}>
                                    <div className={styles.nodeDetailTitle}>当前工作上下文</div>
                                    <div className={styles.overviewMetaGrid}>
                                      <div className={styles.overviewMetaItem}>
                                        <div className={styles.overviewMetaLabel}>当前项目</div>
                                        <div className={styles.overviewMetaValue}>{currentProject.name}</div>
                                      </div>
                                      <div className={styles.overviewMetaItem}>
                                        <div className={styles.overviewMetaLabel}>当前拓扑</div>
                                        <div className={styles.overviewMetaValue}>{activeTopology?.name ?? '未选择拓扑'}</div>
                                      </div>
                                      <div className={styles.overviewMetaItem}>
                                        <div className={styles.overviewMetaLabel}>节点数量</div>
                                        <div className={styles.overviewMetaValue}>
                                          {topologyStats?.nodeCount ?? activeTopology?.nodes?.length ?? 0}
                                        </div>
                                      </div>
                                      <div className={styles.overviewMetaItem}>
                                        <div className={styles.overviewMetaLabel}>链路数量</div>
                                        <div className={styles.overviewMetaValue}>
                                          {topologyStats?.linkCount ?? activeTopology?.links?.length ?? 0}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
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
                                  <div className={styles.orchestratorSectionTitle}>选中节点</div>
                                  {selectedTopologyNode ? (
                                    <div className={`${styles.nodeDetailCard} ${styles.overviewNodeCard}`}>
                                      <div className={styles.nodeDetailTitle}>{selectedTopologyNode.name}</div>
                                      <div className={styles.nodeDetailMeta}>
                                        类型：{resolveDeviceName(selectedTopologyNode.type)}
                                      </div>
                                      <div className={styles.nodeDetailMeta}>
                                        坐标：({Math.round(selectedTopologyNode.x)}, {Math.round(selectedTopologyNode.y)})
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={`${styles.nodeDetailCard} ${styles.overviewNodePlaceholder}`}>
                                      <div className={styles.nodeDetailTitle}>未选择节点</div>
                                      <Typography.Paragraph type="secondary" className={styles.helperText}>
                                        在拓扑画布中选中节点后，这里会显示设备级上下文，供右侧 Agent 生成协议与代码时参考。
                                      </Typography.Paragraph>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {topologyWorkbenchMode === 'assets' && (
                              <div className={`${styles.sideModeCard} ${styles.assetsPanel}`}>
                                <div className={`${styles.orchestratorSection} ${styles.assetsSectionCard}`}>
                                  <div className={styles.orchestratorSectionTitle}>项目拓扑</div>
                                  <List
                                    split={false}
                                    className={styles.topologyAssetList}
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
                                <div className={`${styles.orchestratorSection} ${styles.assetsSectionCard}`}>
                                  <div className={styles.orchestratorSectionTitle}>设备图例</div>
                                  <div className={styles.legendToolbar}>
                                    <Button size="small" icon={<PlusOutlined />} onClick={() => openDeviceLegendModal('create')}>
                                      新建
                                    </Button>
                                    <Button
                                      size="small"
                                      icon={<FormOutlined />}
                                      onClick={() => openDeviceLegendModal('edit')}
                                      disabled={!selectedLegend}
                                    >
                                      编辑
                                    </Button>
                                    <Button
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={handleDeleteDeviceLegend}
                                      disabled={!selectedLegend}
                                    >
                                      删除
                                    </Button>
                                  </div>
                                  <div className={styles.sidebarLegendGrid}>
                                    {deviceLegendList.map((item) => (
                                      <div
                                        key={item.id}
                                        className={`${styles.legendItem} ${selectedLegendId === item.id ? styles.legendItemSelected : ''}`}
                                        onClick={() => setSelectedLegendId(item.id)}
                                        onMouseDown={(event) => {
                                          startCustomLegendDrag(event, item.type as NodeType, item.label)
                                        }}
                                        onDoubleClick={() => {
                                          handlePickDeviceType(item.type as NodeType)
                                        }}
                                      >
                                        <img
                                          src={resolveDeviceImage(item.type)}
                                          alt={item.label}
                                          className={styles.legendImage}
                                          draggable={false}
                                        />
                                        <span className={styles.legendTypeTag}>{item.type}</span>
                                        <span className={styles.legendLabel}>{item.label}</span>
                                      </div>
                                    ))}
                                  </div>
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
          </div>

          <div
            className={styles.workspaceRowResizer}
            onMouseDown={handleWorkspaceVerticalResizerMouseDown}
          />

          <div className={styles.terminalPane}>
            <InteractiveTerminal projectId={currentProjectId} height="100%" />
          </div>
        </div>

        <div
          className={styles.columnResizer}
          onMouseDown={(event) => handleLayoutResizerMouseDown('right', event)}
        />

        <div
          className={styles.rightPane}
          style={{ width: layoutWidths.right, flexBasis: layoutWidths.right }}
        >
          <Card className={styles.assistantCard} title="多模态网络Agent">
            <ChatInput topologyId={activeTopologyId ?? undefined} onApplyDSL={handleApplyDsl} />
          </Card>
        </div>
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
          {deviceLegendList.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.devicePickerCard}
              onClick={() => handlePickDeviceType(item.type as NodeType)}
            >
              <img src={resolveDeviceImage(item.type)} alt={item.label} className={styles.devicePickerImage} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        title={deviceLegendModalMode === 'edit' ? '编辑设备图例' : '新建设备图例'}
        open={deviceLegendModalOpen}
        onCancel={() => setDeviceLegendModalOpen(false)}
        onOk={() => void handleSubmitDeviceLegendModal()}
        confirmLoading={deviceLegendLoading}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Input
            value={deviceLegendType}
            onChange={(event) => setDeviceLegendType(event.target.value)}
            placeholder="设备类型标识，例如 firewall"
          />
          <Input
            value={deviceLegendLabel}
            onChange={(event) => setDeviceLegendLabel(event.target.value)}
            placeholder="显示名称，例如 防火墙"
          />
          <Select
            value={deviceLegendImageKey}
            options={DEVICE_LEGEND_IMAGE_OPTIONS}
            onChange={setDeviceLegendImageKey}
            placeholder="选择图标模板"
          />
          <Input
            value={deviceLegendColor}
            onChange={(event) => setDeviceLegendColor(event.target.value)}
            placeholder="强调色，例如 #3b82f6"
          />
          <div className={styles.legendTemplatePreview}>
            <div className={styles.legendTemplatePreviewHeader}>图标模板预览</div>
            <div className={styles.legendTemplatePreviewCard}>
              <div
                className={styles.legendTemplatePreviewAccent}
                style={{ backgroundColor: deviceLegendPreviewColor }}
              />
              <img
                src={deviceLegendPreviewImage}
                alt={deviceLegendPreviewLabel}
                className={styles.legendTemplatePreviewImage}
              />
              <span className={styles.legendTypeTag}>{deviceLegendPreviewType}</span>
              <span className={styles.legendLabel}>{deviceLegendPreviewLabel}</span>
            </div>
          </div>
        </Space>
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
