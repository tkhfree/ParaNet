import axios, { Response } from '@/api/axios'
import { WorkflowByCooperativeListModel, WorkflowByUserListModel } from '@/model/v1/sys/workflow'

export type WorkflowByCooperativeListParams = {
  /** 合作公司类别
  1 :CONSTRUCTION_UNIT
  2 :DESIGN_UNIT
  3 :SUPERVISION_UNIT
  4 :EQUIPMENT_MANUFACTURER */
  type?: string | number
  /** 公司名称（模糊搜索） */
  name?: string | number
  /** 服务区域ID
默认查询当前登录人的服务区域 */
  serviceArea?: string | number
}

/** 流程获取合作公司 */
export const fetchWorkflowByCooperativeList = (
  data: WorkflowByCooperativeListParams,
): Response<WorkflowByCooperativeListModel[]> => {
  return axios.post('/sys/workflow/cooperative/dropList', data)
}

export type WorkflowByUserListParams = {
  /** 角色ID */
  roleId?: string | number
  /** 合作公司ID
  如果当前登录用户为外部用户，系统忽略该字段，直接查登录用户所在公司
  如果当前登录用户为联通用户，不指定该字段则查询所有公司用户 */
  cooperativeId?: string | number
  /** 用户姓名（模糊搜索） */
  name?: string | number
  /** 服务区域ID
  默认查询当前登录人的服务区域
  如果指定的区域ID不在当前登录人的服务区域内，系统报错 */
  serviceArea?: string | number
}

/** 流程获取人员 */
export const fetchWorkflowByUserList = (
  data: WorkflowByUserListParams,
): Response<WorkflowByUserListModel[]> => {
  return axios.post('/sys/workflow/user/dropList', data)
}
