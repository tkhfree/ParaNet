import { CheckboxOptionType, Radio, RadioGroupProps } from 'antd'
import React, { useEffect, useMemo } from 'react'

import { fetchBaseDataDict } from '@/api/v1/system'
import { DICTIONARY_TYPE } from '@/utils/constants'
import { isNumber } from '@renzp/utils'
import { useMemoizedFn, useRequest, useUpdateEffect } from 'ahooks'

export interface DictionaryRadioGroupProps extends RadioGroupProps {
  dictType: DICTIONARY_TYPE
  onOptionsChange?: (options: any[]) => void
}

const DictionaryRadioGroup = (props: DictionaryRadioGroupProps) => {
  const { dictType, value, onOptionsChange, ...radioProps } = props
  const [options, setOptions] = React.useState<CheckboxOptionType[] | undefined>()

  // 兼容字典接口code是字符串，但后端在表单中返回数据为number
  const valueString = useMemo(() => {
    if (isNumber(value)) {
      return value.toString()
    }
    return value
  }, [value])

  // 获取字典数据
  const getDictionaryList = async (dictType: DICTIONARY_TYPE) => {
    const { data } = await fetchBaseDataDict({ dictType })
    const list = data?.map(item => ({ value: item.code, label: item.name }))
    onOptionsChange?.(list)
    return list
  }

  const getList = useMemoizedFn(async () => getDictionaryList(dictType as any))

  const { data, run } = useRequest(getList, {
    manual: true,
    cacheKey: dictType,
  })

  useUpdateEffect(() => {
    setOptions(data)
  }, [data])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    run()
  }, [dictType, run])

  return <Radio.Group options={options} {...radioProps} value={valueString} />
}

export default DictionaryRadioGroup
