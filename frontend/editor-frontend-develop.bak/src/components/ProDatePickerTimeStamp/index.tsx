import React, { useMemo } from 'react'

import { isArray } from '@renzp/utils'
import dayjs, { Dayjs } from 'dayjs'
import ProDatePicker, { ProDatePickerProps } from '../ProDatePicker'

export interface ProDatePickerTimeStampProps
  extends Omit<ProDatePickerProps, 'value' | 'onChange'> {
  value?: number | number[]
  onChange?: (v: number | number[], dateString: string | string[]) => void
}

const ProDatePickerTimeStamp = (props: ProDatePickerTimeStampProps) => {
  const { value, ...restProps } = props ?? {}

  const timeStampValue = useMemo(() => {
    if (value) {
      return isArray(value) ? value.map(dayjs) : dayjs(value)
    }
    return undefined
  }, [value])

  const onChange = (date: Dayjs | Dayjs[], dateString: string | string[]) => {
    let value: number | number[] = date.valueOf() as number
    if (isArray(value)) {
      value = value.map(v => v.valueOf())
    }
    props?.onChange?.(value, dateString)
  }

  return <ProDatePicker {...restProps} value={timeStampValue as any} onChange={onChange} />
}

export default ProDatePickerTimeStamp
