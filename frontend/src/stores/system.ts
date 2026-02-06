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

const THEME_STORAGE_KEY = 'paranet-theme'

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'dark' ? 'dark' : 'light'
}

const useSystemStore = create<SystemStore>()(
  devtools(
    (set, get) => ({
      // 初始状态（从 localStorage 恢复主题）
      collapsed: false,
      themeMode: getStoredTheme(),

      // 设置侧边栏收起状态
      setCollapsed: (collapsed: boolean) => {
        set({ collapsed })
      },

      // 切换侧边栏收起状态
      toggleCollapsed: () => {
        set({ collapsed: !get().collapsed })
      },

      // 设置主题模式（持久化到 localStorage）
      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode })
        document.documentElement.setAttribute('data-theme', mode)
        if (typeof window !== 'undefined') {
          localStorage.setItem(THEME_STORAGE_KEY, mode)
        }
      },

      // 切换主题模式
      toggleThemeMode: () => {
        const newMode = get().themeMode === 'light' ? 'dark' : 'light'
        get().setThemeMode(newMode)
      },
    }),
    { name: 'SystemStore' }
  )
)

export default useSystemStore
