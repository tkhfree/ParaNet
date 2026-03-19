import styles from './index.module.less'

import { UploadOutlined } from '@ant-design/icons'
import { Button, Image, Upload, UploadProps } from 'antd'
import React, { useMemo, useState } from 'react'

import { message } from '@/App'
import { uploadImage } from '@/api/element'

interface IFile {
  name: string
  path: string
}

interface IProps extends UploadProps {
  accept: string
  desc?: string
  value?: IFile[]
  maxCount: number
  maxSize?: number
  onChange?: (v: any) => void
  onSuccessUpload?: (v: any) => void
}
const Index = (props: IProps) => {
  const {
    desc = '仅限png/svg格式图片文件',
    value = [],
    maxCount = 10,
    maxSize = 1024 * 1024 * 200,
    onChange: onMyChange,
  } = props

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')

  const beforeUpload = (file: File) => {
    if (file.size > maxSize) {
      message.warning(`最大支持上传文件为${maxSize / (1024 * 1024)}MB`)
      return false
    }
    let fileType: any = file.name
    fileType = fileType?.split('.')?.pop()
    if (!props.accept?.includes(fileType)) {
      message.warning(`只能上传${props.accept}格式的文件`)
      return false
    }
    console.log(value)
    if (value.length >= maxCount) {
      message.warning('上传数量已达限制')
      return false
    }
    return true
  }
  const customRequest: UploadProps['customRequest'] = async v => {
    const { data } = await uploadImage(v.file as File)

    props?.onSuccessUpload?.(data)

    const arr = [{ name: data.pictureName, url: data.picturePath }]

    onMyChange?.([...value, ...arr])
  }

  const onRemove = (e: any) => {
    onMyChange?.(fileList.filter(i => i.url !== e.url))
  }

  const handlePreview = async (file: any) => {
    setPreviewImage(file.url || (file.preview as string))
    setPreviewOpen(true)
  }

  const fileList = useMemo(
    () => value.map(item => ({ name: item.name, url: item.path, uid: item.path })),
    [value],
  )

  return (
    <>
      <Upload
        accept={props?.accept ?? ''}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        fileList={fileList}
        onPreview={handlePreview}
        onRemove={onRemove}
      >
        <div>
          <Button className={styles.uploadButton} icon={<UploadOutlined />}>
            上传文件
          </Button>
          <span className={styles.tip}>{desc}</span>
        </div>
      </Upload>
      {previewImage && (
        <Image
          preview={{
            visible: previewOpen,
            onVisibleChange: visible => setPreviewOpen(visible),
            afterOpenChange: visible => !visible && setPreviewImage(''),
          }}
          src={previewImage}
          wrapperStyle={{ display: 'none' }}
        />
      )}
    </>
  )
}

export default Index
