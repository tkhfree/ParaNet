import { CancelToken } from 'axios'
import axios from '../axios'
import type { Response } from '../axios'

/** 创建图元 */
export const createElement = (
  deviceType: string,
  deviceModel: string,
  pictureName: string,
  picturePath: string,
): Response<any> =>
  axios.post('/Element/createElement', { deviceType, pictureName, deviceModel, picturePath })

export const updateElement = (
  id: string,
  deviceType: string,
  deviceModel: string,
  pictureName: string,
  picturePath: string,
): Response<any> =>
  axios.post('/Element/updateElement', { id, deviceType, pictureName, deviceModel, picturePath })

export const deleteElement = (id: string) => axios.get(`/Element/deleteElement/${id}`)
export const getElement = (deviceModel: string) =>
  axios.get(`/Element/getElementByDeviceType`, { params: { deviceModel } })

/**
 * 获取所有设备
 * @param contains 是否包含已经删除的设备， 0:不包含，1:包含
 * @returns 设备列表
 */
export const getElements = (contains: 0 | 1) =>
  axios.get('/Element/elementList', { params: { contains } })

export const uploadImage = (file: File, cancelToken?: CancelToken) => {
  const formData = new FormData()
  formData.append('file', file)

  return axios.post('/Element/uploadPicture', formData, {
    cancelToken,
    headers: {
      'content-type': 'multipart/form-data',
    },
    // params,
    timeout: 10000000,
  })
}

export const getImage = (id: string) => axios.get(`/Element/images/${id}`)
