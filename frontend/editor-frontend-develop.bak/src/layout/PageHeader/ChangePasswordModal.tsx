import { logout } from '@/api/v1/sys'
import { updateUserPassword } from '@/api/v1/system'
import userInfoStore from '@/stores/user'
import storage, { TOKEN } from '@/utils/storage'
import { getPasswordRuleMsg } from '@/utils/tools'
import { useAsyncEffect } from 'ahooks'
import { Form, Input, Modal, Spin, message } from 'antd'
import type { ModalProps } from 'antd'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/shallow'

export interface ChangePasswordModalProps extends ModalProps {
  setConfirmLoading: React.Dispatch<React.SetStateAction<boolean>>
}

const ChangePasswordModal = (props: ChangePasswordModalProps) => {
  const { setConfirmLoading, ...modalProps } = props ?? {}
  const navigate = useNavigate()
  const [clearUserInfo] = userInfoStore(useShallow(state => [state.clear]))
  const [pwdTooltip, setPwdTooltip] = useState('')
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const rules = {
    oldPassword: [{ required: true, message: '请输入原密码' }],
    newPassword: [{ required: true, message: '请输入新密码' }],
    againPassword: [
      {
        validator: (_: unknown, value: string) => {
          if (!value) {
            return Promise.reject('请输入新密码')
          }
          const newPassword = form.getFieldValue('newPassword')
          if (newPassword !== value) {
            return Promise.reject('重复新密码和新密码不一致')
          }
          return Promise.resolve()
        },
      },
    ],
  }

  const onOk = async (e: any) => {
    const values = await form.validateFields()
    setConfirmLoading?.(true)
    const payload = { ...values, againPassword: undefined }
    await updateUserPassword(payload)
      .then(async (res: any) => {
        message.success(res.msg)
        modalProps?.onCancel?.(e)
        await logout()
        clearUserInfo()
        storage.remove(TOKEN)
        navigate('/login')
      })
      .catch(error => console.log(error))
      .finally(() => {
        setConfirmLoading?.(false)
      })
  }

  useAsyncEffect(async () => {
    if (modalProps?.open) {
      try {
        setLoading(true)
        const [ruleMsg] = await getPasswordRuleMsg()
        setPwdTooltip(ruleMsg)
      } finally {
        setLoading(false)
      }
    }
  }, [modalProps?.open])

  return (
    <Modal {...modalProps} onOk={onOk} destroyOnClose={true}>
      <Spin spinning={loading}>
        <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} preserve={false}>
          <Form.Item name="oldPassword" label="原密码" rules={rules?.oldPassword}>
            <Input.Password placeholder="请输入原密码" allowClear />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            tooltip={pwdTooltip}
            rules={rules?.newPassword}
          >
            <Input.Password placeholder="请输入新密码" allowClear />
          </Form.Item>
          <Form.Item
            name="againPassword"
            dependencies={['newPassword']}
            required
            label="重复新密码"
            rules={rules?.againPassword}
          >
            <Input.Password placeholder="请输入新密码" allowClear />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  )
}

export default ChangePasswordModal
