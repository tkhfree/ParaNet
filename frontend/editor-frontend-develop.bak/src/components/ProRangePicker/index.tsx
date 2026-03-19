import { DatePicker } from 'antd'
import { RangePickerProps } from 'antd/es/date-picker'
import React from 'react'

const { RangePicker } = DatePicker

type ProRangePickerProps = RangePickerProps

const ProRangePicker = (props: ProRangePickerProps) => {
  return <RangePicker {...props} style={{ width: '100%' }} />
}

export default ProRangePicker
