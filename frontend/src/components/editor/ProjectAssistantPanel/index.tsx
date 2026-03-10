import {
  DeleteOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Button, Empty, Input, Tag, Typography } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { agentApi } from '@/api/agent'
import useWorkspaceStore, { getWorkspaceContextSnapshot } from '@/stores/workspace'

import styles from './index.module.less'

interface AssistantMessage {
  builtin?: boolean
  content: string
  id: string
  role: 'assistant' | 'tool' | 'user'
}

interface ProjectAssistantPanelProps {
  topologyId?: string
}

const quickActions = [
  '帮我解释当前文件的作用',
  '帮我分析这个项目里与意图编程最相关的文件',
  '请先分析当前上下文，再告诉我 DSL 应该怎么写',
]

const buildWelcomeMessage = (projectName?: string): AssistantMessage => ({
  builtin: true,
  content: projectName
    ? `当前项目是「${projectName}」。你可以直接询问当前文件、项目结构或让智能体先分析再给出修改建议。`
    : '当前还没有从项目工作台选择项目。你仍可提一般性问题，但建议先进入“项目工作台”选择项目和文件。',
  id: 'welcome',
  role: 'assistant',
})

const getErrorText = (error: unknown) => {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = Reflect.get(error, 'message')
    if (typeof message === 'string') return message
  }
  return '智能体请求失败，请检查后端服务或后续接入新的 Agent 接口'
}

const ProjectAssistantPanel: React.FC<ProjectAssistantPanelProps> = ({ topologyId }) => {
  const { activeTabId, openTabs, projects, selectedProjectId } = useWorkspaceStore()
  const context = useMemo(
    () =>
      getWorkspaceContextSnapshot({
        activeTabId,
        openTabs,
        projects,
        selectedProjectId,
      }),
    [activeTabId, openTabs, projects, selectedProjectId],
  )

  const [inputValue, setInputValue] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([
    buildWelcomeMessage(context.projectName),
  ])
  const controllerRef = useRef<AbortController | null>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([buildWelcomeMessage(context.projectName)])
    setInputValue('')
  }, [context.projectName])

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

    const userMessage: AssistantMessage = {
      content,
      id: `${Date.now()}-user`,
      role: 'user',
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsReplying(true)

    const requestMessages = [...messages.filter((item) => !item.builtin), userMessage].map((item) => ({
      content: item.content,
      role: item.role === 'tool' ? 'assistant' : item.role,
    }))

    const assistantMessageId = `${Date.now()}-assistant`
    setMessages((prev) => [
      ...prev,
      {
        content: '',
        id: assistantMessageId,
        role: 'assistant',
      },
    ])

    try {
      await agentApi.streamProjectAssistant(
        {
          currentFileContent: context.currentFileContent,
          currentFileId: context.currentFileId,
          currentFileName: context.currentFileName,
          messages: requestMessages,
          projectId: context.projectId,
          projectName: context.projectName,
          topologyId,
        },
        {
          onDelta: (payload) => {
            setMessages((prev) =>
              prev.map((item) =>
                item.id === assistantMessageId
                  ? { ...item, content: `${item.content}${payload.content ?? ''}` }
                  : item,
              ),
            )
          },
          onDone: (payload) => {
            if (!payload.content) return
            setMessages((prev) =>
              prev.map((item) =>
                item.id === assistantMessageId ? { ...item, content: payload.content ?? '' } : item,
              ),
            )
          },
          onError: (payload) => {
            setMessages((prev) =>
              prev.map((item) =>
                item.id === assistantMessageId
                  ? {
                      ...item,
                      content:
                        payload.message ?? payload.content ?? '智能体请求失败，请稍后重试',
                    }
                  : item,
              ),
            )
          },
          onTool: (payload) => {
            const toolMessage = payload.message ?? payload.content ?? ''
            if (!toolMessage) return
            setMessages((prev) => [
              ...prev,
              {
                content: toolMessage,
                id: `${Date.now()}-tool`,
                role: 'tool',
              },
            ])
          },
        },
        abortController.signal,
      )
    } catch (error) {
      if (!abortController.signal.aborted) {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === assistantMessageId ? { ...item, content: getErrorText(error) } : item,
          ),
        )
      } else {
        setMessages((prev) =>
          prev.filter((item) => !(item.id === assistantMessageId && !item.content.trim())),
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
    <div className={styles.panel}>
      <div className={styles.contextBar}>
        <Tag className={styles.contextTag} color={context.projectId ? 'blue' : 'default'}>
          项目：{context.projectName ?? '未选择'}
        </Tag>
        <Tag className={styles.contextTag} color={context.currentFileId ? 'purple' : 'default'}>
          文件：{context.currentFileName ?? '未打开'}
        </Tag>
        {topologyId && <Tag className={styles.contextTag}>拓扑：{topologyId}</Tag>}
      </div>

      <div className={styles.tip}>
        上下文会自动来自“项目工作台”当前选中的项目和活动文件，后续将切到新的 ParaNet Agent 接口。
      </div>

      <div className={styles.contextBar}>
        {quickActions.map((action) => (
          <Button key={action} size="small" onClick={() => sendMessage(action)}>
            {action}
          </Button>
        ))}
        <Button
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => {
            controllerRef.current?.abort()
            setMessages([buildWelcomeMessage(context.projectName)])
            setInputValue('')
            setIsReplying(false)
          }}
        >
          清空
        </Button>
      </div>

      <div className={styles.messages}>
        {messages.length ? (
          messages.map((item) => (
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
                  <Typography.Paragraph style={{ marginBottom: 0 }}>
                    {item.content}
                  </Typography.Paragraph>
                ) : (
                  <span className={styles.loadingText}>等待模型开始输出...</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <Empty description="暂无消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
        <div ref={messageEndRef} />
      </div>

      <div className={styles.footer}>
        <Input.TextArea
          className={styles.textarea}
          value={inputValue}
          placeholder="输入你的问题，例如：请结合当前文件告诉我接入真实 Agent 接口要改哪里"
          autoSize={{ minRows: 3, maxRows: 6 }}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={isReplying}
          onClick={() => sendMessage()}
        >
          发送
        </Button>
      </div>
    </div>
  )
}

export default ProjectAssistantPanel
