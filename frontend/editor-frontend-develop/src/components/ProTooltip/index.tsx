import { Tooltip, type TooltipProps } from 'antd'
import React from 'react'

import { getModalNode, getTableNode } from '@/components/AntdConfigProvider'

const ProTooltip = (props: TooltipProps) => {
  return (
    <Tooltip
      getPopupContainer={node => {
        const targetNode =
          getModalNode(node?.parentNode as Element) ??
          getTableNode(node?.parentNode as Element) ??
          node?.parentNode

        return (targetNode ? targetNode : document.body) as HTMLElement
      }}
      {...props}
    />
  )
}

export default ProTooltip
