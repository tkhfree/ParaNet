import { App, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import React from 'react'
import { useShallow } from 'zustand/shallow'

import useSystemStore from '@/stores/system'

interface AntdConfigProviderProps {
  children: React.ReactNode
}

const AntdConfigProvider: React.FC<AntdConfigProviderProps> = ({ children }) => {
  const themeMode = useSystemStore(useShallow((state) => state.themeMode))

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        components: {
          Layout: {
            headerBg: '#001529',
            siderBg: '#001529',
            triggerBg: '#002140',
          },
          Menu: {
            darkItemBg: '#001529',
            darkSubMenuItemBg: '#000c17',
            darkItemSelectedBg: '#1890ff',
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  )
}

export default AntdConfigProvider
