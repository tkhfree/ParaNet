import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark'

export interface SystemStore {
  // 状态
  collapsed: boolean
  themeMode: ThemeMode
  
  // Actions
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  setThemeMode: (mode: ThemeMode) => void
  toggleThemeMode: () => void
}

const useSystemStore = create<SystemStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      collapsed: false,
      themeMode: 'light',

      // 设置侧边栏收起状态
      setCollapsed: (collapsed: boolean) => {
        set({ collapsed })
      },

      // 切换侧边栏收起状态
      toggleCollapsed: () => {
        set({ collapsed: !get().collapsed })
      },

      // 设置主题模式
      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode })
        document.documentElement.setAttribute('data-theme', mode)
      },

      // 切换主题模式
      toggleThemeMode: () => {
        const newMode = get().themeMode === 'light' ? 'dark' : 'light'
        set({ themeMode: newMode })
        document.documentElement.setAttribute('data-theme', newMode)
      },
    }),
    { name: 'SystemStore' }
  )
)

export default useSystemStore
