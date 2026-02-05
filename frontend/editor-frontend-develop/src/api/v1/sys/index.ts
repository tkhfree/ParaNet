import axios, { Response } from '@/api/axios'
import {
  LoginMajorModel,
  LoginMajorParams,
  LoginParams,
  LoginResult,
  UserInfoModel,
} from '@/model/v1/sys'
import { RouteModel } from '@/router'

/**
 * 登录
 * @param params LoginParams
 * @returns 返回token和用户信息
 */
export const login = (data: LoginParams): Response<LoginResult> => {
  return axios.post('/sys/login', data)
}

/**
 * 登录
 * @param params LoginMajorParams
 * @returns 返回token和用户信息
 */
export const loginMajor = (data: LoginMajorParams): Response<LoginMajorModel> => {
  return axios.post('sys/login/major', data)
}

/** 获取当前登录人接口 */
export const fetchUserInfo = (): Response<UserInfoModel> => {
  return axios.post('/sys/userInfo')
}

/**
 * 退出登录
 */
export const logout = (): Response<unknown> => axios.post('/sys/logout')

/**
 * 获取当前登录用户权限
 * @returns 返回菜单及按钮权限
 */
export const fetchAuths = (): Response<{
  buttonKeys: string[]
  menuTree: RouteModel[]
}> => axios.post('/sys/menus')
