import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface TopologyState {
  /** 当前打开的拓扑 id 与类型（json = 编辑器数据） */
  topology: { id: string; type: string }
  setTopology: (id: string, type: string) => void
  frontendLog: string
  backendLog: string
  deployLog: string
  setFrontendLog: (log: string) => void
  setBackendLog: (log: string) => void
  setDeployLog: (log: string) => void
  clearLogs: () => void
  deployDevice: string
  setDeployDevice: (projectId: string, deployDevice: string) => void
}

const useTopologyStore = create<TopologyState>()(
  devtools(
    set => ({
      topology: { id: '', type: '' },
      setTopology: (id: string, type: string) => set({ topology: { id, type } }),
      frontendLog: '',
      backendLog: '',
      deployLog: '',
      setFrontendLog: (frontendLog: string) => set({ frontendLog }),
      setBackendLog: (backendLog: string) => set({ backendLog }),
      setDeployLog: (deployLog: string) => set({ deployLog }),
      clearLogs: () => set({ deployLog: '', frontendLog: '', backendLog: '' }),
      deployDevice: '',
      setDeployDevice: (_projectId: string, deployDevice: string) => {
        set({ deployDevice })
      },
    }),
    { name: 'topology' }
  )
)

export default useTopologyStore
