import type { BaseDataDict, SystemConfigModel } from '@/model/system'
import type { PaginationParams, Response, ResponseDataList } from '../axios'

import { AxiosRequestHeaders, CancelToken } from 'axios'

import { DICTIONARY_TYPE } from '@/utils/constants'
import axios from '../axios'
import exportTools from '../exportTools'

/**
 *  项目列表
 */
export const fetchProjectList = (): Response<any> => axios.get('/project/projectList')

/**
 *  新增项目
 */
export const addProject = (data: { name: string; remark: string }): Response<any> =>
  axios.post('/project/createProject', data)

/**
 *  更新项目
 */
export const updateProject = (data: { name: string; remark: string; id: any }): Response<any> =>
  axios.post('/project/updateProject', data)

/**
 *  删除项目
 */
export const deleteProject = (id: any): Response<any> => axios.get(`/project/deleteProject/${id}`)

/**
 *  获取项目详情
 */
export const getProjectDetail = (id: any): Response<any> => axios.get(`/project/getProject/${id}`)

/**
 *  检查项目名称是否存在(暂时不用)
 */
export const checkProjectName = (params: { name: string; excludeId?: any }): Response<any> =>
  axios.get(`/project/checkProjectNameExists`, { params })
