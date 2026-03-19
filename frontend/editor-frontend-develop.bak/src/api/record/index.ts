import axios from '../axios'
import type { Response } from '../axios'

export const getDeployCountByProjectId = (projectId: string): Response<any> =>
  axios.get(`/record/getDeployCountByProjectId?projectId=${projectId}`)
