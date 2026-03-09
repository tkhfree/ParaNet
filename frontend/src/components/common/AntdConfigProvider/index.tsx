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
          // 主色 - 更现代的蓝色
          colorPrimary: '#1677ff',
          colorPrimaryHover: '#4096ff',
          colorPrimaryActive: '#0958d9',
          colorPrimaryBg: '#e6f4ff',
          colorPrimaryBgHover: '#bae0ff',

          // 成功/警告/错误/信息色
          colorSuccess: '#52c41a',
          colorSuccessBg: '#f6ffed',
          colorWarning: '#faad14',
          colorWarningBg: '#fffbe6',
          colorError: '#ff4d4f',
          colorErrorBg: '#fff2f0',
          colorInfo: '#1677ff',
          colorInfoBg: '#e6f4ff',

          // 圆角
          borderRadius: 8,

          // 字体
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",

          // 阴影
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',

          // 控件高度
          controlHeight: 36,
          controlHeightLG: 44,
          controlHeightSM: 28,
        },
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        components: {
          Layout: {
            headerBg: '#001529',
            headerHeight: 56,
            siderBg: '#001529',
            triggerBg: '#002140',
            bodyBg: '#f5f5f5',
            headerPadding: '0 24px',
          },
          Menu: {
            darkItemBg: '#001529',
            darkSubMenuItemBg: '#000c17',
            darkItemSelectedBg: '#1677ff',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
            itemBorderRadius: 8,
            itemMarginInline: 8,
            itemMarginBlock: 4,
          },
          Card: {
            borderRadiusLG: 12,
            paddingLG: 24,
          },
          Button: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Input: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Select: {
            borderRadius: 8,
          },
          Modal: {
            borderRadiusLG: 12,
          },
          Table: {
            borderRadius: 8,
            headerBg: 'var(--color-bg-spotlight)',
          },
          Tooltip: {
            borderRadius: 8,
          },
          Popover: {
            borderRadiusLG: 12,
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  )
}

export default AntdConfigProvider
