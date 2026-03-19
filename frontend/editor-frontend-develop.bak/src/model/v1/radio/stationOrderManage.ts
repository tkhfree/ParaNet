import { PaginationParams } from '@/api/axios'

export interface SiteOrderListParams extends PaginationParams {
  /** 查询入口  0 - 站点查询  1 - 站点提单管理  2 - 站点建设管理 */
  queryType?: number
  /** 站点名称 */
  stationName?: string
  /** 项目名称 */
  projectName?: string
  /** 站点进度 */
  process?: number
  /** 站点状态 */
  processStatus?: number
  /** 站点类型 （基站、微基站、电源配套、搬迁基站、技改类） */
  siteType?: string
  /** 网络制式  4G 5G */
  networkStandard?: string
  /** 站点提单管理  0 - 待提单站点 1 - 已提单站点 */
  submitFlag?: number
  /** 站点建设管理 0 - 待处理站点； 1 - 全部站点 */
  todoFlag?: number
  /** 页码 */
  pageNo?: number
  /** 每页大小 */
  pageSize?: number
}

export interface OrderDetailParamsModel {
  /** 查询入口  0 - 站点查询  1 - 站点提单管理  2 - 站点建设管理 */
  queryType?: number
  /** 站点ID */
  baseStationId?: string
}

export interface OrderDetailModel {
  /** 系统定义的业务错误码（非HTTP标准状态码）
// @see ErrorCodeEnum */
  code?: number
  /** 系统定义的业务错误信息
//  @see ErrorCodeEnum */
  msg?: string
  /** 本次请求的返回值 */
  data?: {
    /** 基础信息 */
    detail?: {
      /** 主键ID(专业-物理站ID-逻辑站ID) */
      baseStationId?: string
      /** 站点名称 */
      stationName?: string
      /** 物理站ID */
      stationId?: string
      /** 逻辑站ID */
      logicalStationId?: string
      /** 省分 */
      province?: number
      /** 省份名称 */
      provinceName?: string
      /** 地市 */
      city?: number
      /** 地市名称 */
      cityName?: string
      /** 区县 */
      area?: number
      /** 区县名称 */
      areaName?: string
      /** 项目编号 */
      projectCode?: string
      /** 项目名称 */
      projectName?: string
      /** 经度 */
      longitude?: number
      /** 纬度 */
      latitude?: number
      /** 详细地址 */
      address?: string
      /** 网络制式（1-4G  2-5G） */
      networkStandard?: string
      /** 频段（900M1800M2100M2300M3500M毫米波） */
      band?: string
      /** 站点类型（1.基站 2.微基站 3.配套电源 4.搬迁基站 5.技改类） */
      siteType?: string
      /** 投资小计（万元） */
      investment?: number
      /** 预计建设年份 */
      buildyear?: string
      /** 面覆盖类型 */
      surfaceCoverageType?: string
      /** 一级场景分类 */
      scene?: string
      /** 二级场景分类 */
      subscene?: string
      /** 项目经理（提单人） */
      managerUser?: string
      /** 提单时间 */
      submitTime?: number
      /** 监理单位 */
      supervisionUnit?: string
      /** 监理负责人 */
      supervisionPerson?: string
      /** 设计单位 */
      designUnit?: string
      /** 设计负责人 */
      designPerson?: string
      /** 施工单位 */
      constructionUnit?: string
      /** 施工负责人 */
      constructionPerson?: string
      /** 选址完成时间 */
      selectionTime?: number
      /** 勘察设计完成时间 */
      designTime?: number
      /** 施工完成时间 */
      constructionTime?: number
    }
    /** 右上角操作按钮类型 */
    buttonType?: number
    /** 1-进度信息 2-选址信息 3-勘察信息 4-施工信息 */
    sheetList?: number[]
  }
}

export type SendWorkflowModel = {
  /** 要求完成时间 */
  selectRequireTime: number
  /** 选址单位id */
  selectUnitId: number
  /** 选址负责人Id */
  selectManagerUser: number
  /** 选址负责人联系方式 */
  selectManagerPhone: string
  /** 关联模版id */
  templateId: number
  /** 业务表ID(站点主键id) */
  baseStationIds: string[]
}
