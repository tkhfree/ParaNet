// 意图相关类型定义

export interface Intent {
  id: string
  name: string
  description?: string
  type: IntentType
  content: string
  status: IntentStatus
  projectId?: string | null
  topologyId?: string | null
  compiledConfig?: CompiledConfig
  lastCompileResult?: IntentCompileResponse
  createdAt: string
  updatedAt: string
  deployedAt?: string
}

export type IntentType = 'dsl' | 'natural_language'

export type IntentStatus = 
  | 'draft' 
  | 'compiling' 
  | 'compiled' 
  | 'deploying' 
  | 'deployed' 
  | 'failed'

export interface CompiledConfig {
  ip?: Record<string, unknown>
  ndn?: Record<string, unknown>
  geo?: Record<string, unknown>
  p4?: Record<string, unknown>
}

export interface IntentCreateRequest {
  name: string
  description?: string
  type: IntentType
  content: string
  topologyId?: string
  projectId?: string | null
}

export interface IntentCompileRequest {
  intentId: string
  topologyId: string
}

/** 编译预览请求（无需保存意图，直接编译 DSL 内容） */
export interface CompilePreviewRequest {
  content: string
  topologyId?: string
  projectId?: string | null
}

export interface IntentCompileResponse {
  success: boolean
  config?: CompiledConfig
  errors?: string[]
  warnings?: string[]
  projectId?: string | null
  ast?: {
    type: string
    children: Array<{
      line: number
      kind: string
      text: string
    }>
  }
  globalIr?: {
    summary?: Record<string, unknown>
    instructions?: Array<Record<string, unknown>>
  }
  deviceIr?: Array<{
    deviceId: string
    instructions: Array<Record<string, unknown>>
  }>
  logs?: Array<{
    timestamp: string
    level: 'info' | 'warning' | 'error'
    message: string
  }>
}

export interface NaturalLanguageRequest {
  input: string
  context?: {
    topologyId?: string
    previousIntents?: string[]
  }
}

export interface NaturalLanguageResponse {
  dslCode: string
  explanation: string
  suggestions?: string[]
}
