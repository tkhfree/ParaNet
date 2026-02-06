import React from 'react'
import ReactDOM from 'react-dom/client'
import '@ant-design/v5-patch-for-react-19'
import App from '@/App'
import AntdConfigProvider from '@/components/common/AntdConfigProvider'
import '@/styles/global.less'

// 首屏前同步设置主题，避免闪烁
const savedTheme = typeof window !== 'undefined' && localStorage.getItem('paranet-theme')
if (savedTheme === 'dark' || savedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', savedTheme)
} else {
  document.documentElement.setAttribute('data-theme', 'light')
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <React.StrictMode>
    <AntdConfigProvider>
      <App />
    </AntdConfigProvider>
  </React.StrictMode>
)
