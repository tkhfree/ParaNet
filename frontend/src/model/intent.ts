/**
 * 编译产物记录（后端 REST 资源：/compile-artifacts；历史字段名仍为 Intent）
 * 表示一次保存的可部署编译快照：DSL、编译结果、以及 output/ 下的数据面文件等。
 */
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
  /** 与 compileArtifactId 二选一，后者优先 */
  intentId?: string
  compileArtifactId?: string
  topologyId: string
}

/** 编译预览请求（无需保存意图，直接编译 DSL 内容） */
export interface CompilePreviewRequest {
  content: string
  topologyId?: string
  projectId?: string | null
}

/** 保存可部署产物：编译并写入项目 output/ 目录 */
export interface SaveDeployArtifactsRequest {
  projectId: string
  content: string
  topologyId?: string
  /** 更新已有记录时传入；与 intentId 同义，优先使用本字段 */
  compileArtifactId?: string
  intentId?: string
  name?: string
  description?: string
}

/** 编译器诊断；`phase` 与内部 pass 对齐（parse / semantic / lowering / placement / emit） */
export interface CompilerDiagnostic {
  code: string
  message: string
  severity: 'error' | 'warning' | 'info'
  phase?: string | null
  span?: {
    file: string
    line: number
    column: number
    end_line: number
    end_column: number
  } | null
  notes?: string[] | null
}

export interface IntentCompileResponse {
  success: boolean
  config?: CompiledConfig
  errors?: string[]
  warnings?: string[]
  /** 结构化诊断（含阶段）；与 errors/warnings 同源时优先展示本字段以标注 pass */
  diagnostics?: CompilerDiagnostic[]
  projectId?: string | null
  /** PNE 语法树：`{ type: 'Program', value: ... }` */
  ast?: Record<string, unknown> | null
  /** ProgramIR + FragmentIR + NodePlanIR + 管线产物预览 */
  globalIr?: Record<string, unknown> | null
  /** 每设备：nodePlan + artifacts（与 compile_pipeline 一致） */
  deviceIr?: Array<{
    deviceId: string
    instructions: Record<string, unknown>
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
    skills?: string[]
  }
}

export interface NaturalLanguageResponse {
  dslCode: string
  explanation: string
  suggestions?: string[]
  usedSkills?: string[]
  agentPrompt?: string
  compileResult?: IntentCompileResponse
}
