import { WorkflowCommonParams, fetchWorkflowFlowDiagram } from '@/api/v1/radio/workflow'
import { WorkflowFlowDiagramModel } from '@/model/v1/radio/workflow'
import { timeFormat } from '@/utils/tools'
import { useRequest } from 'ahooks'
import { Spin, Steps } from 'antd'
import React, { useState } from 'react'
import InfoBlock from '../InfoBlock'
import FlowTable from './FlowTable'
import PopoverSteps from './PopoverSteps'

export interface StepFlowChartProps extends Omit<WorkflowCommonParams, 'bizType'> {
  bizType?: STEP_FLOW_TYPE
  title?: string
  className?: string
  style?: React.CSSProperties
}

const StepFlowChart = (props: StepFlowChartProps) => {
  const { className = '', style, title = '主流程', ...params } = props ?? {}
  const [selectBizType, setSelectBizType] = useState<number | undefined>()
  const { data, loading } = useRequest(
    async () => {
      const { data } = await fetchWorkflowFlowDiagram(params)
      setSelectBizType(data?.find(item => item?.stageStatus === 1)?.bizType)
      return getStepFlowData(data, setSelectBizType)
    },
    {
      refreshDeps: [
        params?.baseStationId,
        params?.workOrderNo,
        params?.bizType,
        params?.bizSubType,
        params?.businessId,
      ],
    },
  )

  return (
    <div className={`step-flow-chart ${className}`} style={style}>
      <Spin spinning={loading}>
        <InfoBlock className="g-info-block-card" title={title}>
          <div className="step-flow-chart__steps">
            <Steps items={data} />
          </div>
        </InfoBlock>
        <FlowTable {...params} bizType={selectBizType} />
      </Spin>
    </div>
  )
}

export enum STEP_FLOW_TYPE {
  /**规建维优审核阶段 */
  AUDIT = 101,
  /**选址阶段 */
  SITE_SELECTION = 102,
  /**勘察阶段 */
  SURVEY = 103,
  /**施工阶段 */
  CONSTRUCTION = 104,
}

export const getStepFlowData = (
  data: WorkflowFlowDiagramModel[],
  onClick?: (bizType?: number) => void,
) => {
  return data?.map(item => {
    const description = getDescriptions(item?.finishTime, item?.stageStatus)

    return {
      key: item.processId,
      title: (
        <div className="step-flow-chart__step-title" onClick={() => onClick?.(item?.bizType)}>
          {item?.stageDetailList ? (
            <PopoverSteps data={item.stageDetailList}>{item.stageName}</PopoverSteps>
          ) : (
            item.stageName
          )}
        </div>
      ),
      description,
      status: getStatusText(item.stageStatus),
    }
  })
}

export const getDescriptions = (finishTime?: number, status = 0) => {
  const descriptionMap: any = {
    0: '未开始',
    1: '进行中',
  }

  const description = status === 2 ? timeFormat(finishTime) : descriptionMap[status]
  return description
}

export const getStatusText = (status?: number) => {
  const statusMap: any = {
    0: 'wait',
    1: 'process',
    2: 'finish',
  }

  return status ? statusMap[status] : 'wait'
}

export default StepFlowChart
