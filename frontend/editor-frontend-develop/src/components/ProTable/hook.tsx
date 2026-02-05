import type {
  AntdTableOptions,
  AntdTableResult,
  Data,
  Params,
  Service,
} from 'ahooks/lib/useAntdTable/types'
import type { ColumnType } from 'antd/lib/table'

import { omit } from '@renzp/utils'
import { useAntdTable, useCreation } from 'ahooks'
import { Checkbox, Divider, Space, TablePaginationConfig, Tooltip } from 'antd'
import React, { useRef } from 'react'

import { useButtonAuth, useButtonDealAuth } from '@/stores'
import { BUTTON_KEY, DEFAULT_PAGE_SIZE } from '@/utils/constants'
import { flattenDeepByKey, isUndef } from '@/utils/tools'
import { TableRowSelection } from 'antd/es/table/interface'
import ProTableTooltipColum from './ProTableTooltipColum'

/**
 * 序号列配置hooks
 * @param orderNumberColumnProps 序号列配置
 * @returns 返回序号列配置
 */
export const useOrderNumberColumn = (orderNumberColumnProps?: ColumnType<any>) => {
  return {
    hidden: false,
    key: 'table_row_index',
    render: (_t: unknown, _r: unknown, index: number) => index + 1,
    title: '序号',
    width: 65,
    ...(orderNumberColumnProps ?? {}),
  }
}
export const useTooltipColumn = (columnProps?: Omit<ColumnType<any>, 'render'>) => {
  return {
    ...(columnProps ?? {}),
    render(text: string) {
      return (
        <ProTableTooltipColum style={{ width: columnProps?.width }} ellipsis={{ tooltip: text }}>
          {text}
        </ProTableTooltipColum>
      )
    },
  }
}
export const useTooltipRowsColumn = (columnProps: Omit<ColumnType<any>, 'render'>, rowNum = 3) => {
  return {
    ...(columnProps ?? {}),
    render(textArray: Array<string>) {
      const text = textArray?.join(',')
      return (
        <Tooltip title={text}>
          {textArray?.map((text, index) => {
            if (index < rowNum) {
              return (
                <div key={`${text}${index}`} style={{ lineHeight: '20px' }}>
                  {text}
                </div>
              )
            }
            if (textArray.length > rowNum && index === textArray.length - 1) {
              return (
                <div style={{ lineHeight: '20px' }} key={`${text}${index}`}>
                  ...
                </div>
              )
            }
          })}
        </Tooltip>
      )
    },
  }
}
export const useRowSelection = (
  hasCheckColumn: boolean,
  rowSelectKeys: any[],
  onChange: (keys: any[]) => void,
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
        onChange: (keys: any) =>
          onChange(keys.filter((key: any) => !disabledIds.current.includes(key))),
        fixed: 'left',
        renderCell(_: unknown, record: any) {
          const disabled = (isDealAuthCheck && !hasDealAuth(record)) || disabledFn?.(record)
          if (disabled && record?.id && !disabledIds.current.includes(record.id)) {
            disabledIds.current?.push(record.id)
          }
          return (
            <Checkbox
              disabled={disabled}
              value={record.id}
              onChange={e =>
                onChange(
                  e.target.checked
                    ? [...rowSelectKeys, e.target.value]
                    : rowSelectKeys?.filter(key => key !== e.target.value),
                )
              }
              checked={rowSelectKeys.includes(record.id)}
            />
          )
        },
      } as TableRowSelection<any>)
    : undefined
}
/**
 * 分页hooks
 * @param pagination 分页配置
 * @returns 返回分页配置
 */
export const useTablePagination = (pagination?: false | TablePaginationConfig) => {
  const defaultPagination = {
    pageSize: (pagination as TablePaginationConfig)?.pageSize ?? DEFAULT_PAGE_SIZE,
    showQuickJumper: true,
    showSizeChanger: true,
    showTotal: (total: number) =>
      `共 ${total} 条记录  第 ${(pagination as TablePaginationConfig)?.current ?? 1} / ${Math.ceil(
        total / ((pagination as TablePaginationConfig)?.pageSize ?? DEFAULT_PAGE_SIZE),
      )} 页`,
  }

  let tablePagination = pagination === false ? false : pagination
  if (tablePagination !== false) {
    tablePagination = isUndef(tablePagination)
      ? defaultPagination
      : {
          ...defaultPagination,
          ...tablePagination,
        }
  }

  return tablePagination
}

export interface MergeRowColumn<T = any> extends ColumnType<T> {
  children?: Array<MergeRowColumn<T>>
  mergeRowKey?: string
}
/**
 * 合并行hooks
 * @param columns 列配置
 * @param dataSource 数据源
 * @returns 返回一个数组[合并行的列配置,合并行的数据源]
 */
export const useMergeRow = (columns: MergeRowColumn[], dataSource: any[]) => {
  const mergeRowKey = useCreation(() => {
    if (columns) {
      const flattenList = flattenDeepByKey(columns, 'children')
      return flattenList?.find(item => item?.mergeRowKey)?.mergeRowKey
    }
  }, [columns])

  const mergeColumns = useCreation(() => {
    return columns.map(item => {
      if (item?.children) {
        item.children = item.children.map((child: MergeRowColumn) => {
          return {
            onCell: child?.mergeRowKey ? ({ rowSpan }: any) => ({ rowSpan }) : undefined,
            ...child,
          }
        })
      }

      return {
        onCell: item?.mergeRowKey ? ({ rowSpan }: any) => ({ rowSpan }) : undefined,
        ...item,
      }
    })
  }, [columns])

  const mergeDataSource = useCreation(() => {
    // 获取合并行参照的列的所有值
    const mergeRowKeyValues = dataSource?.map(item => item[mergeRowKey as string])
    // 获取合并行的统计信息
    const mergeRowRecords: any = omit(
      // 统计开始和需要合并的行数
      mergeRowKeyValues?.reduce((prev, curr, index) => {
        const keys = Object.keys(prev)
        if (keys?.includes(curr?.toString())) {
          if (mergeRowKeyValues[index - 1] === curr) {
            prev[curr].count += 1
          }
        } else {
          prev[curr] = {
            count: 1,
            start: index,
          }
        }
        return prev
      }, {}),
      // 过滤掉不重复的统计
      item => item.count <= 1,
    )
    const mergeRowRecordKeys = Object.keys(mergeRowRecords)

    return dataSource?.map((item, index) => {
      const value = item[mergeRowKey as string]
      if (mergeRowRecordKeys.includes(value?.toString())) {
        const { count, start } = mergeRowRecords[value]
        item.rowSpan = start === index ? count : 0
      }

      return item
    })
  }, [dataSource, mergeRowKey])

  return [mergeColumns, mergeDataSource]
}

export interface UseProTableOptions<T extends Data, P extends Params>
  extends AntdTableOptions<T, P> {
  // 排序是否请求数据
  isSortFetch?: boolean
}

export type UseProTable = <TData extends Data, TParams extends Params>(
  service: Service<TData, TParams>,
  options?: UseProTableOptions<TData, TParams>,
) => AntdTableResult<TData, TParams>
/**
 * ahooks的useAntdTable二次封装
 * @param service 请求函数
 * @param options 配置项
 * @returns 返回表格配置项
 */
export const useProTable: UseProTable = (service, options) => {
  const { isSortFetch, ...useAntdTableOptions } = options ?? {}
  const tableOptions = useAntdTable(service, {
    defaultPageSize: DEFAULT_PAGE_SIZE,
    ...useAntdTableOptions,
    defaultType: 'advance',
  })
  if ((tableOptions?.data as any)?.pageNo) {
    tableOptions.pagination.current = (tableOptions?.data as any)?.pageNo
  }

  if (!isSortFetch) {
    // 处理前端排序，禁止请求数据
    const onTableChange = tableOptions.tableProps.onChange
    const onChange = (
      pagination: unknown,
      filter: unknown,
      sorter: unknown,
      { action }: { action: string },
    ) => {
      if (action !== 'sort') {
        onTableChange(pagination, filter, sorter)
      }
    }
    tableOptions.tableProps.onChange = onChange as any
  }

  return tableOptions
}

/**
 * 自动将表格操作列添加分割线
 * @returns 返回处理后的数据
 */
export const useAutoDividerByTableAction = () => {
  const [hasAuth] = useButtonAuth()

  const buttonDivider = (
    buttons: {
      content: React.ReactNode
      filter?: () => boolean
      key?: BUTTON_KEY | string
    }[],
  ) => {
    const renderButtons = buttons
      .filter(item => isUndef(item.key) || hasAuth(item.key as BUTTON_KEY))
      .filter(item => item?.filter?.() ?? true)

    return (
      <Space size={0} split={<Divider type="vertical" />}>
        {renderButtons.map((item, index) => (
          <span key={`${item.key ?? `${item.content?.toString()}_${index}`}`}>{item.content}</span>
        ))}
      </Space>
    )
  }
  return buttonDivider
}
