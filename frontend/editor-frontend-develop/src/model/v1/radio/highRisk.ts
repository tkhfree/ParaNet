export interface radioHighRiskSearchModel {
  /** 站点名称 */
  stationName?: string
  /** 项目名称 */
  projectName?: string
  /** 工单状态	0 待处理，1 处理中，2 已处理 */
  status?: number
  /** 当前页 */
  pageNo: string
  /** 每页条数 */
  pageSize: string
}

export interface radioHighRiskResponseModel {
  /** 总条数 */
  totalRecord: number
  /** 每页大小 */
  pageSize: number
  /** 第几页 */
  pageNo: number
  /** 数据 */
  records: Array<{
    /** 站点名称 */
    stationName: string
    /** 高危单号 */
    orderNumber: string
    /** 物理站ID */
    stationId: string
    /** 逻辑站ID */
    logicStationId: string
    /** 工单状态	0 待处理，1 处理中，2 已处理 */
    status: string
    statusName: string
    /** 要求开工时间 */
    requiredStartTime: number
    /** 省份 */
    province: string
    /** 地市 */
    city: string
    /** 地市 */
    cityName: string
    /** 区县 */
    area: string
    /** 区县 */
    areaName: string
    /** 项目类型 */
    siteType: string
    /** 项目名称 */
    projectName: string
    /** 项目编号 */
    projectCode: string
    /** 项目经理 */
    managerUser: string
    /** 施工工艺 */
    processName: string
    /** 施工单位id */
    constructionUnitId: string
    /** 施工单位名称 */
    constructionUnitName: string
    /** 施工负责人id */
    constructionManagerId: string
    /** 施工负责人 */
    constructionManagerName: string
    /** 场景 */
    subScene: string
    /** 创建时间 */
    createTime: number
    /** 接单时间 */
    qualityInspectionStartTime: string
    /** 完结时间 */
    qualityInspectionEndTime: string
    /** 处理人id */
    qualityInspectorId: string
    /** 处理人 */
    qualityInspectorName: string
    id: string
  }>
}
export interface QualityInfoModel {
  /** 质检人 */
  qualityInspectorName: string
  /** 质检开始时间 */
  qualityInspectionStartTime: number
  /** 质检结束时间 */
  qualityInspectionEndTime: number
  /** 质检问题记录 */
  problemRecord: string
  /** 工序名称 */
  processName: string
  /** 工序 */
  processCode: string
  id: string
}

export interface HighRiskDetailsModel {
  /** 基础信息 */
  detail: {
    /** 主键ID(专业-物理站ID-逻辑站ID) */
    id: string
    /** 站点名称 */
    stationName: string
    /** 物理站ID */
    stationId: string
    /** 逻辑站ID */
    logicalStationId: string
    /** 省分 */
    province: number
    /** 省份名称 */
    provinceName: string
    /** 地市 */
    city: number
    /** 地市名称 */
    cityName: string
    /** 区县 */
    area: number
    /** 区县名称 */
    areaName: string
    /** 项目编号 */
    projectCode: string
    /** 项目名称 */
    projectName: string
    /** 经度 */
    longitude: number
    /** 纬度 */
    latitude: number
    /** 详细地址 */
    address: string
    /** 网络制式（1-4G  2-5G） */
    networkStandard: string
    /** 频段（900M1800M2100M2300M3500M毫米波） */
    band: string
    /** 站点类型（1.基站 2.微基站 3.配套电源 4.搬迁基站 5.技改类） */
    siteType: string
    /** 投资小计（万元） */
    investment: number
    /** 预计建设年份 */
    buildyear: string
    /** 面覆盖类型 */
    surfaceCoverageType: string
    /** 一级场景分类 */
    scene: string
    /** 二级场景分类 */
    subscene: string
    /** 项目经理（提单人） */
    managerUser: string
    /** 提单时间 */
    submitTime: number
    /** 监理单位 */
    supervisionUnit: string
    /** 监理负责人 */
    supervisionPerson: string
    /** 设计单位 */
    designUnit: string
    /** 设计负责人 */
    designPerson: string
    /** 施工单位 */
    constructionUnit: string
    /** 施工负责人 */
    constructionPerson: string
    /** 选址完成时间 */
    selectionTime: number
    /** 勘察设计完成时间 */
    designTime: number
    /** 施工完成时间 */
    constructionTime: number
  }
  /** 右上角操作按钮类型 */
  buttonType: number
  /** 质检信息 */
  qualityInfo: {
    /** 质检人 */
    qualityInspectorName: string
    /** 质检开始时间 */
    qualityInspectionStartTime: number
    /** 质检结束时间 */
    qualityInspectionEndTime: number
    /** 质检问题记录 */
    problemRecord: string
  }
}

export interface HighRiskBasicInfoModel {
  /** id */
  id: number
  /** 站点名称 */
  stationName: number
  /** 站点位置 */
  address: number
  /** 项目经理 */
  managerUser: string
  /** 项目经理 */
  managerUserName: string
  /** 项目经理电话 */
  managerUserPhone: string
  /** 施工负责人id */
  constructionManagerId: string
  /** 施工负责人 */
  constructionManagerName: string
  /** 施工负责人电话 */
  constructionManagerPhone: string
  /** 监理人员id */
  supervisionStaffId: string
  /** 监理人员 */
  supervisionStaffName: string
  /** 监理人员电话 */
  supervisionStaffPhone: string
  /** 施工人员id */
  constructionStaffId: string
  /** 施工人员 */
  constructionStaffName: string
  /** 施工人员电话 */
  constructionStaffPhone: string
  /** 问题记录信息 */
  problemRecord: string
}

export interface HighRiskNoticeModel {
  /** 站点名称 */
  stationName: string
  /** 高危单号 */
  orderNumber: string
  /** 物理站ID */
  stationId: string
  /** 逻辑站ID */
  logicStationId: string
  /** 工单状态	0 待处理，1 处理中，2 已处理 */
  status: string
  statusName: string
  /** 要求开工时间 */
  requiredStartTime: number
  /** 省份 */
  province: string
  /** 地市 */
  city: string
  /** 地市 */
  cityName: string
  /** 区县 */
  area: string
  /** 区县 */
  areaName: string
  /** 项目类型 */
  siteType: string
  /** 项目名称 */
  projectName: string
  /** 项目编号 */
  projectCode: string
  /** 项目经理 */
  managerUser: string
  /** 施工工艺 */
  processName: string
  /** 施工单位id */
  constructionUnitId: string
  /** 施工单位名称 */
  constructionUnitName: string
  /** 施工负责人id */
  constructionManagerId: string
  /** 施工负责人 */
  constructionManagerName: string
  /** 场景 */
  subScene: string
  /** 创建时间 */
  createTime: number
  /** 接单时间 */
  qualityInspectionStartTime: string
  /** 完结时间 */
  qualityInspectionEndTime: string
  /** 处理人id */
  qualityInspectorId: string
  /** 处理人 */
  qualityInspectorName: string
  id: string
}
