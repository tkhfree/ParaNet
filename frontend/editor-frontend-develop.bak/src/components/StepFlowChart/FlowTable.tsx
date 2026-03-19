import { timeFormat } from '@/utils/tools'
import React, { useMemo, useState } from 'react'
import InfoBlock from '../InfoBlock'
import { useOrderNumberColumn, useTooltipColumn } from '../ProTable'
import ProTableContent, { ProTableContentProps } from '../ProTable/ProTableContent'
import './index.less'
import { WorkflowCommonParams, fetchWorkflowApprovalList } from '@/api/v1/radio/workflow'
import { useRequest } from 'ahooks'
import { Radio } from 'antd'

const FlowTable = (props: WorkflowCommonParams) => {
  const { data, loading } = useRequest(
    async () => {
      const { data } = await fetchWorkflowApprovalList(props)
      return data
    },
    { refreshDeps: [props.bizType] },
  )
  // 如果第一个数据的name有值，则表示有tab
  const hasTabs = useMemo(() => !!data?.[0]?.name, [data])
  const [selectIndex, setSelectIndex] = useState<number>(0)
  const onChange = (e: any) => {
    setSelectIndex(e.target.value)
  }
  const dataSource = useMemo(() => data?.[selectIndex]?.approvalRecords ?? [], [data, selectIndex])

  const columns: ProTableContentProps['columns'] = [
    useOrderNumberColumn(),
    {
      dataIndex: 'approvalProcessName',
      title: '处理步骤',
    },
    {
      dataIndex: 'approverName',
      title: '处理人',
    },
    {
      dataIndex: 'approverDepartName',
      title: '处理部门',
    },
    {
      dataIndex: 'approverReceiveTime',
      title: '接收时间',
      render: (v: number) => timeFormat(v),
    },
    {
      dataIndex: 'approvalTypeName',
      title: '处理操作',
    },
    {
      dataIndex: 'approverFinishTime',
      title: '处理时间',
      render: (v: number) => timeFormat(v),
    },
    useTooltipColumn({
      dataIndex: 'approverOpinion',
      title: '备注/意见',
    }),
  ]
  return (
    <InfoBlock className="step-flow-chart__flow-table g-info-block-card" title="过程信息">
      {hasTabs ? (
        <Radio.Group value={selectIndex} onChange={onChange}>
          {data?.map((item, index) => {
            return (
              <Radio.Button key={`${item.name}_${index}`} value={index}>
                {item.name}
              </Radio.Button>
            )
          })}
        </Radio.Group>
      ) : null}
      <ProTableContent
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </InfoBlock>
  )
}

export default FlowTable
