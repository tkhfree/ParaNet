import axios, { Response, ResponseDataList } from '@/api/axios'
import {
  WorkflowApprovalModel,
  WorkflowFlowDiagramModel,
  WorkflowLinkModel,
  workOrderListModel,
  workOrderModel,
} from '@/model/v1/radio/workflow'

export interface WorkflowCommonParams {
  /** 站点id */
  baseStationId?: number | string
  /** 工单编号  针对于批量发起的无法一对一定位 */
  workOrderNo?: string
  /** 业务阶段BizTypeEnum
101：规建维优审核阶段
102：选址阶段
103：勘察阶段
104：施工阶段 */
  bizType?: number
  /** 业务子阶段BizSubTypeEnum
1041：施工工序阶段 */
  bizSubType?: number
  /** 业务id:针对于工序单个流程的流程图、审批记录查询 */
  businessId?: number
}

/**
 * 获取流程图
 */
export const fetchWorkflowFlowDiagram = (
  data: WorkflowCommonParams,
): Response<WorkflowFlowDiagramModel[]> => {
  return axios.post('/radio/workflow/flow/diagram', data)
}

/**
 * 获取审批记录
 */
export const fetchWorkflowApprovalList = (
  data: WorkflowCommonParams,
): Response<Array<{ name?: string; approvalRecords?: WorkflowApprovalModel[] }>> => {
  return axios.post('/radio/workflow/approval/record', data)
}

/**
 * 获取当前环节下一环节
 */
export const fetchWorkflowLink = (data: WorkflowCommonParams): Response<WorkflowLinkModel> => {
  return axios.post('/radio/workflow/link', data)
}

/**
 * 规划维优审核
 */
export const fetchApprovalList = (
  data: workOrderModel,
): Response<ResponseDataList<workOrderListModel>> => {
  return axios.post('/radio/workflow/workOrder/list', data)
}
