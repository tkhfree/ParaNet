import { DatePicker } from 'antd'
import { DatePickerProps } from 'antd/lib'
import React from 'react'

import style from './index.module.less'

export type ProDatePickerProps = DatePickerProps

const ProDatePicker = (props: ProDatePickerProps) => {
  return <DatePicker {...props} className={`${style.proDatePicker} ${props.className}`} />
}

export default ProDatePicker
