import { useEffect, useState } from 'react'
import { create } from 'zustand'

import { fetchSystemConfig } from '@/api/v1/system'
import favicon from '@/assets/img/favicon.png'
import logoDev from '@/assets/img/logo-dev.png'
import logoProd from '@/assets/img/logo-prod.png'
import { SystemConfigModel } from '@/model/system'
import { SYSTEM_ENV } from '@/utils/constants'

export interface SystemStore {
  configs?: SystemConfigModel
  refresh: () => Promise<void>
}

const systemStore = create<SystemStore>()(set => ({
  configs: undefined,
  refresh: async () => {
    try {
      const { data } = await fetchSystemConfig()
      set({ configs: data })
    } catch {
      set({ configs: { systemEnv: SYSTEM_ENV.PRODUCTION } })
    }
  },
}))
// 根据环境自动设置网站icon
export const useAutoSetDocumentIconByEnv = () => {
  const [configs, refreshConfigs] = systemStore(state => [state.configs, state.refresh])
  useEffect(() => {
    refreshConfigs()
  }, [refreshConfigs])
  useEffect(() => {
    if (configs) {
      // 如果存在不在枚举值中的value则采用生产环境
      const env = Object.values(SYSTEM_ENV)?.includes(configs?.systemEnv)
        ? configs.systemEnv
        : SYSTEM_ENV.PRODUCTION

      const icon = document.querySelector("link[rel*='icon']") as any
      // 只有生产环境才使用正式的图标
      if (env === SYSTEM_ENV.PRODUCTION) {
        document.title = names[env] ?? '集成开发系统'
        if (icon) {
          icon.href = favicon
        }
      }
    }
  }, [configs])
}

const logos: Record<string, string> = {
  [SYSTEM_ENV.PRODUCTION]: logoProd,
}

const names: Record<string, string> = {
  [SYSTEM_ENV.PRODUCTION]: '集成开发系统',
}

// 根据环境获取网站logo
export const useGetSiteConfigByEnv = () => {
  const [config, setConfig] = useState<{
    captchaSwitch?: boolean
    logo: string
    name: string
  }>()
  const [configs] = systemStore(state => [state.configs, state.refresh])
  useEffect(() => {
    if (configs) {
      // 如果存在不在枚举值中的value则采用生产环境
      const env = Object.values(SYSTEM_ENV)?.includes(configs?.systemEnv)
        ? configs.systemEnv
        : SYSTEM_ENV.PRODUCTION

      setConfig({
        captchaSwitch: configs?.captchaSwitch,
        logo: logos[env] ?? logoDev,
        name: names[env] ?? '集成开发系统',
      })
    }
  }, [configs])

  return config
}

export default systemStore
