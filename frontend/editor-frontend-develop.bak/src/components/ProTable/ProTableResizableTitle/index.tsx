import type { ColumnType } from 'antd/lib/table'

import { deepClone } from '@renzp/utils'
import { useCreation, useMemoizedFn } from 'ahooks'
import React, { useEffect, useRef, useState } from 'react'
import { Resizable } from 'react-resizable'

import './index.less'

const ProTableResizableTitle = (props: any) => {
  const { onResize, width, ...restProps } = props
  const [resizeActive, setResizeActive] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const resizeRef = useRef({
    end: 0,
    start: 0,
  })

  const ResizeHandle = useCreation(() => {
    return (
      <span
        className={`react-resize-handle ${resizeActive ? 'react-resize-handle--active' : ''}`}
        onClick={e => e.stopPropagation()}
        style={{
          transform: `translateX(${offsetX}px)`,
        }}
      />
    )
  }, [resizeActive, offsetX])

  if (!onResize) {
    return <th {...restProps} />
  }

  return (
    <Resizable
      draggableOpts={{ enableUserSelectHack: true }}
      handle={ResizeHandle}
      height={0}
      onResize={(e: any) => setOffsetX(e.screenX - resizeRef.current.start)}
      onResizeStart={(e: any) => {
        setResizeActive(true)
        resizeRef.current.start = e.screenX
      }}
      onResizeStop={(e: any, data: any) => {
        resizeRef.current.end = e.screenX
        const offsetX = resizeRef.current.end - resizeRef.current.start
        setOffsetX(0)
        setResizeActive(false)
        // 是否为有效拖动，当拖动后列宽小于10时，为无效拖动不触发resize事件
        const isEffective = offsetX + data.size.width > 10
        if (isEffective) {
          onResize(offsetX)
        }
      }}
      width={width}
    >
      <th {...restProps} />
    </Resizable>
  )
}

export default ProTableResizableTitle

export interface ResizableColumn<T = any> extends ColumnType<T> {
  resizable?: boolean
}

export const useColumnResizable = (
  columns: ResizableColumn[],
  onColumnResize: (values: ResizableColumn[]) => ResizableColumn[],
) => {
  const columnsRef = useRef<ResizableColumn[]>([])

  useEffect(() => {
    columnsRef.current = columns
  }, [columns])

  const parseFloatWidth = (width?: number | string) =>
    typeof width === 'string' ? Number.parseFloat(width) : width

  const onResize = useMemoizedFn((moveX: number, index: number) => {
    if (columnsRef.current[index]) {
      columnsRef.current[index].width = columnsRef.current[index]?.width
        ? (parseFloatWidth(columnsRef.current[index].width) ?? 0) + moveX
        : undefined
    }

    onColumnResize?.(deepClone(columnsRef.current))
  })

  return columns.map((item, index) => {
    const width = parseFloatWidth(item?.width)
    const headerCell = {
      onResize: (moveX: number) => onResize(moveX, index),
      width,
    }

    const onHeaderCell = item?.resizable ? () => headerCell : undefined

    return {
      onHeaderCell,
      ...item,
      width,
    }
  })
}
