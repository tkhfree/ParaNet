import { Popover, PopoverProps, Steps } from 'antd'
import React from 'react'
import './index.less'
import { WorkflowFlowDiagramModel, WorkflowFlowDiagramNodeModel } from '@/model/v1/radio/workflow'
import { getDescriptions, getStatusText } from '.'

export interface PopoverStepsProps {
  data?: WorkflowFlowDiagramModel['stageDetailList']
  open?: boolean
  children?: PopoverProps['children']
}

const PopoverSteps = (props: PopoverStepsProps) => {
  const content = (
    <div className="step-flow-chart__popover-content">
      {props?.data?.map((item, index) => {
        const items = getStepFlowData(item?.nodeList ?? [])
        return (
          <div className="popover-step-item" key={`${item.name}_${index}`}>
            <div className="popover-step-item__title">{item.name}</div>
            <Steps labelPlacement="vertical" size="small" items={items} />
          </div>
        )
      })}
    </div>
  )
  return (
    <Popover
      classNames={{ root: 'step-flow-chart__popover-steps' }}
      placement="bottom"
      content={content}
      open={props?.open}
    >
      <div className="popover-steps-text">{props?.children}</div>
    </Popover>
  )
}

export const getStepFlowData = (data: WorkflowFlowDiagramNodeModel[]) => {
  return data?.map(item => {
    const description = getDescriptions(item?.finishTime, item?.nodeStatus)

    return {
      key: item.nodeId,
      title: <div className="step-flow-chart__step-title">{item?.nodeName}</div>,
      description,
      status: getStatusText(item.nodeStatus),
    }
  })
}

export default PopoverSteps
