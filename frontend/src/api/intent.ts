import axios from './axios'
import type { ApiResponse, PaginatedResponse, PaginationParams } from './axios'
import type { 
  Intent, 
  IntentCreateRequest,
  IntentCompileRequest,
  IntentCompileResponse,
  NaturalLanguageRequest,
  NaturalLanguageResponse,
} from '@/model/intent'

export const intentApi = {
  // 获取意图列表
  getList: (params?: PaginationParams & { status?: string }) => {
    return axios.get<typeof params, ApiResponse<PaginatedResponse<Intent>>>(
      '/intents',
      { params }
    )
  },

  // 获取意图详情
  getById: (id: string) => {
    return axios.get<void, ApiResponse<Intent>>(`/intents/${id}`)
  },

  // 创建意图
  create: (data: IntentCreateRequest) => {
    return axios.post<IntentCreateRequest, ApiResponse<Intent>>('/intents', data)
  },

  // 更新意图
  update: (id: string, data: Partial<IntentCreateRequest>) => {
    return axios.put<typeof data, ApiResponse<Intent>>(`/intents/${id}`, data)
  },

  // 删除意图
  delete: (id: string) => {
    return axios.delete<void, ApiResponse<void>>(`/intents/${id}`)
  },

  // 编译意图
  compile: (data: IntentCompileRequest) => {
    return axios.post<IntentCompileRequest, ApiResponse<IntentCompileResponse>>(
      '/intents/compile',
      data
    )
  },

  // 自然语言转 DSL
  translateNaturalLanguage: (data: NaturalLanguageRequest) => {
    return axios.post<NaturalLanguageRequest, ApiResponse<NaturalLanguageResponse>>(
      '/intents/translate',
      data
    )
  },
}
