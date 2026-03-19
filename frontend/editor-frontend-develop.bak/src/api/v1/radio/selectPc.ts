import axios, { Response } from '@/api/axios'
import { SelectPcInfoModel } from '@/model/v1/radio/selectPc'

/**
 * 站点详情  - 选址信息
 * @param data
 * @returns
 */
export const fetchSelectPcInfo = (data: { baseStationId: string }): Response<SelectPcInfoModel> => {
  return axios.post('/radio/selectPc/pc/info', data)
}

/**
 * 站点详情  - 保存选址信息
 * @param data
 * @returns
 */
export const saveSelectPcInfo = (data: {
  baseStationId: string
  fieldInstanceList: SelectPcInfoModel['instanceList']
}): Response<SelectPcInfoModel> => {
  return axios.post('/radio/selectPc/updateInfoOfPc', data)
}
