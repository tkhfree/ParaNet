import axios, { Response } from '@/api/axios'
import {
  CheckIsNeedSupervisionModel,
  ConstructOrderReassignModel,
  ConstructionInfoModel,
  FileInfoModel,
  ProcessPerformanceModel,
  SecondaryDispatchingReassignModel,
} from '@/model/v1/radio/construction'

interface BatchAssignConstructionSurveyParams {
  /** 基站建设站点表主键id 业务关联id */
  baseStationIds?: string[]
  /** 区县 */
  area?: string
  /** 建设方式(0：自建1：其他2：移动建设3：联通建设4：铁塔建设) */
  constructMethod?: number
  /** 铁塔负责人 */
  communicationTowerUser?: string
  /** 物业协调时间 */
  propertyHarmonizeDate?: number
  /** 物业协调情况 */
  propertyHarmonizeSituation?: string
  /** 配套完成时间 */
  fullyEquippedDate?: number
  /** 配套完成情况 */
  fullyEquippedSituation?: string
  /** 备注 */
  remark?: string
  /** 下一步处理人 */
  nextHandlerUser?: string
}

/** 勘察 建设指派 */
export const saveBatchAssignConstructionSurvey = (
  data: BatchAssignConstructionSurveyParams,
): Response<any> => {
  return axios.post('/radio/construction/batchAssignConstructionSurvey', data)
}

interface ConstructDispatchOrderParams {
  /** 基站建设站点表主键id 业务关联id */
  baseStationIds?: string[]
  /** 计划勘察完成时间 */
  plannedCompletionDate?: number
  /** 要求方案完成时间 */
  requireCompletionDate?: number
  /** 勘察单位 */
  surveyUnit?: string
  /** 设计负责人 */
  designPerson?: string
  /** 联系方式(设计负责人) */
  contactDetailsPerson?: string
  /** 是否监理参与 */
  whetherSupervision?: number
  /** 监理单位 */
  supervisionUnit?: string
  /** 监理负责人 */
  supervisionPerson?: string
  /** 联系方式(监理负责人) */
  contactSupervisionPerson?: string
  /** 关联勘察模板id */
  templateAssociateId?: string
}

/** 勘察 勘察派单 */
export const saveConstructDispatchOrder = (data: ConstructDispatchOrderParams): Response<any> => {
  return axios.post('/radio/construction/constructDispatchOrder', data)
}

/** 勘察 勘察派单撤回 */
export const saveWithdrawDispatchOrder = (data: { baseStationId?: string }): Response<any> => {
  return axios.post('/radio/construction/withdrawDispatchOrder', data)
}

/** 勘察 二次派单撤回 */
export const saveWithdrawSecondaryDispatching = (data: {
  baseStationId?: string
}): Response<any> => {
  return axios.post('/radio/construction/withdrawSecondaryDispatching', data)
}

type ConstructOrderReassignParams = {
  baseStationIds?: string[]
  /** 勘察单位 */
  surveyUnit?: string
  /** 设计负责人 */
  designPerson?: number
  /** 联系方式(设计负责人) */
  contactDetailsPerson?: string
  /** 是否监理参与 */
  whetherSupervision?: number
  /** 监理单位 */
  supervisionUnit?: string
  /** 监理负责人 */
  supervisionPerson?: number
  /** 联系方式(监理负责人) */
  contactSupervisionPerson?: string
}

/** 勘察 勘察派单改派回显 */
export const getConstructDispatchOrder = (data: {
  baseStationId?: string
}): Response<ConstructOrderReassignModel> => {
  return axios.post('/radio/construction/getConstructDispatchOrder', data)
}
/** 勘察 勘察派单改派 */
export const saveConstructOrderReassign = (data: ConstructOrderReassignParams): Response<any> => {
  return axios.post('/radio/construction/constructOrderReassign', data)
}

type SecondaryDispatchingReassignParams = {
  /** 基站建设站点表主键id 业务关联id */
  baseStationIds?: string[]
  /** 勘察人员 */
  geologicalSurveyors?: string
  /** 电话 */
  contactDetailsSurveyors?: string
  /** 派工备注 */
  dispatchingRemark?: string
}

/** 勘察 二次派单改派回显 */
export const getSecondaryDispatching = (data: {
  baseStationId?: string
}): Response<SecondaryDispatchingReassignModel> => {
  return axios.post('/radio/construction/getSecondaryDispatching', data)
}
/** 勘察 二次派单改派 */
export const saveSecondaryDispatchingReassign = (
  data: SecondaryDispatchingReassignParams,
): Response<any> => {
  return axios.post('/radio/construction/secondaryDispatchingReassign', data)
}

type SecondaryDispatchingParams = {
  /** 基站建设站点表主键id 业务关联id */
  baseStationIds?: string[]
  /** 勘察人员 */
  geologicalSurveyors?: string
  /** 电话 */
  contactDetailsSurveyors?: string
  /** 派工备注 */
  dispatchingRemark?: string
}

/** 勘察 二次派单 */
export const saveSecondaryDispatching = (data: SecondaryDispatchingParams): Response<any> => {
  return axios.post('/radio/construction/secondaryDispatching', data)
}

/** 勘察 图纸上传提交 */
export const saveUploadDrawings = (data: {
  /** 下一步处理人 */
  nextHandlerUser?: string
  baseStationId?: string
  /** 文件编号 */
  fileNos?: string[]
}): Response<any> => {
  return axios.post('/radio/construction/uploadDrawings', data)
}

/** 勘察 图纸审核 */
export const saveDrawingReview = (data: {
  /** 业务id */
  baseStationIds?: string[]
  /** 1：通过，0：不通过 */
  reviewOutcome?: number
  /** 审核意见备注 */
  remark?: string
  /** 下一步环节人员选择 */
  nextHandlerUser?: string
}): Response<any> => {
  return axios.post('/radio/construction/drawingReview', data)
}

/** 勘察 获取该地市下是否配置监理人员节点 */
export const getSupervisorInvolved = (data: {
  /** 省分id */
  provinceId?: string | number
  /** 地市id */
  cityId?: string | number
}): Response<any> => {
  return axios.post('/radio/construction/getSupervisorInvolved', data)
}

/**  施工信息 list + 基本信息 */
export const fetchConstructionInfo = (data: {
  /** 站点id */
  baseStationId: string | number
  /** 施工单id */
  actualId: string | number
}): Response<ConstructionInfoModel[]> => {
  return axios.post('/radio/construction/getConstructionInfo', data)
}

/**  施工信息  查询工序完成情况 */
export const fetchProcessPerformance = (data: {
  /** 派单表id */
  actualId: string | number
}): Response<ProcessPerformanceModel[]> => {
  return axios.post('/radio/construction/getProcessPerformance', data)
}

/**  施工信息  查询文件信息 */
export const fetchFileInfo = (data: {
  /** 派单表id */
  actualId: string | number
}): Response<FileInfoModel[]> => {
  return axios.post('/radio/construction/getFileInfo', data)
}

type AddActualParams = {
  /** 模版id */
  templateId?: string
  /** 站点id */
  baseStationId?: string
  /** 派单列表 */
  actualList?: Array<{
    /** 施工工序code */
    processCode?: string
    /** 是否需监理参与（0否，1是） */
    isNeedSupervision?: string
    /** 是否为高危单（0否，1是） */
    isHighRisk?: string
    /** 要求开工时间 */
    requiredStartTime?: string
    /** 要求完工时间 */
    requiredFinishTime?: string
    /** 监理单位id */
    supervisionUnitId?: string
    /** 监理负责人id */
    supervisionManagerId?: string
    /** 施工单位id */
    constructionUnitId?: string
    /** 施工负责人id */
    constructionManagerId?: string
  }>
}

/**  施工信息  施工派单 */
export const saveAddActual = (data: AddActualParams): Response<any> => {
  return axios.post('/radio/construction/addActual', data)
}

/**  施工信息  撤回（地市项目经理） */
export const saveManagerWithdrawActuall = (data: { actualIdList?: string[] }): Response<any> => {
  return axios.post('/radio/construction/managerWithdrawActual', data)
}

/**  施工信息  施工改派(地市项目经理) */
export const saveManagerUpdateActual = (data: {
  /** 派单id */
  actualId: string
  /** 施工单位id */
  constructionUnitId: string
  /** 施工负责人id */
  constructionManagerId: string
}): Response<any> => {
  return axios.post('/radio/construction/managerUpdateActual', data)
}

/**  施工信息  二次派单(施工负责人、监理负责人) */
export const saveSecondaryActual = (data: {
  /** 派单id */
  actualId: string
  /** 施工人员id */
  constructionStaffId: string
  /** 监理人员id */
  supervisionStaffId: string
  /** 备注 */
  remark: string
}): Response<any> => {
  return axios.post('/radio/construction/secondaryActual', data)
}

/**  施工信息  撤回（施工负责人、监理负责人） */
export const saveWithdrawActual = (data: {
  /** 派单id */
  actualId: string
  /** 操作人员职务（0施工负责人，1监理负责人） */
  operatorPosition: string | number
}): Response<any> => {
  return axios.post('/radio/construction/withdrawActual', data)
}

/**  施工信息  改派（施工负责人、监理负责人） */
export const saveUpdateActual = (data: {
  /** 派单id */
  actualId: string
  /** 施工人员id */
  constructionStaffId: string
  /** 监理人员id */
  supervisionStaffId: string
  /** 备注 */
  remark: string
}): Response<any> => {
  return axios.post('/radio/construction/updateActual', data)
}

type CompleteActualParams = {
  /** 派单表id */
  actualId: string
  /** 是否完工（0否，1是） */
  isComplete: string
  /** 下一环节人员id */
  nextStaffId?: string
  /** 三级工序列表 */
  thirdProcessList?: Array<{
    /** 三级工序表id */
    thirdProcessId?: string
    /** 质量情况 */
    situationStatus?: string
    /** 整改期限 */
    correctionDate?: string
    /** 整改说明 */
    correctionDescribe?: string
  }>
}
/**  施工信息  工序完工确认 */
export const saveCompleteActual = (data: CompleteActualParams): Response<any> => {
  return axios.post('/radio/construction/completeActual', data)
}

/**  施工信息  资料上传 */
export const saveUpdateFile = (data: {
  /** 派单id */
  actualId: string
  /** 开工资料 */
  startFileNoList: string[]
  /** 完工资料 */
  finishFileNoList: string[]
}): Response<any> => {
  return axios.post('/radio/construction/updateFile', data)
}

/**  施工信息  站点完工确认 */
export const saveCompleteStation = (data: { baseStationId: string }): Response<any> => {
  return axios.post('/radio/construction/completeStation', data)
}

/**  施工信息  根据省市查询是否需要监理 */
export const checkIsNeedSupervision = (data: {
  /** 省份code */
  provinceCode: string | number
  /** 城市code */
  cityCode: string | number
}): Response<CheckIsNeedSupervisionModel> => {
  return axios.post('/radio/construction/checkIsNeedSupervision', data)
}
