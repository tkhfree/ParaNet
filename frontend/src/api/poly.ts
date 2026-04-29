/**
 * Polymorphic DSL API
 */
import http from './axios'

export interface PolyProtocolTopology {
  id: string
  name: string
  description: string
  nodes: Array<{
    id: string
    name: string
    type: string
    position: { x: number; y: number }
    properties: Record<string, unknown>
    config?: Record<string, unknown>
    capabilities?: Record<string, unknown>
  }>
  links: Array<{
    id: string
    source: string
    target: string
    sourcePort?: string
    targetPort?: string
    bandwidth?: number
    delay?: number
    properties?: Record<string, unknown>
  }>
}

export interface PolyControlInfo {
  app: { name: string; version: string; description: string }
  capabilities: string[]
  states: Array<{ name: string; type: string }>
  events: Array<{ name: string; params: string[] }>
}

export interface PolyDataInfo {
  packets: Array<{ name: string }>
  modules: Array<{ name: string; packet: string }>
  services: Array<{ name: string; target_role: string }>
}

export interface PolyProtocol {
  name: string
  extends?: string
  mixins: string[]
  topology: PolyProtocolTopology | null
  control: PolyControlInfo | null
  data: PolyDataInfo | null
}

export interface PolyParseResult {
  success: boolean
  protocols: PolyProtocol[]
  diagnostics: Array<{
    code: string
    message: string
    severity: string
    span?: { file: string; line: number; column: number }
  }>
}

export interface PolyGenerateControlResult {
  success: boolean
  protocol?: string
  files: Record<string, string>
  diagnostics: Array<{
    code: string
    message: string
    severity: string
    span?: { file: string; line: number; column: number }
  }>
  message?: string
}

export interface PolyGenerateP4Result {
  success: boolean
  protocol?: string
  files: Record<string, string>
  device_count?: number
  diagnostics: Array<{
    code: string
    message: string
    severity: string
    span?: { file: string; line: number; column: number }
  }>
  message?: string
}

export const polyApi = {
  /** Parse polymorphic DSL text and return protocol info */
  parse: (dsl: string) => http.post<any, { code: number; data: PolyParseResult; message: string }>('/poly/parse', { dsl }),

  /** Generate ONOS Java application from control block */
  generateControl: (dsl: string) => http.post<any, { code: number; data: PolyGenerateControlResult; message: string }>('/poly/generate-control', { dsl }),

  /** Generate per-device P4 code from data + topology blocks */
  generateP4: (dsl: string) => http.post<any, { code: number; data: PolyGenerateP4Result; message: string }>('/poly/generate-p4', { dsl }),
}
