import axios, { Response, ResponseDataList } from '@/api/axios'
import {
  HighRiskBasicInfoModel,
  HighRiskDetailsModel,
  HighRiskNoticeModel,
  QualityInfoModel,
  radioHighRiskResponseModel,
  radioHighRiskSearchModel,
} from '@/model/v1/radio/highRisk'

/**
 * 高危单查询
 */
export const fetchHighRiskList = (
  data: radioHighRiskSearchModel,
): Response<ResponseDataList<radioHighRiskResponseModel>> => {
  return axios.post('/radio/highRisk/page', data)
}

/**
 * 我的单查询
 */
export const fetchMeHighRiskList = (
  data: radioHighRiskSearchModel,
): Response<ResponseDataList<radioHighRiskResponseModel>> => {
  return axios.post('/radio/highRisk/me/page', data)
}

export interface FetchRadioHighRiskQualityInfoParams {
  /** 路由型号 */
  baseStationId?: string | number
  /** 权限 */
  actualId?: string | number
}
/**
 * 获取质检信息
 */
export const fetchRadioHighRiskQualityInfo = (
  data: FetchRadioHighRiskQualityInfoParams,
): Response<QualityInfoModel[]> => {
  return axios.post('/radio/highRisk/qualityInfo', data)
}

/**
 * 获取我的工单详情
 */
export const fetchRadioHighRiskDetails = (id: string | number): Response<HighRiskDetailsModel> => {
  return axios.post('/radio/highRisk/detail', { id })
}

/**
 * 获取监管页的基本信息
 */
export const fetchRadioHighRiskBasicInfo = (
  id: string | number,
): Response<HighRiskBasicInfoModel> => {
  return axios.post('/radio/highRisk/basicInfo', { id })
}

export interface SubmitRadioHighRiskParams {
  /** 高危单id */
  id: string
  /** 问题记录 */
  problemRecord: string
  /** 任务处理类型	0 完成任务 1 取消任务 */
  type: string
}

/**
 * 监管页面-处理任务
 */
export const submitRadioHighRisk = async (data: SubmitRadioHighRiskParams): Response<unknown> => {
  return axios.post('/radio/highRisk/handle', data)
}

/**
 * 获取高危订单接单列表
 */
export const fetchHighRiskNoticeList = async (): Response<HighRiskNoticeModel[]> => {
  return axios.post('/radio/highRisk/noticeList')
}
