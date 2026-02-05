import type { SelectProps } from 'antd'

import { Select } from 'antd'
import React, { useMemo } from 'react'

import { DEFAULT_SELECT_PROPS } from '@/utils/constants'

import './index.less'
import { isArray } from '@renzp/utils'

export type ProSelectProps = SelectProps

const ProSelect = (props: ProSelectProps) => {
  const { value, options, fieldNames } = props ?? {}
  const valueName = fieldNames?.value ?? 'value'
  const v = useMemo(() => {
    if (isArray(value)) {
      return options?.filter(item => value.includes(item[valueName]))?.map(item => item[valueName])
    }
    return options?.find(item => item[valueName] === value)?.[valueName]
  }, [value, options, valueName])

  return (
    <Select
      {...DEFAULT_SELECT_PROPS}
      maxTagCount="responsive"
      maxTagPlaceholder={omittedValues => {
        const tag = omittedValues.length > 0 ? omittedValues[0]?.label : ''

        return (
          <div className="pro-select__max-tag">
            <div className="pro-select__max-tag-text">{tag}</div>
            <div>+ {omittedValues.length}</div>
          </div>
        )
      }}
      {...props}
      value={v}
      className={`pro-select ${props.className ?? ''}`}
    />
  )
}

export default ProSelect
