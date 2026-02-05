/**流程图信息 */
export interface WorkflowFlowDiagramModel {
  processId?: string
  bizType?: number
  /** 一级进度流程阶段名称 */
  stageName?: string
  /** 状态：未开始、进行中、已完成
NOT_STARTED(0 未开始)
IN_PROGRESS(1 进行中)
FINISHED(2 已完成) */
  stageStatus?: number
  stageStatusName?: number
  /** 完成时间 */
  finishTime?: number
  /** 节点集合 */
  stageDetailList?: Array<{
    /** 二级进度：流程图展示名称：当前只有工序流程会有值 */
    name?: string
    /** 节点集合 */
    nodeList?: WorkflowFlowDiagramNodeModel[]
  }>
}

export interface WorkflowFlowDiagramNodeModel {
  /** 节点id */
  nodeId?: string
  /** 节点名称 */
  nodeName?: string
  /** 状态：未开始、进行中、已完成
NodeStatusEnum
NOT_STARTED(0 未开始)
IN_PROGRESS(1 进行中)
FINISHED(2 已完成) */
  nodeStatus?: number
  /** 完成时间 */
  finishTime?: number
  /** 节点排序 */
  sort?: number
}
/**审批记录 */
export interface WorkflowApprovalModel {
  /** 主键id */
  id?: number
  /** 任务id */
  taskId?: string
  /** 流程实例id */
  workflowProcInstId?: string
  /** 处理环节 */
  approvalProcessName?: string
  /** 处理人 */
  approverName?: string
  /** 处理人部门名称 */
  approverDepartName?: string
  /** 处理操作：通过、驳回、撤回等 */
  approvalType?: string
  /** 审批意见/备注 */
  approverOpinion?: string
  /** 接收时间 */
  approverReceiveTime?: number
  /** 审批完成时间 */
  approverFinishTime?: number
}
/**环节信息 */
export interface WorkflowLinkModel {
  /** 当前环节id */
  currentNodeId?: string
  /** 当前环节名称 */
  currentNode?: string
  /** 当前环节审批人 */
  currentPerson?: string
  /** 下一环节id */
  nextNodeId?: string
  /** 下一环节名称 */
  nextNode?: string
  /** 下一环节审批人 */
  nextAssignee?: string
  /** 合作单位类型 */
  companyType?: number
  /** 下一环节审批人角色id */
  nextRoleId?: number
}

export interface workOrderModel {
  /** 业务阶段BizTypeEnum  不传默认101
101：规建维优审核阶段
102：选址阶段
103：勘察阶段
104：施工阶段
105：施工工序阶段 */
  bizType?: number
  /** 状态：WorkOrderStateEnum 0待审核 1审核中 2审核通过 3审核不通过 */
  workOrderStateList?: number[]
  /** 工单编号 */
  workOrderNo?: string
  /** 工单名称 */
  workOrderName?: string
  /** 时间范围：开始时间 */
  beginTime?: number
  /** 时间范围：结束时间 */
  endTime?: number
}

export interface workOrderListModel {
  /** 数据 */
  records?: Array<{
    /** 主键id */
    id?: number
    /** 站点id */
    stationId?: string
    /** 工单编号 */
    workOrderNo?: string
    /** 工单名称 */
    workOrderName?: string
    /** 阶段类型：选址阶段、勘察阶段、施工阶段等对应枚举值
业务阶段BizTypeEnum
101：规建维优审核阶段
102：选址阶段
103：勘察阶段
104：施工阶段 */
    stageType?: number
    /** 阶段类型名称：选址阶段、勘察阶段、施工阶段等对应枚举值名称 */
    stageTypeName?: string
    /** 子阶段类型，记录施工阶段工序阶段子流程
1041:施工工序阶段 */
    subStageType?: number
    /** 子阶段类型，记录施工阶段工序阶段子流程 */
    subStageTypeName?: string
    /** 工单状态：0待审核、1审核中、2.审核通过、3审核不通过
     PENDING(0 待审核)
    APPROVAL(1 审核中)
    FINISHED(2 审核通过)
    FAIL(3 审核不通过) */
    workOrderState?: number
    /** 工单状态：待审核、审核通过、审核不通过 */
    workOrderStateName?: string
    /** 流程实例id */
    workflowProcInstId?: string
    /** 审批完成时间 */
    workOrderFinishTime?: number
    /** 创建时间 */
    createTime?: number
    /** 创建人oaAccount */
    createBy?: string
    /** 更新人oaAccount */
    updateBy?: string
    /** 省分 */
    province?: string
    /** 地市 */
    city?: string
  }>
  /** 总条数 */
  totalRecord?: number
  /** 每页大小 */
  pageSize?: number
  /** 第几页 */
  pageNo?: number
}
