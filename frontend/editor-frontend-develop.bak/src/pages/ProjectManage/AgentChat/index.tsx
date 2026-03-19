import styles from './index.module.less'

import { DeleteOutlined, RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Empty, Input, Typography } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { streamChatMessage } from '@/api/chat'

interface IProps {
  currentFileContent?: string
  currentFileId?: number | string
  currentFileName?: string
  projectId?: number | string
  projectName?: string
}

interface MessageItem {
  builtin?: boolean
  content: string
  id: string
  role: 'assistant' | 'tool' | 'user'
}

const quickActions = [
  '帮我解释当前文件的作用',
  '帮我设计一个新功能的前端实现思路',
  '我想给当前页面新增一个按钮，先告诉我改哪里',
]

const buildWelcomeMessage = (projectName?: string): MessageItem => {
  const prefix = projectName ? `当前项目是「${projectName}」。` : '你还没有选择项目。'

  return {
    builtin: true,
    content: `${prefix} 智能体对话现在会先请求本地后端，再由后端调用智谱大模型。你可以直接提问当前项目或当前文件相关的问题。`,
    id: 'welcome',
    role: 'assistant',
  }
}

const getErrorText = (error: unknown) => {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = Reflect.get(error, 'message')
    if (typeof message === 'string') return message
    const msg = Reflect.get(error, 'msg')
    if (typeof msg === 'string') return msg
  }
  return '对话请求失败，请检查后端服务和 llm-config.properties 配置'
}

export const AgentChat = (props: IProps) => {
  const { currentFileContent, currentFileId, currentFileName, projectId, projectName } = props
  const [inputValue, setInputValue] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([buildWelcomeMessage(projectName)])
  const controllerRef = useRef<AbortController | null>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)

  const currentStatus = useMemo(() => {
    if (projectName && currentFileName) {
      return `${projectName} / ${currentFileName}`
    }
    if (projectName) {
      return projectName
    }
    return '未选择项目'
  }, [currentFileName, projectName])

  useEffect(() => {
    setMessages([buildWelcomeMessage(projectName)])
    setInputValue('')
  }, [projectName])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isReplying])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  const sendMessage = async (value?: string) => {
    const content = (value ?? inputValue).trim()
    if (!content || isReplying) return

    controllerRef.current?.abort()
    const abortController = new AbortController()
    controllerRef.current = abortController

    const userMessage: MessageItem = {
      content,
      id: `${Date.now()}-user`,
      role: 'user',
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsReplying(true)

    const requestMessages = [...messages.filter(item => !item.builtin), userMessage].map(item => ({
      content: item.content,
      role: item.role === 'tool' ? 'assistant' : item.role,
    }))
    const assistantMessageId = `${Date.now()}-assistant-stream`

    setMessages(prev => [
      ...prev,
      {
        content: '',
        id: assistantMessageId,
        role: 'assistant',
      },
    ])

    try {
      await streamChatMessage(
        {
          currentFileContent,
          currentFileId,
          currentFileName,
          messages: requestMessages,
          projectId,
          projectName,
        },
        {
          onDelta: payload => {
            setMessages(prev =>
              prev.map(item =>
                item.id === assistantMessageId
                  ? { ...item, content: `${item.content}${payload.content ?? ''}` }
                  : item,
              ),
            )
          },
          onDone: payload => {
            if (!payload.content) return
            setMessages(prev =>
              prev.map(item =>
                item.id === assistantMessageId ? { ...item, content: payload.content ?? '' } : item,
              ),
            )
          },
          onError: payload => {
            setMessages(prev =>
              prev.map(item =>
                item.id === assistantMessageId
                  ? {
                      ...item,
                      content:
                        payload.message ??
                        payload.content ??
                        '对话请求失败，请检查后端服务和 llm-config.properties 配置',
                    }
                  : item,
              ),
            )
          },
          onTool: payload => {
            const toolMessage = payload.message ?? payload.content ?? ''
            if (!toolMessage) return
            setMessages(prev => {
              const lastItem = prev[prev.length - 1]
              if (lastItem?.role === 'tool') {
                return prev.map((item, index) =>
                  index === prev.length - 1
                    ? { ...item, content: `${item.content}\n${toolMessage}` }
                    : item,
                )
              }
              return [
                ...prev,
                {
                  content: toolMessage,
                  id: `${Date.now()}-tool`,
                  role: 'tool',
                },
              ]
            })
          },
        },
        abortController.signal,
      )
    } catch (error) {
      if (abortController.signal.aborted) {
        setMessages(prev =>
          prev.filter(item => !(item.id === assistantMessageId && !item.content.trim())),
        )
      } else {
        setMessages(prev =>
          prev.map(item =>
            item.id === assistantMessageId ? { ...item, content: getErrorText(error) } : item,
          ),
        )
      }
    } finally {
      setIsReplying(false)
      if (controllerRef.current === abortController) {
        controllerRef.current = null
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>智能体对话</div>
          <div className={styles.subtitle}>{currentStatus}</div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => {
            controllerRef.current?.abort()
            setIsReplying(false)
            setInputValue('')
            setMessages([buildWelcomeMessage(projectName)])
          }}
        >
          清空
        </Button>
      </div>

      <div className={styles.tip}>
        对话会流式发给本地后端，并结合当前项目文件树与当前文件内容调用智谱模型。
      </div>

      <div className={styles.quickActions}>
        {quickActions.map(action => (
          <button
            key={action}
            className={styles.quickAction}
            type="button"
            onClick={() => sendMessage(action)}
          >
            {action}
          </button>
        ))}
      </div>

      <div className={styles.messages}>
        {messages.length ? (
          messages.map(item => (
            <div
              key={item.id}
              className={`${styles.messageItem} ${
                item.role === 'assistant'
                  ? styles.assistant
                  : item.role === 'tool'
                    ? styles.tool
                    : styles.user
              }`}
            >
              <div className={styles.avatar}>
                {item.role === 'assistant' || item.role === 'tool' ? (
                  <RobotOutlined />
                ) : (
                  <UserOutlined />
                )}
              </div>
              <div className={styles.bubble}>
                {item.content ? (
                  <Typography.Paragraph>{item.content}</Typography.Paragraph>
                ) : (
                  <span className={styles.loadingText}>等待模型开始输出...</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            <Empty description="暂无消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )}
        <div ref={messageEndRef}></div>
      </div>

      <div className={styles.footer}>
        <Input.TextArea
          value={inputValue}
          placeholder="输入你的问题，例如：帮我说明这个页面该怎么接入真实 AI 接口"
          autoSize={{ minRows: 3, maxRows: 6 }}
          onChange={e => setInputValue(e.target.value)}
          onPressEnter={e => {
            if (!e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={() => sendMessage()}>
          发送
        </Button>
      </div>
    </div>
  )
}

export default AgentChat
