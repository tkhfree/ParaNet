import { useButtonDealAuth } from '@/stores'
import { Checkbox } from 'antd'
import { TableRowSelection } from 'antd/es/table/interface'
import React, { useRef } from 'react'

export const useRowSelection = (
  hasCheckColumn: boolean,
  rowSelectKeys: any[],
  rowSelectRows: any[],
  onChange: (keys: any[], rows: any) => void,
  isDealAuthCheck = true,
  disabledFn?: (record: any) => boolean,
) => {
  const disabledIds = useRef<any[]>([])
  const hasDealAuth = useButtonDealAuth()

  return hasCheckColumn
    ? ({
        type: 'checkbox',
        preserveSelectedRowKeys: true,
        selectedRowKeys: rowSelectKeys,
        onChange: (keys: any, rows) => {
          onChange(
            keys.filter((key: any) => !disabledIds.current.includes(key)),
            rows,
          )
        },
        fixed: 'left',
        renderCell(_: unknown, record: any) {
          const disabled = (isDealAuthCheck && !hasDealAuth(record)) || disabledFn?.(record)
          if (
            disabled &&
            record?.baseStationId &&
            !disabledIds.current.includes(record.baseStationId)
          ) {
            disabledIds.current?.push(record.baseStationId)
          }
          return (
            <Checkbox
              disabled={disabled}
              value={record.baseStationId}
              onChange={e => {
                onChange(
                  e.target.checked
                    ? [...rowSelectKeys, e.target.value]
                    : rowSelectKeys?.filter(baseStationId => baseStationId !== e.target.value),
                  e.target.checked
                    ? [...rowSelectRows, record]
                    : rowSelectRows?.filter(item => item.baseStationId !== e.target.value),
                )
              }}
              checked={rowSelectKeys.includes(record.baseStationId)}
            />
          )
        },
      } as TableRowSelection<any>)
    : undefined
}
