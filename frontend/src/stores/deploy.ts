import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Deployment, DeploymentLog, DeploymentStatus } from '@/api/deploy'
import type { DeploymentPreviewConfig } from '@/model/deploy'

export interface DeployState {
  // 向导步骤 0: 选择意图与拓扑 1: 配置预览 2: 执行部署 3: 完成
  wizardStep: number
  setWizardStep: (step: number) => void
  resetWizard: () => void

  // 当前部署任务选择
  selectedIntentId: string
  selectedTopologyId: string
  setSelectedIntentId: (id: string) => void
  setSelectedTopologyId: (id: string) => void

  // 配置预览结果（IP/NDN/GEO/P4）
  previewConfig: DeploymentPreviewConfig | null
  previewLoading: boolean
  setPreviewConfig: (config: DeploymentPreviewConfig | null) => void
  setPreviewLoading: (loading: boolean) => void

  // 当前部署实例（创建后用于进度展示与回滚）
  currentDeployment: Deployment | null
  setCurrentDeployment: (d: Deployment | null) => void

  // 实时进度日志（WebSocket 推送 + 轮询补充）
  progressLogs: DeploymentLog[]
  progressPercent: number
  setProgressLogs: (logs: DeploymentLog[]) => void
  appendProgressLog: (log: DeploymentLog) => void
  setProgressPercent: (p: number) => void
  setDeploymentStatus: (status: DeploymentStatus) => void
  clearProgress: () => void

  // 部署列表（用于「部署记录」）
  deploymentList: Deployment[]
  listLoading: boolean
  setDeploymentList: (list: Deployment[]) => void
  setListLoading: (loading: boolean) => void
}

const initialWizard = {
  wizardStep: 0,
  selectedIntentId: '',
  selectedTopologyId: '',
  previewConfig: null as DeploymentPreviewConfig | null,
  previewLoading: false,
  currentDeployment: null as Deployment | null,
  progressLogs: [] as DeploymentLog[],
  progressPercent: 0,
  deploymentList: [] as Deployment[],
  listLoading: false,
}

const useDeployStore = create<DeployState>()(
  devtools(
    (set) => ({
      ...initialWizard,

      setWizardStep: (wizardStep) => set({ wizardStep }),
      resetWizard: () =>
        set({
          wizardStep: 0,
          selectedIntentId: '',
          selectedTopologyId: '',
          previewConfig: null,
          previewLoading: false,
          currentDeployment: null,
          progressLogs: [],
          progressPercent: 0,
        }),

      setSelectedIntentId: (selectedIntentId) => set({ selectedIntentId }),
      setSelectedTopologyId: (selectedTopologyId) => set({ selectedTopologyId }),

      setPreviewConfig: (previewConfig) => set({ previewConfig }),
      setPreviewLoading: (previewLoading) => set({ previewLoading }),

      setCurrentDeployment: (currentDeployment) => set({ currentDeployment }),

      setProgressLogs: (progressLogs) => set({ progressLogs }),
      appendProgressLog: (log) =>
        set((s) => ({ progressLogs: [...s.progressLogs, log] })),
      setProgressPercent: (progressPercent) => set({ progressPercent }),
      setDeploymentStatus: (status) =>
        set((s) =>
          s.currentDeployment
            ? { currentDeployment: { ...s.currentDeployment, status } }
            : {}
        ),
      clearProgress: () =>
        set({ progressLogs: [], progressPercent: 0 }),

      setDeploymentList: (deploymentList) => set({ deploymentList }),
      setListLoading: (listLoading) => set({ listLoading }),
    }),
    { name: 'deploy' }
  )
)

export default useDeployStore
