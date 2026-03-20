import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { fileApi, projectApi, topologyApi, type ProjectRecord } from '@/api'

export interface ProjectFileTab {
  id: string
  name: string
  path: string
  content: string
  language: string
  dirty: boolean
}

export interface ProjectStore {
  projectList: ProjectRecord[]
  currentProjectId: string | null
  currentProject: ProjectRecord | null
  loading: boolean
  tabs: ProjectFileTab[]
  activeTabId: string | null
  init: () => Promise<void>
  refreshProjects: () => Promise<void>
  selectProject: (projectId: string | null) => Promise<void>
  createProject: (payload: { name: string; remark?: string }) => Promise<ProjectRecord | null>
  updateCurrentProject: (payload: Partial<ProjectRecord>) => Promise<ProjectRecord | null>
  removeProject: (projectId: string) => Promise<void>
  openFileTab: (payload: ProjectFileTab) => void
  updateTabContent: (fileId: string, content: string) => void
  markTabSaved: (fileId: string, content?: string) => void
  closeTab: (fileId: string) => void
  setActiveTabId: (fileId: string | null) => void
  resetTabs: () => void
  syncCurrentFile: (fileId: string | null) => Promise<void>
}

function detectLanguage(path: string): string {
  const lowerPath = path.toLowerCase()
  if (lowerPath.endsWith('.json')) return 'json'
  if (lowerPath.endsWith('.p4')) return 'c'
  if (lowerPath.endsWith('.ts')) return 'typescript'
  if (lowerPath.endsWith('.tsx')) return 'typescript'
  if (lowerPath.endsWith('.py')) return 'python'
  return 'plaintext'
}

const useProjectStore = create<ProjectStore>()(
  devtools((set, get) => ({
    projectList: [],
    currentProjectId: null,
    currentProject: null,
    loading: false,
    tabs: [],
    activeTabId: null,

    init: async () => {
      await get().refreshProjects()
    },

    refreshProjects: async () => {
      set({ loading: true })
      try {
        const res = await projectApi.getList()
        const projectList = res.data ?? []
        const currentProjectId = get().currentProjectId
        const nextProjectId =
          currentProjectId && projectList.some((project) => project.id === currentProjectId)
            ? currentProjectId
            : projectList[0]?.id ?? null
        set({
          projectList,
          currentProjectId: nextProjectId,
          currentProject: nextProjectId
            ? projectList.find((project) => project.id === nextProjectId) ?? null
            : null,
        })
        if (nextProjectId && nextProjectId !== currentProjectId) {
          await get().selectProject(nextProjectId)
        }
      } finally {
        set({ loading: false })
      }
    },

    selectProject: async (projectId) => {
      if (!projectId) {
        set({
          currentProjectId: null,
          currentProject: null,
          tabs: [],
          activeTabId: null,
        })
        return
      }
      const res = await projectApi.getById(projectId)
      set({
        currentProjectId: projectId,
        currentProject: res.data,
        tabs: [],
        activeTabId: null,
      })
      // 预拉拓扑列表：触发后端 list 上的物化，使 topology-*.json 尽早出现在文件树中
      void topologyApi
        .getList({ pageNo: 1, pageSize: 100, projectId })
        .catch(() => {
          /* 静默失败，避免切换项目被网络错误打断 */
        })
    },

    createProject: async (payload) => {
      const res = await projectApi.create(payload)
      const createdProject = res.data
      set((state) => ({
        projectList: [createdProject, ...state.projectList],
      }))
      await get().selectProject(createdProject.id)
      return createdProject
    },

    updateCurrentProject: async (payload) => {
      const currentProject = get().currentProject
      if (!currentProject) {
        return null
      }
      const res = await projectApi.update({
        id: currentProject.id,
        name: payload.name ?? currentProject.name,
        remark: payload.remark ?? currentProject.remark,
        topologyId: payload.topologyId ?? currentProject.topologyId ?? null,
        currentFileId: payload.currentFileId ?? currentProject.currentFileId ?? null,
        lastIntentId: payload.lastIntentId ?? currentProject.lastIntentId ?? null,
      })
      const updatedProject = res.data
      set((state) => ({
        currentProject: updatedProject,
        currentProjectId: updatedProject.id,
        projectList: state.projectList.map((project) =>
          project.id === updatedProject.id ? updatedProject : project
        ),
      }))
      return updatedProject
    },

    removeProject: async (projectId) => {
      await projectApi.delete(projectId)
      const nextProjectList = get().projectList.filter((project) => project.id !== projectId)
      const nextProjectId =
        get().currentProjectId === projectId ? nextProjectList[0]?.id ?? null : get().currentProjectId
      set({
        projectList: nextProjectList,
        currentProjectId: nextProjectId,
        currentProject: nextProjectId
          ? nextProjectList.find((project) => project.id === nextProjectId) ?? null
          : null,
        tabs: get().currentProjectId === projectId ? [] : get().tabs,
        activeTabId: get().currentProjectId === projectId ? null : get().activeTabId,
      })
      if (nextProjectId) {
        await get().selectProject(nextProjectId)
      }
    },

    openFileTab: (payload) => {
      set((state) => {
        const exists = state.tabs.find((tab) => tab.id === payload.id)
        if (exists) {
          return {
            activeTabId: payload.id,
            tabs: state.tabs.map((tab) => (tab.id === payload.id ? { ...tab, ...payload } : tab)),
          }
        }
        return {
          activeTabId: payload.id,
          tabs: [...state.tabs, payload],
        }
      })
    },

    updateTabContent: (fileId, content) => {
      set((state) => ({
        activeTabId: fileId,
        tabs: state.tabs.map((tab) =>
          tab.id === fileId ? { ...tab, content, dirty: true } : tab
        ),
      }))
    },

    markTabSaved: (fileId, content) => {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === fileId ? { ...tab, content: content ?? tab.content, dirty: false } : tab
        ),
      }))
    },

    closeTab: (fileId) => {
      set((state) => {
        const nextTabs = state.tabs.filter((tab) => tab.id !== fileId)
        const nextActiveTabId =
          state.activeTabId === fileId ? nextTabs[nextTabs.length - 1]?.id ?? null : state.activeTabId
        return {
          tabs: nextTabs,
          activeTabId: nextActiveTabId,
        }
      })
    },

    setActiveTabId: (fileId) => {
      set({ activeTabId: fileId })
    },

    resetTabs: () => {
      set({ tabs: [], activeTabId: null })
    },

    syncCurrentFile: async (fileId) => {
      const currentProject = get().currentProject
      if (!currentProject) {
        return
      }
      await get().updateCurrentProject({ currentFileId: fileId })
      if (fileId) {
        const tab = get().tabs.find((item) => item.id === fileId)
        if (!tab) {
          const res = await fileApi.read(fileId)
          get().openFileTab({
            id: fileId,
            name: fileId,
            path: fileId,
            content: res.data ?? '',
            language: detectLanguage(fileId),
            dirty: false,
          })
        }
      }
    },
  }))
)

export { detectLanguage }
export default useProjectStore
