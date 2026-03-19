import { message } from '@/App'
import axiosInstance, { ResponseBody } from '@/api/axios'
import { FILE_TYPES } from '@/utils/constants'
import { Button, ButtonProps, Upload, UploadProps } from 'antd'
import { RcFile } from 'antd/es/upload'
import axios, { CancelToken, CancelTokenSource } from 'axios'
import React, { useRef, useState } from 'react'

export interface ImportFileProps extends Omit<UploadProps, 'action'> {
  action: string
  actionData?: Record<string, any>
  fileTypeErrorMessage?: string
  onSuccess?: (v: any) => void
  onError?: (e: any) => void
  button?: ButtonProps
}

const ImportFile = (props: ImportFileProps) => {
  const {
    accept = FILE_TYPES,
    fileTypeErrorMessage = '当前系统仅支持Office、压缩包、图片及音视频类型的常见文件格式',
    onSuccess,
    onError,
    button: buttonProps,
    action,
    actionData,
    ...uploadProps
  } = props

  const [loading, setLoading] = useState(false)

  const cancelTokenRef = useRef<CancelTokenSource>(undefined)

  const upload = async (file: File, cancelToken?: CancelToken) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      for (const param of Object.keys(actionData ?? {})) {
        formData.append(param, actionData?.[param])
      }
      setLoading(true)
      const result = (await axiosInstance.post(action, formData, {
        headers: {
          'content-type': 'multipart/form-data',
        },
        cancelToken,
        timeout: 10000000,
      })) as unknown as ResponseBody<unknown>
      message.success(result.msg)

      return result
    } finally {
      setLoading(false)
    }
  }

  // 校验文件
  const validateFile = (file: File) => {
    // 判断文件类型
    const fileType = `.${file.name.split('.').pop() ?? ''}`
    if (accept !== null && !accept?.includes(fileType.toLowerCase())) {
      return fileTypeErrorMessage
    }

    return undefined
  }

  const onBeforeUpload = (file: RcFile) => {
    // 验证文件
    const msg = validateFile(file)
    if (msg) {
      message.warning(msg)
      return false
    }

    const uploadFile = {
      cancelSource: axios.CancelToken.source(),
      file,
      localId: file.uid,
      progress: 0,
      status: 'uploading',
    }
    cancelTokenRef.current = axios.CancelToken.source()
    upload(uploadFile.file, cancelTokenRef.current.token).then(onSuccess).catch(onError)

    // 返回false，表示不自动上传
    return false
  }

  return (
    <Upload beforeUpload={onBeforeUpload} showUploadList={false} {...uploadProps}>
      <Button {...buttonProps} loading={loading}>
        {uploadProps?.children}
      </Button>
    </Upload>
  )
}

export default ImportFile
