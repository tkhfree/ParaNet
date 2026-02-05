import { TRouteModel } from '@/model/resources'
import axios, { PaginationParams, Response, ResponseDataList } from '../axios'

export interface FetchTRouteParams extends PaginationParams {
  /** 路由型号 */
  name?: string
  /** 权限 */
  isPublic?: string | number
}
/**
 * 获取列表数据
 */
export const fetchTRoute = (params: FetchTRouteParams): Response<ResponseDataList<TRouteModel>> => {
  return axios.get('/v1/resources/tRoute/page', { params })
}

/**
 * 删除
 * @param ids id数组
 */
export const deleteTRoute = (ids: string[]): Response<unknown> => {
  return axios.delete('/v1/resources/tRoute/delete', { data: { ids } })
}

export interface AddTRouteData {
  /** 路由型号 */
  name: string
  /** 星间链路口数量 */
  interStarNum: number
  /** 星间链路口支持带宽
  字典 route_band_width */
  interStarBandwidth: number
  /** 馈电链路口数量 */
  feedNum: number
  /** 馈电链路口支持带宽
  字典 route_band_width */
  feedBandwidth: number
  /** 内部转发口数量 */
  transpondNum: number
  /** 内部转发口带宽
  字典 route_band_width */
  transpondBandwidth: number
  /** 最大转发速率 */
  maxTranspond: number
  /** 备注 */
  remark: string
  /** 是否公开 0 公开 1 私有
  字典authority */
  isPublic: number
}

/**
 * 新增
 */
export const addTRoute = (data: AddTRouteData): Response<unknown> => {
  return axios.post('/v1/resources/tRoute', data)
}

/**
 * 编辑
 */
export const updateTRoute = (data: AddTRouteData & { id: string }): Response<unknown> => {
  return axios.put('/v1/resources/tRoute', data)
}

/**
 * 获取详情
 */
export const fetchTRouteDetails = (id: string): Response<TRouteModel> => {
  return axios.get(`/v1/resources/tRoute/${id}`)
}

/**
 * 获取下拉列表
 */
export const fetchTRouteList = (): Response<TRouteModel[]> => {
  return axios.get('/v1/resources/tRoute/list')
}
