import React, { useRef, useState } from 'react'
import { Button, Spin } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  StopOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  WarningOutlined,
  FlagOutlined,
} from '@ant-design/icons'
import { agentChatStream, type AgentAction, type AgentStep } from '@/api/agent'
import styles from './index.module.less'

/** Extended step type supporting new event-driven format */
type StepKind = 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'finish' | 'legacy'

interface ToolStep {
  toolName: string
  status: 'running' | 'success' | 'error'
  result?: unknown
  /** New: step kind from the event-driven format */
  kind?: StepKind
  /** New: output text for tool_result / thinking / finish steps */
  output?: string
  /** New: error message for error steps */
  errorMessage?: string
  /** New: duration in milliseconds */
  duration_ms?: number
}

/** Returns an icon element based on the step kind */
function getStepIcon(step: ToolStep): React.ReactNode {
  switch (step.kind) {
    case 'thinking':
      return <BulbOutlined />
    case 'tool_call':
      return <ThunderboltOutlined />
    case 'tool_result':
      return step.status === 'error' ? <CloseCircleOutlined /> : <CodeOutlined />
    case 'error':
      return <WarningOutlined />
    case 'finish':
      return <FlagOutlined />
    default:
      // Legacy rendering
      if (step.status === 'running') return <Spin size="small" />
      if (step.status === 'success') return <CheckCircleOutlined />
      return <CloseCircleOutlined />
  }
}

/** Returns a human-readable label based on the step kind */
function getStepLabel(step: ToolStep): string {
  const displayName = TOOL_DISPLAY_NAMES[step.toolName] || step.toolName
  switch (step.kind) {
    case 'thinking':
      return '正在思考...'
    case 'tool_call':
      return `调用工具: ${displayName}`
    case 'tool_result': {
      const duration = step.duration_ms ? ` (${step.duration_ms}ms)` : ''
      return `${displayName}${duration}`
    }
    case 'error':
      return step.errorMessage || '发生错误'
    case 'finish':
      return '完成'
    default:
      return displayName
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  dslCode?: string
  explanation?: string
  suggestions?: string[]
  steps?: ToolStep[]
  actions?: AgentAction[]
}

export interface ChatInputProps {
  onApplyDSL?: (dslCode: string) => void
  topologyId?: string
  projectId?: string
  disabled?: boolean
  className?: string
  onTopologyUpdated?: () => void
  onFilesUpdated?: () => void
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  list_topologies: '查询拓扑列表',
  get_topology: '获取拓扑详情',
  add_topology_node: '添加拓扑节点',
  add_topology_link: '添加拓扑链路',
  remove_topology_node: '删除拓扑节点',
  create_topology: '创建拓扑',
  list_files: '查询文件列表',
  read_file: '读取文件',
  create_file: '创建文件',
  write_file: '写入文件',
  generate_dsl: '生成 DSL',
  compile_preview: '编译预览',
  save_deploy_artifacts: '保存部署产物',
}

/** Renders a single step row with type-aware icon, label, and optional collapsible output */
const StepRow: React.FC<{ step: ToolStep }> = ({ step }) => {
  const [expanded, setExpanded] = useState(false)

  // Determine CSS class based on kind and status
  const statusClass = step.kind === 'thinking' ? 'thinking' : step.status

  // Check if there is output to preview
  const hasOutput = !!step.output

  return (
    <div className={`${styles.toolStep} ${statusClass}`}>
      <span className={styles.toolIcon}>{getStepIcon(step)}</span>
      <span className={styles.toolName}>{getStepLabel(step)}</span>
      {hasOutput && (
        <span
          className={styles.outputToggle}
          onClick={() => setExpanded((v) => !v)}
          role="button"
          tabIndex={0}
        >
          {expanded ? '收起' : '详情'}
        </span>
      )}
      {hasOutput && expanded && (
        <div className={styles.outputPreview}>
          <pre>{step.output}</pre>
        </div>
      )}
    </div>
  )
}

const ChatInput: React.FC<ChatInputProps> = ({
  onApplyDSL,
  topologyId,
  projectId,
  disabled = false,
  className,
  onTopologyUpdated,
  onFilesUpdated,
}) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const handleActions = (actions: AgentAction[]) => {
    for (const action of actions) {
      switch (action.type) {
        case 'refresh_topology':
          onTopologyUpdated?.()
          break
        case 'refresh_files':
          onFilesUpdated?.()
          break
        case 'apply_dsl':
          if (action.payload?.dslCode && onApplyDSL) {
            onApplyDSL(action.payload.dslCode as string)
          }
          break
      }
    }
  }

  const handleSend = () => {
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

    const assistantMsgId = `assistant-${Date.now()}`
    const initialAssistant: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      steps: [],
      actions: [],
    }
    setMessages((prev) => [...prev, initialAssistant])

    // Build conversation history from existing messages (exclude current user message)
    const history = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const controller = agentChatStream(
      {
        message: text,
        topologyId,
        projectId,
        conversationHistory: history,
      },
      {
        onStep: (step: AgentStep) => {
          setMessages((prev) => {
            const updated = [...prev]
            const idx = updated.findIndex((m) => m.id === assistantMsgId)
            if (idx < 0) return prev
            const msg = { ...updated[idx] }
            const steps = [...(msg.steps || [])]
            const toolKey = step.tool || step.toolName

            if (step.type === 'thinking') {
              steps.push({
                toolName: 'thinking',
                status: 'running',
                kind: 'thinking',
                output: step.output,
                duration_ms: step.duration_ms,
              })
            } else if (step.type === 'tool_call') {
              steps.push({
                toolName: toolKey,
                status: 'running',
                kind: 'tool_call',
              })
            } else if (step.type === 'tool_result') {
              const existing = steps.findIndex(
                (s) => s.toolName === toolKey && s.status === 'running',
              )
              const resultStep: ToolStep = {
                toolName: toolKey,
                status: step.success ? 'success' : 'error',
                kind: 'tool_result',
                result: step.result,
                output: step.output,
                duration_ms: step.duration_ms,
              }
              if (existing >= 0) {
                steps[existing] = { ...steps[existing], ...resultStep }
              } else {
                steps.push(resultStep)
              }
            } else if (step.type === 'error') {
              steps.push({
                toolName: 'error',
                status: 'error',
                kind: 'error',
                errorMessage: step.error,
              })
            } else if (step.type === 'finish') {
              steps.push({
                toolName: 'finish',
                status: 'success',
                kind: 'finish',
                output: step.output,
                duration_ms: step.duration_ms,
              })
            } else if (step.type === undefined) {
              // Legacy: no type field — fall back to old toolName/stepIndex logic
              if (step.toolName) {
                steps.push({
                  toolName: step.toolName,
                  status: 'running',
                  kind: 'legacy',
                })
              }
            }

            msg.steps = steps
            updated[idx] = msg
            return updated
          })
        },
        onMessage: (content: string, actions: AgentAction[]) => {
          setMessages((prev) => {
            const updated = [...prev]
            const idx = updated.findIndex((m) => m.id === assistantMsgId)
            if (idx < 0) return prev
            updated[idx] = {
              ...updated[idx],
              content,
              actions,
            }
            return updated
          })
          handleActions(actions)
        },
        onError: (err: Error) => {
          setMessages((prev) => {
            const updated = [...prev]
            const idx = updated.findIndex((m) => m.id === assistantMsgId)
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                content: `Agent 调用失败: ${err.message}`,
              }
            }
            return updated
          })
        },
        onDone: () => {
          setLoading(false)
        },
      },
    )
    abortRef.current = controller
  }

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setLoading(false)
  }

  const handleApply = (dslCode: string) => {
    onApplyDSL?.(dslCode)
  }

  return (
    <div className={`${styles.chatInput} ${className ?? ''}`}>
      <div className={styles.messages}>
        {messages.length === 0 && !loading && (
          <div className={styles.emptyHint}>
            <div className={styles.emptyHintTitle}>模态开发Agent已就绪</div>
            <div className={styles.emptyHintText}>
              直接输入网络协议目标、拓扑约束或代码生成需求，例如：
              <br />
              "画一个三个交换机节点的拓扑" 或 "让终端1使用ipv4模态通过核心交换机1连接终端2" 或 "创建一个IPv4路由器的PNE文件" 或 "创建一个ACL防火墙的PNE文件"
            </div>
            <div className={styles.toolList}>
              <div className={styles.toolListTitle}>可用工具</div>
              <div className={styles.toolListGrid}>
                {[
                  { group: '拓扑操作', tools: ['查询拓扑列表', '获取拓扑详情', '添加拓扑节点', '添加拓扑链路', '删除拓扑节点', '创建拓扑'] },
                  { group: '文件操作', tools: ['查询文件列表', '读取文件', '创建文件', '写入文件'] },
                  { group: '编译部署', tools: ['生成 DSL', '编译预览', '保存部署产物'] },
                ].map((cat) => (
                  <div key={cat.group} className={styles.toolGroup}>
                    <span className={styles.toolGroupLabel}>{cat.group}</span>
                    {cat.tools.map((t) => (
                      <span key={t} className={styles.toolTag}>{t}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.message} ${msg.role}`}>
            <div className={styles.label}>
              {msg.role === 'user' ? '模态开发指令' : 'Thinking'}
            </div>
            {msg.role === 'user' ? (
              <div className={styles.explanation}>{msg.content}</div>
            ) : (
              <>
                {/* Tool execution steps */}
                {msg.steps && msg.steps.length > 0 && (
                  <div className={styles.toolSteps}>
                    {msg.steps.map((step, i) => (
                      <StepRow key={i} step={step} />
                    ))}
                  </div>
                )}

                {/* Content / DSL / explanation */}
                {msg.content && !msg.dslCode && (
                  <div className={styles.explanation}>{msg.content}</div>
                )}
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
              </>
            )}
          </div>
        ))}
        {loading && !messages.some((m) => m.steps && m.steps.length > 0) && (
          <div className={`${styles.message} ${styles.assistant}`} style={{ marginLeft: 8 }}>
            <Spin size="small" /> Agent 正在思考…
          </div>
        )}
      </div>
      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="用自然语言描述网络意图，例如：画一个三个交换机节点的拓扑"
          disabled={disabled}
        />
        <Button
          type={loading ? 'default' : 'primary'}
          danger={loading}
          icon={loading ? <StopOutlined /> : <SendOutlined />}
          onClick={loading ? handleStop : handleSend}
          disabled={!loading && (!input.trim() || disabled)}
          className={styles.sendBtn}
        >
          {loading ? '停止' : '发送'}
        </Button>
      </div>
    </div>
  )
}

export default ChatInput
