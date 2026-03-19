import { Form, Input, Modal, Select, Tree, TreeSelect, message } from 'antd'
import React, { useMemo, useState } from 'react'
import styles from './index.module.less'
import ProTreeSelect from '@/components/ProTreeSelect'
import { useRequest } from 'ahooks'
import { moveFile } from '@/api/file'

const Index = (props: any) => {
  const { treeData, fileId, projectId, ...modalProps } = props ?? {}
  const [form] = Form.useForm()
  const { run } = useRequest(moveFile, {
    manual: true,
    onSuccess(res) {
      message.success('操作成功')
      modalProps.onOk()
    },
  })
  const data = JSON.parse(JSON.stringify(treeData))
  function filterTree(tree: any) {
    return tree.filter((node: any) => {
      // 如果当前节点的 type 是 "2" 或 "3"，则过滤掉
      if (!['0', '1'].includes(node.type)) {
        return false
      }
      // 强制设置 disabled 为 false
      node.disabled = false
      // 如果有子节点，递归处理子节点
      if (node.children && node.children.length) {
        node.children = filterTree(node.children)
      }

      return true
    })
  }
  const onOk = (values: any) => {
    run({ fileId: fileId, parentId: values.parentId == projectId ? undefined : values.parentId })
  }
  return (
    <Modal
      {...modalProps}
      onOk={() => form.submit()}
      destroyOnClose={true}
      className={styles['moveModal']}
      afterClose={() => {
        form.resetFields()
      }}
    >
      <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} onFinish={onOk}>
        <Form.Item name="parentId" label="移动至" required>
          <ProTreeSelect
            fieldNames={{
              label: 'title',
              value: 'key',
            }}
            treeData={filterTree(data)}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default Index
