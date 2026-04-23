import type { ApiResponse } from './axios'

export interface AgentChatRequest {
  message: string
  topologyId?: string
  projectId?: string
  conversationHistory?: Array<{ role: string; content: string }>
}

export interface AgentStep {
  type: 'tool_call' | 'tool_result' | 'thinking' | 'error' | 'finish'
  toolName: string
  arguments?: string
  argumentsParsed?: Record<string, unknown>
  result?: unknown
  success?: boolean
  stepIndex: number
  /** Action class name (e.g. 'AgentFinishAction') */
  action?: string
  /** Whether this step represents a runnable action */
  runnable?: boolean
  /** Tool name (new field, distinct from toolName for backward compat) */
  tool?: string
  /** Structured input parameters for tool calls */
  input?: Record<string, unknown>
  /** Output string from tool results */
  output?: string
  /** Duration of the step in milliseconds */
  duration_ms?: number
  /** Error message when type is 'error' */
  error?: string
  /** Who produced this step */
  source?: 'agent' | 'user' | 'environment'
}

export interface AgentAction {
  type: 'refresh_topology' | 'refresh_files' | 'apply_dsl' | 'open_deployment'
  payload?: Record<string, unknown>
}

export interface AgentChatSyncResponse {
  content: string
  steps: AgentStep[]
  actions: AgentAction[]
}

/**
 * SSE streaming agent chat.
 */
export function agentChatStream(
  data: AgentChatRequest,
  callbacks: {
    onStep?: (step: AgentStep) => void
    onMessage?: (content: string, actions: AgentAction[]) => void
    onError?: (error: Error) => void
    onDone?: () => void
    /** Called when the agent is thinking */
    onThinking?: (content: string) => void
    /** Called when the agent invokes a tool */
    onToolCall?: (tool: string, input: Record<string, unknown>) => void
    /** Called when a tool invocation completes */
    onToolResult?: (tool: string, output: string, success: boolean) => void
  },
): AbortController {
  const controller = new AbortController()

  const token = localStorage.getItem('paranet_token')

  fetch('/api/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const parsed = JSON.parse(dataStr)
              if (currentEvent === 'step') {
                const step = parsed as AgentStep
                // Map new event-driven format to step types
                if (step.source === 'agent' && step.action) {
                  if (step.action === 'AgentFinishAction') {
                    step.type = 'finish'
                  }
                  // If step has observation field, treat as tool_result
                  if ("observation" in parsed) {
                    step.type = 'tool_result'
                  }
                }
                callbacks.onStep?.(step)
                // Dispatch typed callbacks
                if (step.type === 'thinking' && step.output) {
                  callbacks.onThinking?.(step.output)
                } else if (step.type === 'tool_call' && (step.tool || step.toolName)) {
                  callbacks.onToolCall?.(step.tool || step.toolName, step.input || step.argumentsParsed || {})
                } else if (step.type === 'tool_result' && (step.tool || step.toolName)) {
                  callbacks.onToolResult?.(
                    step.tool || step.toolName,
                    step.output ?? String(step.result ?? ''),
                    step.success ?? true,
                  )
                }
              } else if (currentEvent === 'message') {
                callbacks.onMessage?.(parsed.content, parsed.actions || [])
              } else if (currentEvent === 'done') {
                callbacks.onDone?.()
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
      }
    })

  return controller
}

/**
 * Synchronous agent chat (fallback).
 */
export async function agentChatSync(data: AgentChatRequest): Promise<ApiResponse<AgentChatSyncResponse>> {
  const token = localStorage.getItem('paranet_token')
  const res = await fetch('/api/agent/chat-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })
  return res.json()
}
