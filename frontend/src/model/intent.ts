// 意图相关类型定义

export interface Intent {
  id: string
  name: string
  description?: string
  type: IntentType
  content: string
  status: IntentStatus
  compiledConfig?: CompiledConfig
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
}

export interface IntentCompileRequest {
  intentId: string
  topologyId: string
}

export interface IntentCompileResponse {
  success: boolean
  config?: CompiledConfig
  errors?: string[]
  warnings?: string[]
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
