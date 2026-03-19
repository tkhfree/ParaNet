import axios, { PaginationParams, Response, ResponseDataList } from '@/api/axios'
import exportTools from '@/api/exportTools'
import { RadioDemandConfigModel, RadioDemandDetailModel } from '@/model/v1/radio/demand'

/**
 * 获取需求专业列表
 */
export const fetchRadioDemandMajorList = (): Response<Array<{ code: string; name: string }>> => {
  return axios.post('/radio/demand/loadMajor')
}

/**
 * 获取需求专业配置信息
 */
export const fetchRadioDemandConfigs = (majorType: string): Response<RadioDemandConfigModel> => {
  return axios.post('/radio/demand/load', { majorType })
}

export interface FetchRadioDemandPageParams extends PaginationParams {
  majorType: string
  /** 工单号(归建维优详情列表查询时使用) */
  workOrderNo?: string
  // 省分
  province?: string
  // 地市
  city?: string
  /** 查询条件 */
  querys?: Array<{
    /** 查询条件英文字段 */
    name?: string
    /** 操作符 like equal */
    operation?: string
    /** 查询条件值 */
    value?: string
  }>
}

/**
 * 获取需求专业表格数据
 */
export const fetchRadioDemandPage = (
  data: FetchRadioDemandPageParams,
): Response<ResponseDataList<RadioDemandConfigModel>> => {
  return axios.post('/radio/demand/page', data)
}

export enum DEMAND_IMPORT_URLS {
  /**
   * 导入需求
   */
  IMPORT_DEMAND = '/radio/demand/importDemand',
  /**
   * 导入站点标签
   */
  IMPORT_STATION_TAG = '/radio/demand/importLabel',
  /**
   * 导入逻辑站点
   */
  IMPORT_STATION = '/radio/demand/importLogical',
}

export interface DeleteDemandParams {
  /** 专业 */
  majorType: string
  /** id集合 */
  ids?: Array<string | number>
  /** 无线网搬迁子集逻辑站id集合 */
  logicalIds?: Array<string | number>
}

/**
 * 删除
 * @param ids id数组
 */
export const deleteDemand = (data: DeleteDemandParams): Response<unknown> => {
  return axios.post('/radio/demand/delete', data)
}

/**
 * 导出
 */
export const exportDemandFile = async (majorType: string, ids: string[]) => {
  const response = await axios.post(
    '/radio/demand/export',
    { majorType, ids },
    {
      responseType: 'blob',
    },
  )
  exportTools(response)
}

/**
 * 下载需求模版
 */
export const downloadRadioDemandTemplateFile = async (
  majorType: string,
  // 是否逻辑模版，0：需求模版，1：逻辑模版
  isLogicalTemplate: 0 | 1,
) => {
  const response = await axios.post(
    '/radio/demand/download',
    { majorType, isLogicalTemplate },
    {
      responseType: 'blob',
    },
  )
  exportTools(response)
}

export interface FetchRadioDemandDetailParams {
  majorType: string
  id: string | number
}

/**
 * 获取需求详情
 */
export const fetchRadioDemandDetail = (
  data: FetchRadioDemandDetailParams,
): Response<RadioDemandDetailModel> => {
  return axios.post('/radio/demand/detail', data)
}
