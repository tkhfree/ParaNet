import { TemplateModel } from './selectPc'

export type SurveyPcInfoModel = {
  /** 动态模版数据 */
  instanceList?: Array<TemplateModel>
  /** 静态信息 */
  constructReassignVO?: {
    /** 建设指派信息 */
    constructReassignInfo?: {
      /** 指派时间 */
      assignTime?: number
      /** 区县 */
      area?: string
      /** 建设方式(0:自建) */
      constructMethod?: number
      constructMethodName?: string
      /** 物业协调时间 */
      propertyHarmonizeDate?: number
      /** 物业协调情况 */
      propertyHarmonizeSituation?: string
      /** 备注 */
      remark?: string
    }
    /** 服务商信息 */
    serviceInfo?: {
      /** 勘察单位 */
      surveyUnit?: string
      /** 设计负责人 */
      designPerson?: string
      /** 联系方式(设计负责人) */
      contactDetailsPerson?: string
      /** 计划勘察完成时间 */
      plannedCompletionDate?: number
      /** 要求勘察完成时间 */
      requireCompletionDate?: number
      /** 勘察人员 */
      geologicalSurveyors?: string
      /** 联系方式(勘察人员) */
      contactDetailsSurveyors?: string
    }
    /** 文件信息 */
    designFiles?: Array<{
      /** 业务id */
      baseStationId?: string
      /** 文件名称 */
      fileName?: string
      /** 文件大小 */
      fileSize?: number
      /** 文件类型 */
      fileType?: number
      /** 上传人 */
      uploadUser?: string
      /** 上传时间 */
      uploadTime?: string
      fileNo?: string
    }>
  }
  /** 勘察阶段内部状态信息 &#064;See  StationStateEnum */
  assignStatus?: number
}
