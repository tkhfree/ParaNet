import React from 'react'
import ReactDOM from 'react-dom/client'
import '@ant-design/v5-patch-for-react-19'
import App from '@/App'
import AntdConfigProvider from '@/components/common/AntdConfigProvider'
import '@/styles/global.less'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <React.StrictMode>
    <AntdConfigProvider>
      <App />
    </AntdConfigProvider>
  </React.StrictMode>
)
