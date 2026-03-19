import axios from '../axios'
import type { Response } from '../axios'

/** 一键部署 */
export const deployAll = (projectId: string): Response<any> =>
  axios.post(`/remote/easyShuttle?projectId=${projectId}`, { projectId })

export const deployFrontend = (projectId: string): Response<any> =>
  axios.post(`/remote/frontendCompile?projectId=${projectId}`, { projectId })

export const deployBackend = (projectId: string, deviceName: string): Response<any> =>
  axios.post(`/remote/backendCompile?projectId=${projectId}&deviceName=${deviceName}`, {
    projectId,
    deviceName,
  })

/** 部署 */
export const deployProject = (projectId: string, deviceName: string): Response<any> =>
  axios.post(`/remote/deploy?projectId=${projectId}&deviceName=${deviceName}`, {
    projectId,
    deviceName,
  })
