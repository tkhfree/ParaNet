import React from 'react'
import ReactDOM from 'react-dom/client'
import '@ant-design/v5-patch-for-react-19'
import App from '@/App'
import { AntdConfigProvider } from '@/components'
import { loader } from '@monaco-editor/react'

//这样json没法自动格式化
// import * as monaco from 'monaco-editor'
// loader.config({ monaco })

//这样可以自动格式化，但是加载也有风险
loader.config({
  paths: {
    vs: 'https://unpkg.com/monaco-editor@0.36.1/min/vs',
  },
})
import './app.less'

const root = ReactDOM.createRoot(document.querySelector('#root') as HTMLDivElement)

root.render(
  <AntdConfigProvider>
    <App />
  </AntdConfigProvider>,
)
