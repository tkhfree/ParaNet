import axios, { Response } from '@/api/axios'
import { DictListItemModel } from '@/model/v1/sys/dict'
import { DICTIONARY_TYPE } from '@/utils/constants'

/** 通用字典接口 */
export const fetchDictList = (key: DICTIONARY_TYPE): Response<DictListItemModel[]> => {
  return axios.post('/sys/dict/list', { key })
}
