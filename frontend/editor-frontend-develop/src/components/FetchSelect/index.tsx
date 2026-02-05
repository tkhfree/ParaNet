import { useMemoizedFn, useRequest, useUpdateEffect } from 'ahooks'
import { SelectProps } from 'antd'
import { DefaultOptionType } from 'antd/es/select'
import React, { useEffect, useState } from 'react'

import ProSelect from '../ProSelect'

export interface DictionarySelectProps extends SelectProps {
  /** 是否自动请求 */
  autoRequest?: boolean
  fetchFunc: (v?: any) => void
  filterItem?: string[]
  isAttribute?: boolean
  isChangeUser?: boolean
  isScheduleTime?: boolean
  onOptChange?: (opt: DefaultOptionType[] | undefined) => void
  otherParams?: any
  parentCode?: any
  parentKey?: string
}

const Index = (props: DictionarySelectProps) => {
  const {
    autoRequest = true,
    fetchFunc,
    filterItem = [],
    isAttribute,
    isChangeUser,
    isScheduleTime,
    onOptChange,
    otherParams = {},
    parentCode,
    parentKey,
    ...selectProps
  } = props

  const [options, setOptions] = useState<any>([])

  const getList = useMemoizedFn(async () =>
    fetchFunc(
      parentCode && parentKey ? { ...otherParams, [parentKey]: parentCode } : { ...otherParams },
    ),
  )

  const { data, run }: any = useRequest(getList, {
    manual: true,
    staleTime: -1,
  })

  useEffect(() => {
    autoRequest && run?.()
  }, [autoRequest, run])

  useEffect(() => {
    if (parentCode) {
      run?.()
    } else {
      setOptions([])
    }
  }, [parentCode, run])

  useUpdateEffect(() => {
    onOptChange?.(data?.data ?? [])
    setOptions(data?.data ?? [])
  }, [data])

  return (
    <ProSelect
      fieldNames={{
        label: 'name',
        value: 'code',
      }}
      options={options}
      {...selectProps}
    />
  )
}

export default Index
