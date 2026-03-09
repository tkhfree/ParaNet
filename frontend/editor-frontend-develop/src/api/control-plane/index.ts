import type { Response } from '../axios'

import axios from '../axios'

export interface MatchField {
  fieldName: string
  mask?: string
  matchType: string
  value: string
}

export interface ActionParam {
  paramName: string
  value: string
}

export interface ControlPlaneDevice {
  deviceName: string
  flowCount: number
  ip: string
}

export interface FlowTableEntry {
  action: string
  actionName?: string
  actionParams?: ActionParam[]
  byteCount: number
  deviceIp?: string
  enabled: boolean
  id: string
  matchRule: string
  matchFields?: MatchField[]
  packetCount: number
  priority: number
  remark: string
  tableId: string
  updatedAt: string
}

export interface SaveFlowTablePayload {
  action: string
  actionName?: string
  actionParams?: ActionParam[]
  byteCount?: number
  deviceName: string
  enabled?: boolean
  id?: string
  matchRule: string
  matchFields?: MatchField[]
  packetCount?: number
  priority?: number
  projectId: number | string
  remark?: string
  tableId?: string
}

export const fetchControlPlaneDevices = (
  projectId: number | string,
): Response<ControlPlaneDevice[]> => axios.get(`/control-plane/devices?projectId=${projectId}`)

export const fetchFlowTable = (
  projectId: number | string,
  deviceName: string,
): Response<FlowTableEntry[]> =>
  axios.get(
    `/control-plane/flow-table?projectId=${projectId}&deviceName=${encodeURIComponent(deviceName)}`,
  )

export const saveFlowTable = (data: SaveFlowTablePayload): Response<FlowTableEntry> =>
  axios.post('/control-plane/flow-table/save', data)

export const deleteFlowTable = (data: {
  deviceName: string
  id: string
  projectId: number | string
}): Response<unknown> => axios.post('/control-plane/flow-table/delete', data)

export const enableFlowTable = (data: {
  deviceName: string
  id: string
  projectId: number | string
}): Response<FlowTableEntry> => axios.post('/control-plane/flow-table/enable', data)

export const disableFlowTable = (data: {
  deviceName: string
  id: string
  projectId: number | string
}): Response<FlowTableEntry> => axios.post('/control-plane/flow-table/disable', data)
