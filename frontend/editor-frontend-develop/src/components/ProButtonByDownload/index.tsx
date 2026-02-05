import { message } from '@/App'
import { fileDownload } from '@/api/v1/sys/file'
import { useRequest } from 'ahooks'
import { Button, ButtonProps } from 'antd'
import React from 'react'

export type ProButtonByDownloadProps = ButtonProps & {
  fileNo: string[]
}

/** 下载 */
const ProButtonByDownload = (props: ProButtonByDownloadProps) => {
  const { fileNo, children, ...rest } = props
  const { loading, run } = useRequest(fileDownload, {
    manual: true,
    onSuccess: () => {
      if (typeof children === 'string') {
        message.success(`${children}成功`)
      } else {
        message.success('下载成功')
      }
    },
  })
  return (
    <Button {...rest} loading={loading} disabled={!fileNo.length} onClick={() => run(fileNo)}>
      {children}
    </Button>
  )
}

export default ProButtonByDownload
