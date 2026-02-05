import React, { useState } from 'react'
import { Form, Input, Button, Card, message, Space } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import type { LoginRequest } from '@/model/user'
import useUserStore from '@/stores/user'
import styles from './index.module.less'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  
  const login = useUserStore((state) => state.login)

  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const handleSubmit = async (values: LoginRequest) => {
    setLoading(true)
    try {
      const success = await login(values)
      if (success) {
        message.success('登录成功！')
        navigate(from, { replace: true })
      } else {
        message.error('登录失败，请检查用户名和密码')
      }
    } catch (error) {
      // 开发模式：如果后端未启动，使用模拟登录
      if (import.meta.env.DEV) {
        message.warning('后端服务未连接，使用开发模式登录')
        const mockUser = {
          id: 'dev-user-1',
          username: values.username,
          email: `${values.username}@paranet.dev`,
          role: 'admin' as const,
          permissions: ['*'],
          createdAt: new Date().toISOString(),
        }
        const mockToken = 'dev-mock-token-' + Date.now()
        
        localStorage.setItem('paranet_token', mockToken)
        localStorage.setItem('paranet_user', JSON.stringify(mockUser))
        
        // 刷新页面以重新初始化状态
        window.location.href = from
      } else {
        message.error('登录失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.top}>
          <div className={styles.header}>
            <span className={styles.title}>ParaNet</span>
          </div>
          <div className={styles.desc}>意图驱动网络管理平台</div>
        </div>

        <Card className={styles.card}>
          <Form
            name="login"
            onFinish={handleSubmit}
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.tips}>
            <Space direction="vertical" size={4}>
              <div>默认账号：admin / admin123</div>
              <div>演示账号：demo / demo123</div>
            </Space>
          </div>
        </Card>

        <div className={styles.footer}>
          © 2024 ParaNet. All rights reserved.
        </div>
      </div>
    </div>
  )
}

export default Login
