export interface ConstructOrderReassignModel {
  /** 基站建设站点表主键id 业务关联id */
  baseStationId?: string
  /** 勘察单位 */
  surveyUnit?: string
  /** 设计负责人 */
  designPerson?: string
  /** 联系方式(设计负责人) */
  contactDetailsPerson?: string
  /** 监理单位 */
  supervisionUnit?: string
  /** 监理负责人 */
  supervisionPerson?: string
  /** 联系方式(监理负责人) */
  contactSupervisionPerson?: string
}
export interface SecondaryDispatchingReassignModel {
  /** 基站建设站点表主键id 业务关联id */
  baseStationId?: string
  /** 勘察人员 */
  geologicalSurveyors?: string
  /** 电话 */
  contactDetailsSurveyors?: string
  /** 派工备注 */
  dispatchingRemark?: string
}

export interface ConstructionInfoModel {
  id?: string
  /** 工序名称 */
  processName?: string
  /** 工序 */
  processCode?: string
  /** 工序状态 */
  processStatus?: string
  /** 工序状态名称 */
  processStatusName?: string
  /** 要求开工时间 */
  requiredStartTime?: number
  /** 要求完工时间 */
  requiredFinishTime?: number
  /** 监理单位id */
  supervisionUnitId?: string
  /** 监理单位名称 */
  supervisionUnitName?: string
  /** 监理负责人id */
  supervisionManagerId?: string
  /** 监理负责人名称 */
  supervisionManagerName?: string
  /** 监理人员id */
  supervisionStaffId?: string
  /** 监理人员名称 */
  supervisionStaffName?: string
  /** 施工单位id */
  constructionUnitId?: string
  /** 施工单位名称 */
  constructionUnitName?: string
  /** 施工负责人id */
  constructionManagerId?: string
  /** 施工负责人名称 */
  constructionManagerName?: string
  /** 施工人员id */
  constructionStaffId?: string
  /** 施工人员名称 */
  constructionStaffName?: string
  /** 工序完工时间 */
  actualFinishTime?: number
  /** 流程是否有监理（0否，1是） */
  supervisionFlag?: string
  /** 是否需监理参与（0否，1是） */
  isNeedSupervision?: string
}

export interface ProcessPerformanceModel {
  /** 三级工序表id */
  id?: string
  /** 二级工序名称 */
  processSecondName?: string
  /** 三级工序名称 */
  processThirdName?: string
  /** 工序说明 */
  processDescribe?: string
  /** 施工照片 */
  buildPhotoCount?: string
  buildPhotoFileNoList?: string[]
  /** 监理照片 */
  supervisionPhotoCount?: string
  supervisionPhotoFileNoList?: string[]
  /** 整改照片 */
  correctionPhotoCount?: string
  /** 质量情况 */
  situationStatus?: string
  /** 质量情况名称 */
  situationStatusName?: string
  /** 整改期限 */
  correctionDate?: string
  /** 整改说明 */
  correctionDescribe?: string
}

export interface FileInfoModel {
  /** 文件名 */
  fileName?: string
  /** 大小 */
  fileSize?: string
  /** 资料类型 */
  fileType?: string
  /** 上传人 */
  createBy?: string
  /** 上传时间 */
  createTime?: number
  /** 文件编号（地址） */
  fileNo?: string
}
export interface CheckIsNeedSupervisionModel {
  /** 是否需要监理（true是，false否） */
  isNeedSupervision: boolean
}
