import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ITopology {
  id: string
  type: string // topology || json
}

export interface TopologyStore {
  topology: ITopology
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

const topologyStore = create<TopologyStore>()(
  devtools(set => ({
    setTopology: (id: string, type: string) => {
      set({ topology: { id, type } })
    },
    topology: { id: '', type: '' },
    frontendLog: '',
    backendLog: '',
    deployLog: '',
    setFrontendLog: (frontendLog: string) => {
      set({ frontendLog })
    },
    setBackendLog: (backendLog: string) => {
      set({ backendLog })
    },
    setDeployLog: (deployLog: string) => {
      set({ deployLog })
    },
    clearLogs: () => {
      set({ deployLog: '', frontendLog: '', backendLog: '' })
    },
    deployDevice: '',
    setDeployDevice: (projectId: string, deployDevice: string) => {
      window.localStorage.setItem(`${projectId}-deployDevice`, deployDevice)
      set({ deployDevice })
    },
  })),
)

export default topologyStore
