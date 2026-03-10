import type { WorkspaceBackendTodo } from '@/model/workspace'

const TOKEN_KEY = 'paranet_token'

export interface AgentMessagePayload {
  content: string
  role: 'assistant' | 'system' | 'user'
}

export interface ProjectAssistantRequest {
  currentFileContent?: string
  currentFileId?: string
  currentFileName?: string
  messages: AgentMessagePayload[]
  projectId?: string
  projectName?: string
  topologyId?: string
}

interface StreamEventPayload {
  content?: string
  message?: string
  model?: string
}

interface StreamProjectAssistantOptions {
  onDelta?: (payload: StreamEventPayload) => void
  onDone?: (payload: StreamEventPayload) => void
  onError?: (payload: StreamEventPayload) => void
  onTool?: (payload: StreamEventPayload) => void
}

export const agentBackendRoadmap: WorkspaceBackendTodo[] = [
  {
    capability: '项目上下文智能体流式对话',
    legacyEndpoint: '/api/chat/stream',
    proposedEndpoint: 'POST /agent/project-assistant/stream',
    status: 'compatible',
    note: '当前通过新 API 层兼容老流式接口，后续替换为 ParaNet 原生 Agent 接口',
  },
]

const parseEventPayload = (data: string): StreamEventPayload => {
  try {
    return JSON.parse(data) as StreamEventPayload
  } catch {
    return { content: data }
  }
}

const consumeEventBlock = (block: string, options: StreamProjectAssistantOptions) => {
  const lines = block.split('\n')
  let eventName = 'message'
  const dataLines: string[] = []

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  })

  const rawData = dataLines.join('\n')
  if (!rawData) return

  const payload = parseEventPayload(rawData)
  if (eventName === 'delta') {
    options.onDelta?.(payload)
    return
  }
  if (eventName === 'done') {
    options.onDone?.(payload)
    return
  }
  if (eventName === 'error') {
    options.onError?.(payload)
    return
  }
  if (eventName === 'tool') {
    options.onTool?.(payload)
  }
}

export const agentApi = {
  streamProjectAssistant: async (
    data: ProjectAssistantRequest,
    options: StreamProjectAssistantOptions = {},
    signal?: AbortSignal,
  ) => {
    const token = localStorage.getItem(TOKEN_KEY)
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify({
        currentFileContent: data.currentFileContent,
        currentFileId: data.currentFileId,
        currentFileName: data.currentFileName,
        messages: data.messages,
        projectId: data.projectId,
        projectName: data.projectName,
        topologyId: data.topologyId,
      }),
    })

    if (!response.ok) {
      throw new Error(`智能体请求失败，状态码：${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const result = (await response.json()) as { code?: number; message?: string; msg?: string }
      throw new Error(result.message || result.msg || '智能体请求失败')
    }

    if (!response.body) {
      throw new Error('浏览器不支持流式响应')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let isReading = true

    while (isReading) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const normalized = buffer.replace(/\r\n/g, '\n')
      const blocks = normalized.split('\n\n')
      buffer = blocks.pop() ?? ''
      blocks.forEach((block) => consumeEventBlock(block.trim(), options))

      if (done) {
        if (buffer.trim()) {
          consumeEventBlock(buffer.trim(), options)
        }
        isReading = false
      }
    }
  },
}
