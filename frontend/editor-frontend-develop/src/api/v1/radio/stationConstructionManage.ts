/**
 * 站点建设管理
 */
import axios, { Response, ResponseDataList } from '@/api/axios'
import exportTools from '@/api/exportTools'
import { SiteOrderListParams } from '@/model/v1/radio/stationOrderManage'
/**
 * 获取列表数据
 */
export const fetchSiteList = (params: SiteOrderListParams): Response<ResponseDataList<any>> => {
  return axios.get('/radio/station/page', { params })
}

/**
 * 获取统计数量
 */
export const fetchSiteNumber = (): Response<ResponseDataList<any>> => {
  return axios.get('/v1/resources/tRoute/page')
}

export interface SiteTData {
  name: string
}

/**
 * 批量处理
 */
export const handelSites = (data: SiteTData): Response<unknown> => {
  return axios.post('/v1/resources/tRoute', data)
}

/**
 * 导出
 */
export const exportSiteFile = async (data: any) => {
  const response = await axios.post('/v1/macrocell/demand/export', data, {
    responseType: 'blob',
  })
  exportTools(response)
}

/**
 * 选择区县
 */
export const getRegion = (): Response<unknown> => {
  return axios.get('/v1/macrocell/demand/download-template-file')
}
