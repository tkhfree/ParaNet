import { Button, Form, Input, Modal, Select, Tree, Upload, UploadProps, message } from 'antd'
import React, { useState } from 'react'
import styles from './index.module.less'
import { UploadOutlined } from '@ant-design/icons'
import type { GetProp, UploadFile } from 'antd'
import { upload } from '@/api/file'
import { useRequest } from 'ahooks'

const Index = (props: any) => {
  const { projectId, onSubmit, ...modalProps } = props ?? {}
  const [form] = Form.useForm()
  const { run } = useRequest(upload, {
    manual: true,
    onSuccess: () => {
      message.success('操作成功')
      onSubmit()
    },
  })
  const onOk = (values: any) => {
    run({ file: values?.file?.file, projectId })
  }
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const params: UploadProps = {
    onRemove: file => {
      const index = fileList.indexOf(file)
      const newFileList = fileList.slice()
      newFileList.splice(index, 1)
      setFileList(newFileList)
    },
    beforeUpload: file => {
      if (fileList.length >= 1) {
        message.warning('最多只能上传一个文件')
        return false
      }
      setFileList([...fileList, file])
      return false
    },
    fileList,
    accept: '.zip',
  }
  return (
    <Modal
      {...modalProps}
      onOk={() => form.submit()}
      destroyOnClose={true}
      className={styles['fileModal']}
      afterClose={() => {
        form.resetFields()
        setFileList([])
      }}
    >
      <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} onFinish={onOk}>
        <Form.Item name="file" label="导入文件" rules={[{ required: true, message: '请上传文件' }]}>
          <Upload {...params}>
            <Button icon={<UploadOutlined />}>点击上传附件</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default Index
