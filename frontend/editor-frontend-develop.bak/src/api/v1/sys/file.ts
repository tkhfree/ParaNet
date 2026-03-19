import axios from '@/api/axios'
import exportTools from '@/api/exportTools'

/** 下载文件，传单个fileNo时立刻进行下载，传多个fileNo时打成压缩包再下载 */
export const fileDownload = async (fileNo: string[]) => {
  const response = await axios.post(
    '/sys/file/download',
    { fileNo },
    {
      responseType: 'blob',
    },
  )
  return exportTools(response)
}

export type ImagePreviewParams = {
  /** 附件类型 */
  attachmentType?: string
  /** 文件大小 KB */
  attachmentSize?: number
  /** 原始文件名称 */
  originalName?: string
  /** 文件编号 每个文件都唯一，对外下载使用 */
  fileNo?: string
  /** 上传人 */
  createBy?: string
  /** 上传时间 */
  createTime?: number
}
/** 图片预览 */
export const imagePreview = async (data: ImagePreviewParams) => {
  return axios.post('/sys/file/image/preview', data, {
    responseType: 'blob',
  })
}
