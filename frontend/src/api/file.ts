import axios from './axios'
import type { ApiResponse } from './axios'

/** 保存 topology-*.json 时后端将 JSON 回写 topology 表后的同步结果 */
export interface TopologySyncInfo {
  synced: boolean
  topologyId?: string
  materializedFileName?: string
  fileId?: string | null
  error?: string
}

export interface ProjectFileNode {
  id: string
  projectId: string
  parentId?: string | null
  fileName: string
  isFolder: boolean
  fileType: number
  filePath: string
  children?: ProjectFileNode[]
  topologySync?: TopologySyncInfo
}

export interface CreateFilePayload {
  projectId: string
  fileName: string
  isFolder: number
  parentId?: string | null
  fileType: number
  content?: string
}

export const fileApi = {
  getTree: (projectId: string) => {
    return axios.get<void, ApiResponse<ProjectFileNode[]>>(`/file/tree/${projectId}`)
  },
  create: (data: CreateFilePayload) => {
    return axios.post<CreateFilePayload, ApiResponse<ProjectFileNode>>('/file/createFile', data)
  },
  read: (fileId: string) => {
    return axios.get<void, ApiResponse<string>>(`/file/readFile/${fileId}`)
  },
  updateContent: (data: { fileId: string; content: string }) => {
    return axios.post<typeof data, ApiResponse<ProjectFileNode>>('/file/updateFileContent', data)
  },
  delete: (fileId: string) => {
    return axios.post<{ fileId: string }, ApiResponse<void>>('/file/delete', { fileId })
  },
  rename: (data: { fileId: string; fileName: string }) => {
    return axios.post<typeof data, ApiResponse<ProjectFileNode>>('/file/renameFile', data)
  },
  move: (data: { fileId: string; parentId?: string | null }) => {
    return axios.post<typeof data, ApiResponse<ProjectFileNode>>('/file/moveFile', data)
  },
  importZip: (projectId: string, file: File, parentId?: string | null) => {
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams({ projectId })
    if (parentId) {
      params.set('parentId', parentId)
    }
    return axios.post<FormData, ApiResponse<void>>(`/file/import?${params.toString()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  exportZip: (projectId: string, fileIds?: string[]) => {
    return axios.get<void, Blob>('/file/export', {
      params: { projectId, fileIds },
      responseType: 'blob',
      paramsSerializer: (params) => {
        const search = new URLSearchParams()
        search.set('projectId', params.projectId)
        for (const fileId of params.fileIds ?? []) {
          search.append('fileIds', fileId)
        }
        return search.toString()
      },
    })
  },
  getProjectTopologyJson: (projectId: string) => {
    return axios.post<void, ApiResponse<{ content: string; fileId?: string | null }>>(
      `/file/getJsonContentByProjectId?projectId=${encodeURIComponent(projectId)}`
    )
  },
}
