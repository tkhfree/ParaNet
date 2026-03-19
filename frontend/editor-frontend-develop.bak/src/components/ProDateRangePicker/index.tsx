import { DatePicker } from 'antd'
import { RangePickerProps } from 'antd/lib/date-picker'
import dayjs, { Dayjs } from 'dayjs'
import React from 'react'

export enum DATA_RANGE_TYPE {
  MONTH = '本月',
  SEVEN_DAY = '近7天',
  THIRTY_DAY = '近30天',
  TODAY = '今天',
  WEEK = '本周',
}

export const createDateRanges = () => {
  return (showTime?: boolean) => {
    const end = showTime ? dayjs() : dayjs().endOf('day')

    return {
      [DATA_RANGE_TYPE.MONTH]: [dayjs().startOf('month'), end],
      [DATA_RANGE_TYPE.SEVEN_DAY]: [dayjs().add(-6, 'd').startOf('d'), end],
      [DATA_RANGE_TYPE.THIRTY_DAY]: [dayjs().add(-29, 'd').startOf('d'), end],
      [DATA_RANGE_TYPE.TODAY]: [dayjs().startOf('d'), end],
      [DATA_RANGE_TYPE.WEEK]: [dayjs().startOf('week'), end],
    }
  }
}

export const proDateRangePickerDefaultRanges = createDateRanges()
const ProDateRangePicker = (props: RangePickerProps) => {
  const ranges: any = createDateRanges()((props as any)?.showTime)
  const presets = Object.keys(ranges).map(key => ({
    label: key,
    value: ranges[key],
  }))
  const onChange = (values: any, formatString: [string, string]) => {
    if (!(props as any)?.showTime && values?.length) {
      values[1] = values[1].endOf('day')
    }
    props?.onChange?.(values, formatString)
  }
  return <DatePicker.RangePicker presets={presets} {...props} onChange={onChange} />
}

export const getRangesDayjsValueOf = (values: [Dayjs, Dayjs], showTime = false) => {
  if (values?.length) {
    const [start, end] = values
    const startTimeStamp = showTime ? start.valueOf() : start.startOf('day').valueOf()
    return [startTimeStamp, end.valueOf()]
  }

  return []
}

export default ProDateRangePicker
