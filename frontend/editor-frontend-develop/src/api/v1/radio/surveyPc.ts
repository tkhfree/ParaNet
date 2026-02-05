import axios, { Response } from '@/api/axios'
import { SurveyPcInfoModel } from '@/model/v1/radio/surveyPc'

/**
 * 站点详情  - 勘察信息
 * @param data
 * @returns
 */
export const fetchSurveyInfo = (data: { baseStationId: string }): Response<SurveyPcInfoModel> => {
  return axios.post('/radio/surveyPc/getSurveyInfo', data)
}
