import { imagePreview } from '@/api/v1/sys/file'
import { useUpdateEffect } from 'ahooks'
import { Image, ImageProps } from 'antd'
import React, { useState } from 'react'

type ProImgaeProps = ImageProps & {
  /** 文件编号 每个文件都唯一，对外下载使用 */
  fileNo?: string
}
const ProImage = (props: ProImgaeProps) => {
  const { fileNo, ...rest } = props
  const [src, setSrc] = useState<string>()

  const getSrc = async () => {
    const { data } = await imagePreview({ fileNo })
    if (data instanceof Blob) {
      const dataUrl = window.URL.createObjectURL(data)
      setSrc(dataUrl)
    }
  }
  useUpdateEffect(() => {
    if (fileNo) {
      getSrc()
    }
  }, [fileNo])
  return <Image placeholder {...rest} src={src} />
}

export default ProImage
