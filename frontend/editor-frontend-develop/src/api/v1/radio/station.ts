import axios, { Response, ResponseDataList } from '@/api/axios'
import exportTools from '@/api/exportTools'
import {
  StationQueryModel,
  TemplateListItmeModel,
  radioStationResponseModel,
  radioStationSearchModel,
} from '@/model/v1/radio/station'

/**
 * 站点查询
 */
export const fetchStationList = (
  data: radioStationSearchModel,
): Response<ResponseDataList<radioStationResponseModel>> => {
  return axios.post('/radio/station/page', data)
}

/**
 * 导出
 */
export const exportStationFile = async (ids: string[]) => {
  const response = await axios.post(
    '/v1/macrocell/demand/export',
    { ids },
    {
      responseType: 'blob',
    },
  )
  exportTools(response)
}
export interface StationQueryParams {
  /** 查询入口  0 - 站点查询  1 - 站点提单管理  2 - 站点建设管理   3 - 站点建设管理-工序查看*/
  queryType: 0 | 1 | 2 | 3
  /** 站点ID */
  baseStationId: string
  /** 施工id */
  id?: string
}

/**
 * 站点详情  - 基础信息
 * @param data
 * @returns
 */
export const fetchStationQuery = (data: StationQueryParams): Response<StationQueryModel> => {
  return axios.post('/radio/station/query', data)
}

/**
 * 获取动态模板列表
 * @param data
 * @returns
 */
export const fetchTemplateList = (data: {
  baseStationIds?: string[]
}): Response<TemplateListItmeModel[]> => {
  return axios.post('/radio/station/templateList', data)
}
