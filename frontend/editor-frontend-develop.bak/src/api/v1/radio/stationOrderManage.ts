/**
 * 选址提单管理
 */
import axios, { Response } from '@/api/axios'
import exportTools from '@/api/exportTools'
import { OrderDetailParamsModel, SendWorkflowModel } from '@/model/v1/radio/stationOrderManage'

export interface AddTOrderData {
  name: string
}

/**
 * 派单
 */
export const sendWorkflow = (data: SendWorkflowModel): Response<unknown> => {
  return axios.post('/radio/select/sendWorkflow', data)
}
/**
 *
 * @param params
 * @returns
 */
export const fetchOrderDetail = (params: OrderDetailParamsModel): Response<unknown> => {
  return axios.get('/v1/resources/tRoute', { params })
}

/**
 * 导出
 */
export const exportOrderFile = async (data: any) => {
  const response = await axios.post('/v1/macrocell/demand/export', data, {
    responseType: 'blob',
  })
  exportTools(response)
}

/**
 * 获取动态模板列表
 * @param params
 * @returns
 */
export const getStationTemplateList = (data: OrderDetailParamsModel): Response<unknown> => {
  return axios.post('/radio/station/templateList', data)
}

/**
 * 下载选址模版
 */
export const downloadTemplateFile = async (id: number) => {
  const response = await axios.post('/v1/macrocell/demand/download-template-file', id, {
    responseType: 'blob',
  })
  exportTools(response)
}

/**
 * 选择勘查人员
 */
export const getSurveyors = (): Response<unknown> => {
  return axios.get('/v1/macrocell/demand/download-template-file')
}

/**
 * 选择选址负责人
 */
export const getChargePerson = (): Response<unknown> => {
  return axios.get('/v1/macrocell/demand/download-template-file')
}
/**
 * 选择选址单位
 */
export const getSiteUnits = (): Response<unknown> => {
  return axios.get('/v1/macrocell/demand/download-template-file')
}

/**
 * 选择区县
 */
export const getRegion = (): Response<unknown> => {
  return axios.get('/v1/macrocell/demand/download-template-file')
}
