import { Popover, type PopoverProps } from 'antd'
import React from 'react'

import { getModalNode, getTableNode } from '@/components/AntdConfigProvider'

const ProPopover = (props: PopoverProps) => {
  return (
    <Popover
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

export default ProPopover
