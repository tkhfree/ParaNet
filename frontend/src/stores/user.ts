import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { UserInfo, LoginRequest } from '@/model/user'
import { authApi } from '@/api/auth'

const TOKEN_KEY = 'paranet_token'
const USER_INFO_KEY = 'paranet_user'

export interface UserStore {
  // 状态
  token: string | null
  userInfo: UserInfo | null
  loading: boolean

  // Actions
  initUser: () => void
  login: (params: LoginRequest) => Promise<boolean>
  logout: () => void
  setUserInfo: (user: UserInfo) => void
  clearUser: () => void
}

const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        // 初始状态
        token: null,
        userInfo: null,
        loading: true,

        // 初始化用户信息
        initUser: () => {
          const token = localStorage.getItem(TOKEN_KEY)
          const userInfoStr = localStorage.getItem(USER_INFO_KEY)
          
          if (token && userInfoStr) {
            try {
              const userInfo = JSON.parse(userInfoStr) as UserInfo
              set({ token, userInfo, loading: false })
            } catch {
              set({ token: null, userInfo: null, loading: false })
            }
          } else {
            // 开发模式：自动使用模拟用户登录
            if (import.meta.env.DEV) {
              const mockUser: UserInfo = {
                id: 'dev-user-1',
                username: 'admin',
                email: 'admin@paranet.dev',
                role: 'admin',
                permissions: ['*'],
                createdAt: new Date().toISOString(),
              }
              const mockToken = 'dev-mock-token-' + Date.now()
              
              localStorage.setItem(TOKEN_KEY, mockToken)
              localStorage.setItem(USER_INFO_KEY, JSON.stringify(mockUser))
              
              set({ token: mockToken, userInfo: mockUser, loading: false })
            } else {
              set({ loading: false })
            }
          }
        },

        // 登录
        login: async (params: LoginRequest) => {
          try {
            const response = await authApi.login(params)
            const { token, user } = response.data
            
            localStorage.setItem(TOKEN_KEY, token)
            localStorage.setItem(USER_INFO_KEY, JSON.stringify(user))
            
            set({ token, userInfo: user })
            return true
          } catch (error) {
            console.error('Login failed:', error)
            return false
          }
        },

        // 登出
        logout: () => {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_INFO_KEY)
          set({ token: null, userInfo: null })
        },

        // 设置用户信息
        setUserInfo: (user: UserInfo) => {
          localStorage.setItem(USER_INFO_KEY, JSON.stringify(user))
          set({ userInfo: user })
        },

        // 清除用户信息
        clearUser: () => {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_INFO_KEY)
          set({ token: null, userInfo: null })
        },
      }),
      {
        name: 'paranet-user-storage',
        partialize: (state) => ({ token: state.token }),
      }
    ),
    { name: 'UserStore' }
  )
)

export default useUserStore
