import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface SideBarStore {
  treeVisible: boolean
  terminalsVisible: boolean
  agentVisible: boolean
  terminal: 'terminal' | 'log'
  setTreeVisible: (value: boolean) => void
  setAgentVisible: (value: boolean) => void
  setTerminalsVisible: (value: boolean, terminal: 'terminal' | 'log') => void
}

const sideBarStore = create<SideBarStore>()(
  devtools(set => ({
    setTreeVisible: (treeVisible: boolean) => {
      set({ treeVisible })
    },
    setAgentVisible: (agentVisible: boolean) => {
      set({ agentVisible })
    },
    setTerminalsVisible: (terminalsVisible: boolean, terminal: 'terminal' | 'log') => {
      set({ terminalsVisible, terminal })
    },
    agentVisible: false,
    treeVisible: true,
    terminalsVisible: false,
    terminal: 'log',
  })),
)

export default sideBarStore
