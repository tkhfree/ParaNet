import axios from './axios'
import type { ApiResponse, PaginatedResponse, PaginationParams } from './axios'
import type { 
  Topology, 
  TopologyCreateRequest, 
  TopologyUpdateRequest 
} from '@/model/topology'

export const topologyApi = {
  // 获取拓扑列表
  getList: (params?: PaginationParams) => {
    return axios.get<PaginationParams, ApiResponse<PaginatedResponse<Topology>>>(
      '/topologies',
      { params }
    )
  },

  // 获取拓扑详情
  getById: (id: string) => {
    return axios.get<void, ApiResponse<Topology>>(`/topologies/${id}`)
  },

  // 创建拓扑
  create: (data: TopologyCreateRequest) => {
    return axios.post<TopologyCreateRequest, ApiResponse<Topology>>('/topologies', data)
  },

  // 更新拓扑
  update: (id: string, data: TopologyUpdateRequest) => {
    return axios.put<TopologyUpdateRequest, ApiResponse<Topology>>(`/topologies/${id}`, data)
  },

  // 删除拓扑
  delete: (id: string) => {
    return axios.delete<void, ApiResponse<void>>(`/topologies/${id}`)
  },

  // 导出拓扑
  export: (id: string, format: 'json' | 'yaml' = 'json') => {
    return axios.get<void, Blob>(`/topologies/${id}/export`, {
      params: { format },
      responseType: 'blob',
    })
  },

  // 导入拓扑
  import: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return axios.post<FormData, ApiResponse<Topology>>('/topologies/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
