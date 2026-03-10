import { create } from 'zustand'

import type {
  WorkspaceContextSnapshot,
  WorkspaceFileNode,
  WorkspaceProject,
  WorkspaceTab,
} from '@/model/workspace'

export interface WorkspaceStore {
  activeTabId: string | null
  fileTree: WorkspaceFileNode[]
  openTabs: WorkspaceTab[]
  projects: WorkspaceProject[]
  selectedProjectId: string | null
  closeTab: (tabId: string) => void
  setActiveTabId: (tabId: string | null) => void
  setFileTree: (tree: WorkspaceFileNode[]) => void
  setProjects: (projects: WorkspaceProject[]) => void
  setSelectedProjectId: (projectId: string | null) => void
  openFileTab: (tab: WorkspaceTab) => void
  markTabSaved: (tabId: string, content: string) => void
  updateTabContent: (tabId: string, content: string) => void
}

const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeTabId: null,
  fileTree: [],
  openTabs: [],
  projects: [],
  selectedProjectId: null,

  closeTab: (tabId) => {
    const nextTabs = get().openTabs.filter((tab) => tab.id !== tabId)
    const nextActive =
      get().activeTabId === tabId ? (nextTabs[nextTabs.length - 1]?.id ?? null) : get().activeTabId
    set({ openTabs: nextTabs, activeTabId: nextActive })
  },

  setActiveTabId: (tabId) => set({ activeTabId: tabId }),

  setFileTree: (fileTree) => set({ fileTree }),

  setProjects: (projects) => set({ projects }),

  setSelectedProjectId: (selectedProjectId) =>
    set({
      selectedProjectId,
      fileTree: [],
      openTabs: [],
      activeTabId: null,
    }),

  openFileTab: (tab) => {
    const current = get().openTabs.find((item) => item.fileId === tab.fileId)
    if (current) {
      set({ activeTabId: current.id })
      return
    }

    set((state) => ({
      openTabs: [...state.openTabs, tab],
      activeTabId: tab.id,
    }))
  },

  markTabSaved: (tabId, content) =>
    set((state) => ({
      openTabs: state.openTabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              content,
              dirty: false,
              updatedAt: new Date().toISOString(),
            }
          : tab,
      ),
    })),

  updateTabContent: (tabId, content) =>
    set((state) => ({
      openTabs: state.openTabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              content,
              dirty: tab.content !== content || tab.dirty,
              updatedAt: new Date().toISOString(),
            }
          : tab,
      ),
    })),
}))

export const getWorkspaceContextSnapshot = (
  state: Pick<WorkspaceStore, 'activeTabId' | 'openTabs' | 'projects' | 'selectedProjectId'>,
): WorkspaceContextSnapshot => {
  const project = state.projects.find((item) => item.id === state.selectedProjectId)
  const activeTab = state.openTabs.find((item) => item.id === state.activeTabId)

  return {
    projectId: project?.id,
    projectName: project?.name,
    currentFileId: activeTab?.fileId,
    currentFileName: activeTab?.title,
    currentFileContent: activeTab?.content,
  }
}

export default useWorkspaceStore
