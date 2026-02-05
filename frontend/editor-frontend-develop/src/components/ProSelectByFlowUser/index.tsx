import { WorkflowByUserListParams, fetchWorkflowByUserList } from '@/api/v1/sys/workflow'
import { ProSelect } from '@/components'
import { ProSelectProps } from '@/components/ProSelect'
import { WorkflowByUserListModel } from '@/model/v1/sys/workflow'
import { useRequest } from 'ahooks'
import React, { useEffect, useState } from 'react'

type PersonnelSelectProps = ProSelectProps & WorkflowByUserListParams
const PersonnelSelect = (props: PersonnelSelectProps) => {
  const { roleId, cooperativeId, name, serviceArea, ...rest } = props
  const [options, setOptions] = useState<WorkflowByUserListModel[]>([])
  const { loading, run } = useRequest(fetchWorkflowByUserList, {
    manual: true,
    onSuccess: res => {
      setOptions(res.data)
    },
  })
  useEffect(() => {
    if (roleId && serviceArea) {
      setOptions([])
      run({ roleId, cooperativeId, name, serviceArea })
    }
  }, [roleId, cooperativeId, name, serviceArea, run])
  return (
    <ProSelect
      options={options}
      fieldNames={{ label: 'name', value: 'id' }}
      loading={loading}
      {...rest}
    />
  )
}

export default PersonnelSelect
