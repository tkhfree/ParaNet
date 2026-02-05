import {
  WorkflowByCooperativeListParams,
  fetchWorkflowByCooperativeList,
} from '@/api/v1/sys/workflow'
import { ProSelect } from '@/components'
import { ProSelectProps } from '@/components/ProSelect'
import { WorkflowByCooperativeListModel } from '@/model/v1/sys/workflow'
import { useRequest } from 'ahooks'
import React, { useEffect, useState } from 'react'

type UnitSelectProps = ProSelectProps & WorkflowByCooperativeListParams
const UnitSelect = (props: UnitSelectProps) => {
  const { type, name, serviceArea, ...rest } = props
  const [options, setOptions] = useState<WorkflowByCooperativeListModel[]>([])
  const { loading, run } = useRequest(fetchWorkflowByCooperativeList, {
    manual: true,
    onSuccess: res => {
      setOptions(res.data)
    },
  })
  useEffect(() => {
    if (type && serviceArea) {
      setOptions([])
      run({ type, name, serviceArea })
    }
  }, [run, type, name, serviceArea])
  return (
    <ProSelect
      options={options}
      fieldNames={{ label: 'name', value: 'code' }}
      loading={loading}
      {...rest}
    />
  )
}

export default UnitSelect
