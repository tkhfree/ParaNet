import React, { useState } from 'react'
import { Input, Button, Spin } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { intentApi } from '@/api/intent'
import styles from './index.module.less'

const { TextArea } = Input

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  dslCode?: string
  explanation?: string
  suggestions?: string[]
}

export interface ChatInputProps {
  onApplyDSL?: (dslCode: string) => void
  topologyId?: string
  disabled?: boolean
  className?: string
}

const ChatInput: React.FC<ChatInputProps> = ({
  onApplyDSL,
  topologyId,
  disabled = false,
  className,
}) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await intentApi.translateNaturalLanguage({
        input: text,
        context: topologyId ? { topologyId } : undefined,
      })
      const data = res.data
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.dslCode,
        dslCode: data.dslCode,
        explanation: data.explanation,
        suggestions: data.suggestions,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      const errMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '无法连接意图翻译服务，请检查网络或稍后重试。',
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleApply = (dslCode: string) => {
    onApplyDSL?.(dslCode)
  }

  return (
    <div className={`${styles.chatInput} ${className ?? ''}`}>
      <div className={styles.messages}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.message} ${msg.role}`}>
            <div className={styles.label}>
              {msg.role === 'user' ? '自然语言' : '生成的 DSL'}
            </div>
            {msg.role === 'user' ? (
              <div className={styles.explanation}>{msg.content}</div>
            ) : (
              <>
                {msg.explanation && (
                  <div className={styles.explanation}>{msg.explanation}</div>
                )}
                {msg.dslCode && (
                  <>
                    <pre>{msg.dslCode}</pre>
                    {onApplyDSL && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleApply(msg.dslCode!)}
                      >
                        应用到编辑器
                      </Button>
                    )}
                  </>
                )}
                {!msg.dslCode && <div className={styles.explanation}>{msg.content}</div>}
              </>
            )}
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.assistant}`} style={{ marginLeft: 8 }}>
            <Spin size="small" /> 正在生成 DSL…
          </div>
        )}
      </div>
      <div className={styles.inputRow}>
        <TextArea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="用自然语言描述网络意图，例如：让 192.168.1.0 网段通过 core-1 访问 10.0.0.0 网段"
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={disabled}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!input.trim() || disabled}
          className={styles.sendBtn}
        >
          发送
        </Button>
      </div>
    </div>
  )
}

export default ChatInput
