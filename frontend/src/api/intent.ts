import axios from './axios'
import type { ApiResponse, PaginatedResponse, PaginationParams } from './axios'
import type {
  Intent,
  IntentCreateRequest,
  IntentCompileRequest,
  IntentCompileResponse,
  CompilePreviewRequest,
  NaturalLanguageRequest,
  NaturalLanguageResponse,
  SaveDeployArtifactsRequest,
} from '@/model/intent'

const ARTIFACTS = '/compile-artifacts'

export const intentApi = {
  /** 编译产物记录列表（后端资源路径 /compile-artifacts，与历史 /intents 等价） */
  getList: (params?: PaginationParams & { status?: string; projectId?: string }) => {
    return axios.get<typeof params, ApiResponse<PaginatedResponse<Intent>>>(ARTIFACTS, { params })
  },

  getById: (id: string) => {
    return axios.get<void, ApiResponse<Intent>>(`${ARTIFACTS}/${id}`)
  },

  create: (data: IntentCreateRequest) => {
    return axios.post<IntentCreateRequest, ApiResponse<Intent>>(ARTIFACTS, data)
  },

  update: (id: string, data: Partial<IntentCreateRequest>) => {
    return axios.put<typeof data, ApiResponse<Intent>>(`${ARTIFACTS}/${id}`, data)
  },

  delete: (id: string) => {
    return axios.delete<void, ApiResponse<void>>(`${ARTIFACTS}/${id}`)
  },

  compile: (data: IntentCompileRequest) => {
    return axios.post<IntentCompileRequest, ApiResponse<IntentCompileResponse>>(
      `${ARTIFACTS}/compile`,
      data
    )
  },

  /** 编译并写入项目 output/（P4、entries、manifest） */
  saveDeployArtifacts: (data: SaveDeployArtifactsRequest) => {
    return axios.post<
      SaveDeployArtifactsRequest,
      ApiResponse<{
        success: boolean
        intentId?: string
        compileArtifactId?: string
        written?: string[]
        outputFolder?: string
        errors?: string[]
        warnings?: string[]
        compile?: IntentCompileResponse
      }>
    >(`${ARTIFACTS}/save-deploy-artifacts`, data)
  },

  compilePreview: (data: CompilePreviewRequest, signal?: AbortSignal) => {
    return axios.post<CompilePreviewRequest, ApiResponse<IntentCompileResponse>>(
      `${ARTIFACTS}/compile-preview`,
      data,
      { signal }
    )
  },

  translateNaturalLanguage: (data: NaturalLanguageRequest) => {
    return axios.post<NaturalLanguageRequest, ApiResponse<NaturalLanguageResponse>>(
      `${ARTIFACTS}/translate`,
      data
    )
  },
}
