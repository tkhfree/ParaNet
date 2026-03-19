import type { TableProps } from 'antd'

import { Table } from 'antd'
import React from 'react'

import { classNames } from '@/utils/tools'
import { useTablePagination } from '../hook'

import './index.less'

export interface ProTableContentProps extends TableProps<any> {
  contentClassName?: string
  contentRef?: React.RefObject<HTMLDivElement>
  contentStyle?: React.CSSProperties
  tableRef?: React.Ref<any>
  tools?: React.ReactNode
}

const ProTableContent = ({
  contentClassName,
  contentRef,
  contentStyle,
  tableRef,
  tools,
  ...tableProps
}: ProTableContentProps) => {
  const { bordered = true } = tableProps
  const pagination = useTablePagination(tableProps.pagination)

  return (
    <div
      className={classNames(['pro-table-content', contentClassName])}
      ref={contentRef}
      style={contentStyle}
    >
      {tools ? <div className="pro-table-content__tools">{tools}</div> : null}
      <Table ref={tableRef} {...tableProps} bordered={bordered} pagination={pagination} />
    </div>
  )
}

export default ProTableContent
