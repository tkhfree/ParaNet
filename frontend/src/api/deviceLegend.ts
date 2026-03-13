import axios from './axios'
import type { ApiResponse } from './axios'
import type {
  DeviceLegend,
  DeviceLegendCreateRequest,
  DeviceLegendUpdateRequest,
} from '@/model/topology'

export const deviceLegendApi = {
  list: () => {
    return axios.get<void, ApiResponse<DeviceLegend[]>>('/device-legends')
  },

  create: (data: DeviceLegendCreateRequest) => {
    return axios.post<DeviceLegendCreateRequest, ApiResponse<DeviceLegend>>('/device-legends', data)
  },

  update: (id: string, data: DeviceLegendUpdateRequest) => {
    return axios.put<DeviceLegendUpdateRequest, ApiResponse<DeviceLegend>>(`/device-legends/${id}`, data)
  },

  delete: (id: string) => {
    return axios.delete<void, ApiResponse<void>>(`/device-legends/${id}`)
  },
}
