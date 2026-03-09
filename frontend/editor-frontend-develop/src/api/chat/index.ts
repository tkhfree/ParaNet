import type { Response } from '../axios'

import axios from '../axios'
import storage, { TOKEN } from '@/utils/storage'

export interface ChatMessagePayload {
  content: string
  role: 'assistant' | 'system' | 'user'
}

export interface ChatRequestPayload {
  currentFileContent?: string
  currentFileId?: number | string
  currentFileName?: string
  messages: ChatMessagePayload[]
  projectId?: number | string
  projectName?: string
}

export interface ChatResponsePayload {
  model: string
  reply: string
}

export const sendChatMessage = (data: ChatRequestPayload): Response<ChatResponsePayload> =>
  axios.post('/chat/message', data)

interface StreamEventPayload {
  content?: string
  message?: string
  model?: string
}

interface StreamChatOptions {
  onDelta?: (payload: StreamEventPayload) => void
  onDone?: (payload: StreamEventPayload) => void
  onError?: (payload: StreamEventPayload) => void
  onTool?: (payload: StreamEventPayload) => void
}

const parseEventPayload = (data: string): StreamEventPayload => {
  try {
    return JSON.parse(data) as StreamEventPayload
  } catch {
    return { content: data }
  }
}

const consumeEventBlock = (block: string, options: StreamChatOptions) => {
  const lines = block.split('\n')
  let eventName = 'message'
  const dataLines: string[] = []

  lines.forEach(line => {
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

export const streamChatMessage = async (
  data: ChatRequestPayload,
  options: StreamChatOptions = {},
  signal?: AbortSignal,
) => {
  const token = storage.get(TOKEN)
  const response = await fetch('/api/chat/stream', {
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: String(token) } : {}),
    },
    method: 'POST',
    signal,
  })

  if (!response.ok) {
    throw new Error(`聊天请求失败，状态码：${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const result = (await response.json()) as { code?: number; msg?: string }
    throw new Error(result.msg || '聊天请求失败')
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
    blocks.forEach(block => consumeEventBlock(block.trim(), options))

    if (done) {
      if (buffer.trim()) {
        consumeEventBlock(buffer.trim(), options)
      }
      isReading = false
    }
  }
}
