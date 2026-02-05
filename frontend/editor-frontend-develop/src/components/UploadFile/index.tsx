import type { RcFile } from 'antd/lib/upload/interface'
import type { CancelToken, CancelTokenSource } from 'axios'

import { Button, Upload } from 'antd'
import { Modal, Progress, Typography, message } from 'antd'
import { ReactNode, useEffect, useRef } from 'react'
import React, { useState } from 'react'

import UploadIcon from './upload.svg'

import './index.less'
const theme = require('@/theme')
// import { fetchFileCommonDownload } from '@/api/order/file-import'
import axios from 'axios'

import { FILE_TYPES, MAX_FILE_COUNT, MAX_FILE_SIZE } from '@/utils/constants'

const upload = (
  file: File,
  onUploadProgress?: (progressEvent: any) => void,
  cancelToken?: CancelToken,
) => {
  const formData = new FormData()
  formData.append('file', file)
  return axios.post('/v1/system/file/upload', formData, {
    headers: {
      'content-type': 'multipart/form-data',
    },
    onUploadProgress,
    cancelToken,
    timeout: 10000000,
  })
}

export interface FileModel {
  downloading?: boolean
  fileName?: string
  fileNo: string
}

export interface UploadFileProps {
  accept?: null | string | string[]
  // 附件操作按钮
  actions?: Array<'download' | 'preview' | 'remove'>
  children?: ReactNode
  draggerable?: boolean
  // 自定义文件类型验证错误提示
  fileTypeErrorMessage?: string
  hideUploadList?: boolean
  // 超出最大值是是否覆盖
  isCover?: boolean
  maxCount?: number
  // 单位KB
  maxSize?: number
  multiple?: boolean
  onChange?: (info?: FileModel[]) => void
  onError?: (error: Error) => void
  onRemove?: (file: FileModel) => void
  // 上传文件状态改变事件
  onStatusChange?: (status: 'done' | 'uploading') => void
  // 是否显示上传结果的提示信息
  showResultMessage?: boolean
  tips?: ReactNode
  value?: FileModel[]
}

export interface UploadFileItem {
  cancelSource: CancelTokenSource
  data?: FileModel
  file: File
  localId: string
  progress?: number
  status?: 'error' | 'success' | 'uploading'
}

const { Dragger } = Upload

const UploadFile = (props: UploadFileProps) => {
  const defaultChildren = (
    <Button className="upload-file__default-btn" ghost type="primary">
      <UploadIcon fill={theme.primaryColor} height="16" width="16" />
      <span className="default-btn__text">点击上传附件</span>
    </Button>
  )

  const {
    accept = FILE_TYPES,
    actions = [],
    children = defaultChildren,
    draggerable = false,
    fileTypeErrorMessage = '当前系统仅支持Office、压缩包、图片及音视频类型的常见文件格式',
    hideUploadList = false,
    isCover,
    maxCount = MAX_FILE_COUNT,
    maxSize = MAX_FILE_SIZE * 1024,
    onChange,
    onError,
    onRemove,
    onStatusChange,
    showResultMessage = true,
    tips,
    value,
    ...uploadProps
  } = props
  // 上传任务列表
  const [uploadTasks, setUploadTasks] = useState<UploadFileItem[]>([])
  // 上传的文件列表数据
  const uploadListRef = useRef<UploadFileItem[]>([])
  const [fileList, setFileList] = useState<FileModel[]>([])
  useEffect(() => {
    setFileList(value ?? [])
    uploadListRef.current =
      (value?.map((item: any) => {
        return {
          ...item,
          data: item,
          status: 'success',
        }
      }) as UploadFileItem[]) ?? []
  }, [value])

  // 组件卸载时，取消上传
  useEffect(() => {
    return () => {
      for (const item of uploadTasks) {
        item.cancelSource.cancel()
      }
    }
  }, [uploadTasks])

  // 校验文件
  const validateFile = (file: File) => {
    // 判断文件最大上传量
    if (!isCover && uploadListRef.current.length >= maxCount) {
      return `最多上传${maxCount}个附件`
    }
    if (isCover && uploadListRef.current.length === maxCount) {
      uploadListRef.current.shift()
      uploadListRef.current = [...uploadListRef.current]
    }
    // 判断文件类型
    const fileType = `.${file.name.split('.').pop() ?? ''}`
    if (accept !== null && !accept?.includes(fileType.toLowerCase())) {
      return fileTypeErrorMessage
    }

    if (file.size / 1024 > maxSize) {
      return `最大上传${maxSize / 1024}M`
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

    const uploadFile: UploadFileItem = {
      cancelSource: axios.CancelToken.source(),
      file,
      localId: file.uid,
      progress: 0,
      status: 'uploading',
    }
    setUploadTasks(prev => [...prev, uploadFile])
    uploadListRef.current.push(uploadFile)

    // 上传进度
    const uploadProgress = (progressEvent: ProgressEvent) => {
      setUploadTasks(prev => {
        return prev.map(item => {
          if (item.localId === uploadFile.localId) {
            item.progress = (progressEvent.loaded / progressEvent.total) * 100
          }

          return item
        })
      })
    }
    // 上传成功
    const uploadSuccess = ({ data }: any) => {
      // 将上传接口返回的是originalName，详情接口返回的是fileName，此处做一下转换
      const fileInfo = { fileName: data.originalName, fileNo: data.fileNo }
      // 将返回的数据放入上传文件列表中
      uploadListRef.current = uploadListRef.current.map(item => {
        if (item.localId === uploadFile.localId) {
          item.status = 'success'
          item.data = fileInfo
        }

        return item
      })
      // 多文件因为需要所有文件上传成功之后触发onChange，所以此处需要更新一下文件列表
      setFileList(prev => [...prev, fileInfo])
      if (showResultMessage) {
        message.success(`文件 ${file.name} 上传成功`)
      }
    }
    // 上传失败
    const uploadError = (error: Error) => {
      // 将返回的数据放入上传文件列表中
      uploadListRef.current = uploadListRef.current.map(item => {
        if (item.localId === uploadFile.localId) {
          item.status = 'error'
        }

        return item
      })
      if (showResultMessage) {
        message.error(`文件 ${file.name} 上传失败: ${error.message}`)
      }
      onError?.(error)
    }
    // 上传后回调
    const uploadFinally = () => {
      // 移除成功的文件
      setUploadTasks(prev => prev.filter(item => item.localId !== uploadFile.localId))
      // 上传列表中没有uploading状态的表示全部上传完成
      if (uploadListRef.current?.every(item => item.status !== 'uploading')) {
        // 获取上传成功的文件列表
        const successList = uploadListRef.current.filter(item => item.status === 'success')
        onStatusChange?.('done')
        onChange?.(successList.map(item => item.data) as FileModel[])
      }
    }
    onStatusChange?.('uploading')
    // upload(uploadFile.file, uploadProgress, uploadFile.cancelSource.token)
    //   .then(uploadSuccess)
    //   .catch(uploadError)
    //   .finally(uploadFinally)

    // 返回false，表示不自动上传
    return false
  }

  // 下载附件
  const onDownFile = async (fileNo: string) => {
    try {
      setFileList(prev =>
        prev.map(item => {
          if (item.fileNo === fileNo) {
            item.downloading = true
          }

          return item
        }),
      )
      // await fetchFileCommonDownload({ fileNo: [fileNo] })
    } finally {
      setFileList(prev =>
        prev.map(item => {
          if (item.fileNo === fileNo) {
            item.downloading = false
          }

          return item
        }),
      )
    }
  }
  // 删除附件
  const onRemoveFile = (file: FileModel) => {
    Modal.confirm({
      onOk: () => {
        onRemove?.(file)
        setFileList(prev => {
          const list = prev.filter(item => item.fileNo !== file.fileNo)
          onChange?.(list)
          return list
        })
      },
      title: '确定删除该附件吗？',
    })
  }

  const renderFileItem = (item: FileModel | UploadFileItem) => {
    const uploadFile = item as UploadFileItem
    const file = item as FileModel
    const progress = uploadFile?.file ? (
      <Progress
        className="file-item__progress"
        percent={uploadFile.progress}
        showInfo={false}
        strokeWidth={4}
        trailColor="transparent"
      />
    ) : null
    const filename = uploadFile?.file ? uploadFile?.file?.name : file?.fileName

    const buttons = []
    if (!uploadFile?.file) {
      if (actions?.includes('preview')) {
        buttons.push(() => (
          <Button className="file-item__link" type="link">
            预览
          </Button>
        ))
      }
      if (actions?.includes('download')) {
        buttons.push(() => (
          <Button
            className="file-item__link"
            loading={file.downloading}
            onClick={() => onDownFile((item as FileModel).fileNo)}
            type="link"
          >
            下载
          </Button>
        ))
      }
      if (actions?.includes('remove')) {
        buttons.push(() => (
          <Button
            className="file-item__link"
            onClick={() => onRemoveFile(item as FileModel)}
            type="link"
          >
            删除
          </Button>
        ))
      }
    }

    return (
      <div className="upload-file__item" key={uploadFile?.file ? uploadFile?.localId : file.fileNo}>
        <Typography.Text className="file-item__name" ellipsis={{ tooltip: filename }}>
          {filename}
        </Typography.Text>
        {progress}
        {buttons?.map((Button, index) => <Button key={index} />)}
      </div>
    )
  }

  return (
    <div className="upload-file">
      <div className="upload-file__container">
        {draggerable ? (
          <Dragger
            {...uploadProps}
            accept={accept?.toString()}
            beforeUpload={onBeforeUpload}
            showUploadList={false}
          >
            {children}
          </Dragger>
        ) : (
          <Upload
            {...uploadProps}
            accept={accept?.toString()}
            beforeUpload={onBeforeUpload}
            showUploadList={false}
          >
            {children}
          </Upload>
        )}
        {tips ? (
          <Typography.Text className="upload-file__tips" ellipsis={{ tooltip: tips }}>
            {tips}
          </Typography.Text>
        ) : null}
      </div>
      {hideUploadList ? null : (
        <div className="upload-file__list">
          {fileList?.map(renderFileItem)}
          {uploadTasks?.map(renderFileItem)}
        </div>
      )}
    </div>
  )
}

export default UploadFile
