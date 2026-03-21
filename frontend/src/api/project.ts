import axios from './axios'
import type { ApiResponse } from './axios'

export interface ProjectRecord {
  id: string
  name: string
  remark?: string
  topologyId?: string | null
  currentFileId?: string | null
  /** 最近保存的可部署编译产物记录 id */
  lastCompileArtifactId?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectPayload {
  name: string
  remark?: string
}

export interface ProjectUpdatePayload extends Partial<ProjectPayload> {
  id: string
  topologyId?: string | null
  currentFileId?: string | null
  lastCompileArtifactId?: string | null
}

/** POST /project/checkProjectResources 返回 */
export interface ProjectResourceCheckPayload {
  projectId: string
  topologyId?: string | null
  compileArtifactId?: string | null
}

export interface ProjectResourceCheckData {
  ok: boolean
  error?: string
  checks?: Record<string, unknown>
}

export const projectApi = {
  getList: () => axios.get<void, ApiResponse<ProjectRecord[]>>('/project/projectList'),
  getById: (id: string) => axios.get<void, ApiResponse<ProjectRecord>>(`/project/getProject/${id}`),
  create: (data: ProjectPayload) => {
    return axios.post<ProjectPayload, ApiResponse<ProjectRecord>>('/project/createProject', data)
  },
  update: (data: ProjectUpdatePayload) => {
    return axios.post<ProjectUpdatePayload, ApiResponse<ProjectRecord>>('/project/updateProject', data)
  },
  delete: (id: string) => axios.get<void, ApiResponse<void>>(`/project/deleteProject/${id}`),
  checkNameExists: (params: { name: string; excludeId?: string }) => {
    return axios.get<typeof params, ApiResponse<boolean>>('/project/checkProjectNameExists', { params })
  },
  checkProjectResources: (data: ProjectResourceCheckPayload) => {
    return axios.post<ProjectResourceCheckPayload, ApiResponse<ProjectResourceCheckData>>(
      '/project/checkProjectResources',
      data
    )
  },
}
