import type { BaseDataDict, SystemConfigModel } from '@/model/system'
import type { PaginationParams, Response, ResponseDataList } from '../axios'

import { AxiosRequestHeaders, CancelToken } from 'axios'

import { DICTIONARY_TYPE } from '@/utils/constants'
import axios from '../axios'
import exportTools from '../exportTools'

export interface UpdateUserPasswordParams {
  newPassword: string
  oldPassword: string
}
/**
 * 更新用户密码
 * @param data 旧密码和新密码
 */
export const updateUserPassword = (
  data: UpdateUserPasswordParams,
  headers?: AxiosRequestHeaders,
): Response<unknown> => axios.post('/v1/system/sys_user/password/update', data, { headers })

/**
 *  用户管理列表
 */
export const fetchSysUserList = (params: any): Response<any> =>
  axios.post('/v1/system/sys_user/page', params)

/**
 *  用户新增
 */
export const addSysUser = (data: any): Response<any> => axios.post('/v1/system/sys_user/add', data)

/**
 *  批量删除用户
 */
export const delSysUser = (data: any): Response<any> =>
  axios.post('/v1/system/sys_user/delete_list', data)

/**
 *  用户激活/冻结（同一个接口）
 */
interface UserActivationEnable {
  // 用户id
  id: string
  // 帐号状态（0启用 1停用）
  status?: string
  // 状态 0：锁定 1：解除锁定
  type?: string
}
export const setUserActivation = (data: UserActivationEnable): Response<any> =>
  axios.post('/v1/system/sys_user/activation', data)

/**
 *  用户启用/禁用（同一个接口）
 */
export const setUserEnable = (data: UserActivationEnable): Response<any> =>
  axios.post('/v1/system/sys_user/enable', data)

/**
 *  用户  管理员编辑
 */
export const editSysUser = (data: any): Response<any> =>
  axios.post('/v1/system/sys_user/admin/edit', data)

/**
 *  用户  普通用户修改信息
 */
export const editGeneralSysUser = (data: any): Response<any> =>
  axios.post('/v1/system/sys_user/user/edit', data)

/**
 * 用户 重置密码
 */
export const resetPassword = (data: any): Response<any> =>
  axios.post('/v1/system/sys_user/password/reset', data)

/**
 *  密码更新
 */
export const updatePassword = (data: any): Response<any> =>
  axios.post('/v1/system/sys_user/password/update', data)

/**
 * 用户 查看详情
 */
export const fetchUserDetails = (id: any): Response<any> =>
  axios.post('/v1/system/sys_user/detail', { id })

/**
 * 用户 用户下拉列表
 */
export const fetchUserNameList = (name: any): Response<any> =>
  axios.post('/v1/system/sys_user/userList', { name })

/**
 * 用户 角色列表
 */
export const fetchRoleList = (data: any): Response<any> =>
  axios.post('/v1/system/sys_role/page', data)

/**
 * 获取用户下菜单权限 --树中包含按钮
 * @returns
 */
export const fetchMenuByUserList = (): Response<any> => axios.post('/v1/system/listMenuByUser')

/**
 * 用户 查看角色详情
 */
export const fetchRoleDetails = (roleId: any): Response<any> =>
  axios.post(`/v1/system/sys_role/detail/${roleId}`)

/**
 * 用户 新增角色
 */
export const addRole = (data: any): Response<any> => axios.post('/v1/system/sys_role/add', data)

/**
 * 用户 新增角色
 */
export const editRole = (data: any): Response<any> => axios.post('/v1/system/sys_role/edit', data)

/**
 * 用户 删除角色
 * @params ids 角色id集合
 */
export const delRole = (data: any): Response<any> =>
  axios.post('/v1/system/sys_role/deleteList', data)

/**
 * 角色下拉列表 -- 当前用户下角色列表
 * @params ids 角色id集合
 */
export const fetchRoleSelect = (data: any): Response<any> =>
  axios.post('/v1/system/sys_role/list', data)

/**
 * omc日志列表
 */
export const fetchOperLog = (data: unknown): Response<ResponseDataList<unknown>> =>
  axios.post('/v1/system/operLog/page', data)
/**
 * 导出omc日志列表
 */
export const exportOperLog = (data: unknown): Response<ResponseDataList<unknown>> =>
  axios.post('/v1/system/operLog/export', data)

/**
 * fileNo下载文件
 */
export const downloadFileByFileNo = async (fileNo: string[]) => {
  const response = await axios.post(
    '/v1/system/file/download',
    { fileNo },
    {
      responseType: 'blob',
    },
  )
  exportTools(response)
}
export interface FetchBaseStationInfoListParams extends PaginationParams {
  // 基站查询  名称或者ID
  gIdOrgName?: string
  // 基站类型 0 分布式基站；1 一体化基站；
  gType?: 0 | 1
  // 设备厂家
  manufacturerOui?: string
  // 归属地区
  regionCode?: string
}
export interface ExportBaseStationInfoListParams extends FetchBaseStationInfoListParams {
  ids?: number[]
}
/**
 * 登录ip地址控制列表
 */
export const fetchLoginIp = async (data: ExportBaseStationInfoListParams) =>
  axios.post('/v1/system/ip/page', data)

/**
 *  登录ip地址控制---新增
 */
export const addLoginIp = (data: any): Response<any> => axios.post('/v1/system/ip/add', data)

/**
 *  登录ip地址控制---删除
 */
export const delLoginIp = (data: any): Response<any> => axios.post('/v1/system/ip/del', data)

/**
 * 登录时间控制列表
 */
export const fetchLoginTime = async (data: ExportBaseStationInfoListParams) =>
  axios.post('/v1/system/time/page', data)

/**
 *  登录时间控制---新增
 */
export const addLoginTime = (data: any): Response<any> => axios.post('/v1/system/time/add', data)

/**
 *  登录时间控制---删除
 */
export const delLoginTime = (data: any): Response<any> =>
  axios.post('/v1/system/time/delete_list', data)

/**
 * 查看账号策略
 * @returns
 */
export const fetchAccountTactics = (): Response<any> => axios.post('/v1/system/account/detail')

/**
 *  新增用户校验
 * @returns
 */
export const checkAddUser = (data: any): Response<any> =>
  axios.post('/v1/system/account/check', data)
/**
 * 编辑账号策略
 * @param data
 * @returns
 */
export const updateAccountTactics = (data: unknown): Response<unknown> =>
  axios.post('/v1/system/account/edit', data)

/**
 * 查看密码策略
 * @returns
 */
export const fetchPasswordTactics = (Authorization?: string): Response<any> => {
  return axios.post('/v1/system/password/detail', undefined, {
    headers: { Authorization: Authorization as string },
  })
}

/**
 * 校验密码接口
 * @returns
 */
export const checkPassword = (data: any): Response<any> =>
  axios.post('/v1/system/password/check', data)
/**
 * 编辑密码策略
 * @param data
 * @returns
 */
export const updatePasswordTactics = (data: unknown): Response<unknown> =>
  axios.post('/v1/system/password/edit', data)
/**
 *  消息中心 获取消息列表
 */
export const fetchMessageList = (userId: any): Response<any> =>
  axios.post(`/v1/message/center/list/${userId}`)
/**
 *  消息中心 删除单个消息
 */
export const delMessage = (messageId: any): Response<any> =>
  axios.post(`/v1/message/center/delete/${messageId}`)
/**
 *  消息中心 删除全部消息
 */
export const delMessageAll = (userId: any): Response<any> =>
  axios.post(`/v1/message/center/delete/all/${userId}`)

/**
 * 上传文件
 * @param file 文件
 * @returns 返回上传文件的信息
 */
export const upload = (
  file: File,
  onUploadProgress?: (progressEvent: any) => void,
  cancelToken?: CancelToken,
) => {
  const formData = new FormData()
  formData.append('file', file)
  return axios.post('/v1/system/file/upload', formData, {
    cancelToken,
    headers: {
      'content-type': 'multipart/form-data',
    },
    onUploadProgress,
    timeout: 10000000,
  })
}
// 获取系统配置
export const fetchSystemConfig = (): Response<SystemConfigModel> => axios.post('/v1/system/config')
/**
 * 获取验证码
 * @param uuid 随机唯一标识
 * @returns 返回验证码
 */
export const fetchCaptcha = (uuid: string) => axios.get(`/v1/system/getCaptcha/${uuid}`)

/**
 * 获取验证码
 * @param uuid 随机唯一标识
 * @returns 返回验证码
 */
// biome-ignore lint/correctness/noUnusedVariables: <explanation>
export const fetchDict = (uuid: string) => axios.get('/v1/system/base_data/dict')

export interface FetchBaseDataDictParams {
  // 字典类型
  dictType: DICTIONARY_TYPE
  // 上级编码（可为空），级联查询时传上级编码
  parentCode?: string
}
export const fetchBaseDataDict = (data: FetchBaseDataDictParams): Response<BaseDataDict[]> =>
  axios.post('/v1/system/base_data/dict', data)
