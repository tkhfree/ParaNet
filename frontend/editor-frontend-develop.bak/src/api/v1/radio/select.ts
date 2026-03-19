import axios, { Response } from '@/api/axios'
import { ManagarChangeEchoModel, SecondChangeEchoModel } from '@/model/v1/radio/select'

/** 选址二次派单（单站，批量） */
export const saveSecondActivity = (data: {
  toNextUserId?: string | number
  remark?: string
  baseStationIds?: string[]
}): Response<any> => {
  return axios.post('/radio/select/secondActivity', data)
}

/** 选址 项目经理撤回 */
export const saveManagarReturnActivity = (data: { baseStationId?: string }): Response<any> => {
  return axios.post('/radio/select/managarReturnActivity', data)
}
/** 选址 二次派单撤回 */
export const saveSecondReturnActivity = (data: { baseStationId?: string }): Response<any> => {
  return axios.post('/radio/select/secondReturnActivity', data)
}

/** 选址 项目经理改派回显  */
export const getManagarChangeEcho = (data: {
  /** 业务表ID(站点主键id) */
  baseStationId: string
}): Response<ManagarChangeEchoModel> => {
  return axios.post('/radio/select/getManagarChangeEcho', data)
}

/** 选址 项目经理改派 */
export const saveManagarChangeActivity = (data: {
  /** 选址单位id */
  selectUnitId: number
  /** 设计负责人Id */
  selectManagerUser: number
  /** 选址负责人联系方式 */
  selectManagerPhone: string
  /** 业务表ID(站点主键id) */
  baseStationId: string
}): Response<any> => {
  return axios.post('/radio/select/managarChangeActivity', data)
}

/** 选址 二次派单改派回显  */
export const getSecondChangeEcho = (data: {
  /** 业务表ID(站点主键id) */
  baseStationId: string
}): Response<SecondChangeEchoModel> => {
  return axios.post('/radio/select/getSecondChangeEcho', data)
}

/** 选址 二次派单改派 */
export const saveSecondChangeActivity = (data: {
  /** 选址人员id */
  selectUser: number
  /** 选址人员联系方式 */
  selectUserPhone: string
  /** 业务表ID(站点主键id) */
  baseStationId: string
  /** 备注 */
  remark?: string
}): Response<any> => {
  return axios.post('/radio/select/secondChangeActivity', data)
}

/** 选址 选址结果确认 */
export const saveResultActivity = (data: {
  /** 下一步操作用户 */
  toNextUserId: number
  /** 备注 */
  remark?: string
  /** 业务表主键(站点id) */
  baseStationIds: string[]
}): Response<any> => {
  return axios.post('/radio/select/resultActivity', data)
}

/** 选址 选址审核 */
export const saveCheckActivity = (data: {
  /** 审核结果(0.不通过  1.通过) */
  approvalResult: number
  /** 下一步操作用户 */
  toNextUserId: number
  /** 备注 */
  remark?: string
  /** 业务表主键(站点id) */
  baseStationIds: string[]
}): Response<any> => {
  return axios.post('/radio/select/checkActivity', data)
}
