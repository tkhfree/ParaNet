import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import dayjs from 'dayjs'
import React from 'react'

import token, { componentsToken } from '@/theme'
import { isUndef } from '@/utils/tools'

import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')
export interface AntdConfigProvider {
  children: React.ReactNode
}

// Tooltip和Popover组件无法命中，需要单独在组件内处理
const popupTargetNode = ['ant-select', 'ant-picker', 'ant-dropdown-trigger']
/**
 * 获取悬浮框Table元素
 * @param targetNode 当前悬浮框父元素
 * @returns 如果找到则返回table元素，否则返回undefined
 */
export const getTableNode = (targetNode: Element) => {
  let node = targetNode
  let className = node?.className
  let tagName = node?.tagName?.toLocaleLowerCase()

  while (!isUndef(className)) {
    if (className?.includes('ant-table-tbody')) {
      break
    }
    // 找到body说明没找到，则还原成targetNode
    if (tagName === 'body') {
      node = targetNode
      break
    }
    node = node?.parentNode as Element
    className = node?.className
    tagName = node?.tagName?.toLocaleLowerCase()
  }

  return node === targetNode ? undefined : node
}
/**
 * 获取悬浮框Modal元素
 * @param targetNode 当前悬浮框父元素
 * @returns 如果找到则返回Modal元素，否则返回undefined
 */
export const getModalNode = (targetNode: Element) => {
  let node = targetNode
  let className = node?.className?.split(' ')
  let tagName = node?.tagName?.toLocaleLowerCase()

  while (!isUndef(className)) {
    if (className?.includes('ant-modal-wrap')) {
      break
    }
    // 找到body说明没找到，则还原成targetNode
    if (tagName === 'body') {
      node = targetNode
      break
    }
    node = node?.parentNode as Element
    className = node?.className?.split(' ')
    tagName = node?.tagName?.toLocaleLowerCase()
  }

  return node === targetNode ? undefined : node
}

const AntdConfigProvider = (props: AntdConfigProvider) => {
  return (
    <ConfigProvider
      // 移除按钮汉字之间的空格
      button={{
        autoInsertSpace: false,
      }}
      // 设置弹出层渲染在父节点
      getPopupContainer={node => {
        const isRenderParentNode = popupTargetNode.some(className =>
          node?.classList.value?.includes(className),
        )
        const targetNode =
          getModalNode(node?.parentNode as Element) ??
          getTableNode(node?.parentNode as Element) ??
          node?.parentNode

        return (targetNode && isRenderParentNode ? targetNode : document.body) as HTMLElement
      }}
      // 中文配置
      locale={zhCN}
      theme={{
        components: componentsToken,
        token,
      }}
    >
      <App>{props.children}</App>
    </ConfigProvider>
  )
}

export default AntdConfigProvider
