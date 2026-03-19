import type { BaseDataDict, SystemConfigModel } from '@/model/system'
import type { PaginationParams, Response, ResponseDataList } from '../axios'

import { AxiosRequestHeaders, CancelToken } from 'axios'

import { DICTIONARY_TYPE } from '@/utils/constants'
import axios from '../axios'
import exportTools from '../exportTools'
import qs from 'qs'

/**
 *  获取项目文件树
 */
export const fetchProjectTree = (projectId: any): Response<any> =>
  axios.get(`/file/tree/${projectId}`)

/**
 *  创建文件/文件夹
 */
interface addProjectParams {
  projectId: number | string
  fileName: string
  isFolder: number
  parentId: number
  fileType: number
  content?: string
}
export const addFile = (data: addProjectParams): Response<any> =>
  axios.post('/file/createFile', data)

/**
 *  获取文件详情
 */
export const getFileDetail = (fileId: any): Response<any> => axios.get(`/file/readFile/${fileId}`)

/**
 *  更新文件内容
 */
export const updateFileContent = (data: { fileId: any; content: string }): Response<any> =>
  axios.post(`/file/updateFileContent`, data)

/**
 *  删除项目
 */
export const deleteFile = (data: { fileId: any }): Response<any> => axios.post(`/file/delete`, data)

/**
 *  重命名文件或文件夹
 */
export const renameFile = (data: { fileId: any; fileName: string }): Response<any> =>
  axios.post(`/file/renameFile`, data)

/**
 *  移动文件或文件夹
 */
export const moveFile = (data: { fileId: any; parentId: any }): Response<any> =>
  axios.post(`/file/moveFile`, data)

/**
 * 上传文件
 * @param file 文件
 * @returns 返回上传文件的信息
 */
export const upload = (
  data: { file: any; projectId: any; parentId?: any },
  cancelToken?: CancelToken,
) => {
  const formData = new FormData()
  formData.append('file', data.file)
  // 创建查询参数
  const params = new URLSearchParams()
  if (data.projectId) params.append('projectId', data.projectId)
  if (data.parentId) params.append('parentId', data.parentId)
  let url = '/file/import'
  if (params.toString()) url += `?${params.toString()}`
  return axios.post(url, formData, {
    cancelToken,
    headers: {
      'content-type': 'multipart/form-data',
    },
    // params,
    timeout: 10000000,
  })
}

/**
 * 导出文件
 */
export const downloadFileByFileNo = async (params: { projectId: any; fileIds?: any }) => {
  const response = await axios.get('/file/export', {
    params,
    responseType: 'blob',
    paramsSerializer(params) {
      return qs.stringify(params, { indices: false })
    },
  })
  exportTools(response)
}

/** 根据项目id获取拓扑文件 */
export const getTopologyDetail = (projectId: string): Response<any> =>
  axios.post(`/file/getJsonContentByProjectId?projectId=${projectId}`)
