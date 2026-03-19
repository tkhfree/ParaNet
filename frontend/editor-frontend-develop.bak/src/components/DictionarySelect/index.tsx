import { fetchDictList } from '@/api/v1/sys/dict'
import { ProSelect } from '@/components'
import { DICTIONARY_TYPE } from '@/utils/constants'
import { isArray, isNumber } from '@renzp/utils'
import { useMemoizedFn, useRequest, useUpdateEffect } from 'ahooks'
import type { SelectProps } from 'antd'
import { DefaultOptionType } from 'antd/lib/select'
import React, { useEffect, useMemo } from 'react'

export interface DictionarySelectProps extends SelectProps {
  // 字典类型
  dictType: DICTIONARY_TYPE
  onOptionsChange?: (opt: DefaultOptionType[] | undefined) => void
}

const DictionarySelect = (props: DictionarySelectProps) => {
  const { dictType, value, onOptionsChange, ...selectProps } = props
  const [options, setOptions] = React.useState<DefaultOptionType[] | undefined>()

  // 兼容字典接口code是字符串，但后端在表单中返回数据为number
  const valueString = useMemo(() => {
    if (isNumber(value)) {
      return value.toString()
    }

    if (isArray(value)) {
      return value.map(v => (isNumber(v) ? v.toString() : v))
    }

    return value
  }, [value])

  // 获取字典数据
  const getDictionaryList = async (dictType: DICTIONARY_TYPE) => {
    const { data } = await fetchDictList(dictType)
    const list = data?.map(item => ({ value: item.code, label: item.name }))
    onOptionsChange?.(list)
    return list
  }

  const getList = useMemoizedFn(async () => getDictionaryList(dictType as any))

  const { data, loading, run } = useRequest(getList, {
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

  return <ProSelect options={options} loading={loading} {...selectProps} value={valueString} />
}

export default DictionarySelect
