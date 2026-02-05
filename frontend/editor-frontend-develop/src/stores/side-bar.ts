import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface SideBarStore {
  treeVisible: boolean
  terminalsVisible: boolean
  terminal: 'terminal' | 'log'
  setTreeVisible: (value: boolean) => void
  setTerminalsVisible: (value: boolean, terminal: 'terminal' | 'log') => void
}

const sideBarStore = create<SideBarStore>()(
  devtools(set => ({
    setTreeVisible: (treeVisible: boolean) => {
      set({ treeVisible })
    },
    setTerminalsVisible: (terminalsVisible: boolean, terminal: 'terminal' | 'log') => {
      set({ terminalsVisible, terminal })
    },
    treeVisible: true,
    terminalsVisible: false,
    terminal: 'log',
  })),
)

export default sideBarStore
