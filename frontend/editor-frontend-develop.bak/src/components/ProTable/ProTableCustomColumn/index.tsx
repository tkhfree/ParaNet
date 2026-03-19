import type { CheckboxChangeEvent } from 'antd/lib/checkbox'
import type { ColumnType } from 'antd/lib/table'

import { SettingOutlined } from '@ant-design/icons'
import { useCreation } from 'ahooks'
import { Button, Checkbox } from 'antd'
import React from 'react'

import { ProPopover, ProTooltip } from '@/components'

import './index.less'

export type ProTableCustomColumnOnChange = (values: Array<CustomColumn>) => void

export interface CustomColumn<T = any> extends ColumnType<T> {
  disabled?: boolean
  hidden?: boolean
}

export type ActionType = 'click' | 'contextMenu' | 'focus' | 'hover'

export interface ProTableCustomColumnProps {
  className?: string
  columns: Array<CustomColumn>
  onChange?: ProTableCustomColumnOnChange
  style?: React.CSSProperties
  trigger?: ActionType | ActionType[]
}

const ProTableCustomColumn = (props: ProTableCustomColumnProps) => {
  const { columns, onChange, trigger = 'click', ...buttonProps } = props
  // 选中的选项
  const checkedList = useCreation(
    () =>
      columns.filter(item => !item.hidden).map(item => item.dataIndex ?? item.key) as [
        boolean | number | string,
      ],
    [columns],
  )
  // 是否全选
  const checkAll = useCreation(
    () => checkedList.length === columns.length,
    [checkedList.length, columns.length],
  )
  const indeterminate = useCreation(
    () => checkedList?.length > 0 && checkedList.length < columns.length,
    [checkedList.length, columns.length],
  )

  const title = useCreation(() => {
    const onToggleCheckAll = (e: CheckboxChangeEvent) => {
      const targetColumns = columns.map(item => {
        if (!item.disabled) {
          item.hidden = !e.target.checked
        }

        return item
      })

      onChange?.(targetColumns)
    }

    return (
      <div>
        <Checkbox checked={checkAll} indeterminate={indeterminate} onChange={onToggleCheckAll}>
          <span className="pro-table-custom-column__total">
            {checkedList.length}/{columns?.length}项
          </span>
        </Checkbox>
      </div>
    )
  }, [checkAll, checkedList.length, columns, indeterminate, onChange])

  const content = useCreation(() => {
    const onToggleCheck = (checkedValue: Array<boolean | number | string>) => {
      const targetColumns = columns.map(item => {
        if (!item.disabled) {
          item.hidden = !checkedValue.includes((item.dataIndex ?? item.key) as string)
        }

        return item
      })

      onChange?.(targetColumns)
    }

    return (
      <Checkbox.Group
        className="pro-table-custom-column__list"
        onChange={onToggleCheck}
        value={checkedList}
      >
        {columns?.map(item => {
          const key = (item.dataIndex ?? item.key) as string
          const title = typeof item.title === 'string' ? item.title : (item?.title as any)?.()

          return (
            <div className="pro-table-custom-column__item" key={key}>
              <Checkbox disabled={item?.disabled} value={key}>
                {title}
              </Checkbox>
            </div>
          )
        })}
      </Checkbox.Group>
    )
  }, [checkedList, columns, onChange])

  return (
    <ProPopover
      className="pro-table-custom-column"
      content={content}
      placement="bottomLeft"
      title={title}
      trigger={trigger}
    >
      <ProTooltip title="自定义列">
        <Button ghost icon={<SettingOutlined />} {...buttonProps} />
      </ProTooltip>
    </ProPopover>
  )
}

export default ProTableCustomColumn
