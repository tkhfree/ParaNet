import { create } from 'zustand'
import type { IntentCompileResponse } from '@/model/intent'

export interface IntentStore {
  // 当前编辑的 DSL 内容
  dslContent: string
  setDslContent: (content: string) => void

  // 编译预览结果
  compileResult: IntentCompileResponse | null
  compileLoading: boolean
  setCompileResult: (result: IntentCompileResponse | null) => void
  setCompileLoading: (loading: boolean) => void

  // 选中的拓扑（用于编译）
  selectedTopologyId: string | null
  setSelectedTopologyId: (id: string | null) => void

  // 重置
  reset: () => void
}

const initialState = {
  dslContent: '',
  compileResult: null as IntentCompileResponse | null,
  compileLoading: false,
  selectedTopologyId: null as string | null,
}

const useIntentStore = create<IntentStore>((set) => ({
  ...initialState,

  setDslContent: (content) => set({ dslContent: content }),

  setCompileResult: (result) => set({ compileResult: result }),
  setCompileLoading: (loading) => set({ compileLoading: loading }),

  setSelectedTopologyId: (id) => set({ selectedTopologyId: id }),

  reset: () => set(initialState),
}))

export default useIntentStore
