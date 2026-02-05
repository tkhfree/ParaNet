import axios, { Response, ResponseDataList } from '@/api/axios'
import { todoResponseModel, todoSearchdModel } from '@/model/v1/radio/cockpit'
/**
 * 代办已办事项
 */
export const fetchTodoList = (
  data: todoSearchdModel,
): Response<ResponseDataList<todoResponseModel>> => {
  return axios.post('/radio/cockpit/task/page', data)
}
