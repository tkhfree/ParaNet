import { Form, Input, Modal, Select, Tree } from 'antd'
import React, { useEffect } from 'react'
import styles from './index.module.less'
import { useRequest } from 'ahooks'
import { addProject, getProjectDetail, updateProject } from '@/api/project'
import { addFile, renameFile } from '@/api/file'

const Index = (props: any) => {
  // type 1项目 2文件夹 3文件 4重命名
  const { setConfirmLoading, type, fileId = '', projectId, oldName, ...modalProps } = props ?? {}
  const [form] = Form.useForm()
  const { run: addProjectFunc } = useRequest(addProject, {
    manual: true,
    onSuccess: () => {
      props?.onSubmit()
    },
  })
  const { run: updateProjectFunc } = useRequest(updateProject, {
    manual: true,
    onSuccess: () => {
      props?.onSubmit()
    },
  })
  const { run: getProjectDetailFunc } = useRequest(getProjectDetail, {
    manual: true,
    onSuccess: res => {
      form.setFieldsValue({
        name: res.data.name,
        remark: res.data.remark,
      })
    },
  })
  const { run: addFileFunc } = useRequest(addFile, {
    manual: true,
    onSuccess: () => {
      props?.onSubmit()
    },
  })
  const { run: renameFileFunc } = useRequest(renameFile, {
    manual: true,
    onSuccess: () => {
      props?.onSubmit()
    },
  })
  useEffect(() => {
    if (modalProps.open) {
      if (type == '1' && fileId) {
        console.log(fileId)
        getProjectDetailFunc(fileId)
      }
      if (type == '4' && oldName) {
        form.setFieldsValue({
          fileName: oldName,
        })
      }
    }
  }, [modalProps.open, fileId, type, oldName, form, getProjectDetailFunc])
  const onOk = (values: any) => {
    if (type == '1') {
      fileId ? updateProjectFunc({ ...values, id: fileId }) : addProjectFunc(values)
      return
    }
    if (['2', '3'].includes(type)) {
      addFileFunc({
        projectId,
        ...values,
        parentId: projectId == fileId ? '' : fileId,
        isFolder: type == '2' ? 1 : 0,
        content: '',
      })
      return
    }
    renameFileFunc({
      fileId,
      ...values,
    })
  }
  return (
    <Modal
      {...modalProps}
      onOk={() => {
        form.submit()
      }}
      destroyOnClose={true}
      className={styles['addFileModal']}
      afterClose={() => {
        form.resetFields()
      }}
    >
      <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} onFinish={onOk}>
        {type == '1' && (
          <>
            <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入' }]}>
              <Input placeholder="请输入" allowClear maxLength={30} />
            </Form.Item>
            <Form.Item name="remark" label="其他信息">
              <Input placeholder="请输入" allowClear />
            </Form.Item>
          </>
        )}
        {type == '2' && (
          <>
            <Form.Item name="fileName" label="文件夹名称">
              <Input placeholder="请输入" allowClear maxLength={30} />
            </Form.Item>
          </>
        )}
        {type == '3' && (
          <>
            <Form.Item name="fileType" label="文件类型">
              <Select
                placeholder="请选择"
                options={[
                  { label: '模态文件', value: '1' },
                  { label: '拓扑文件', value: '0' },
                  { label: 'P4', value: '4' },
                  { label: 'Domain', value: '5' },
                  { label: '其他文件', value: '2' },
                ]}
              />
            </Form.Item>
            <Form.Item name="fileName" label="文件名称">
              <Input placeholder="请输入" allowClear maxLength={30} />
            </Form.Item>
          </>
        )}
        {type == '4' && (
          <>
            <Form.Item name="fileName" label="文件/文件夹名称">
              <Input placeholder="请输入" allowClear maxLength={30} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}

export default Index
