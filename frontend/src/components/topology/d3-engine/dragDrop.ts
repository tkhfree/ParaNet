/**
 * 拓扑设备拖放工具
 */

export const DEVICE_DRAG_MIME_TYPE = 'application/paranet-device-type'
export const DEVICE_DRAG_FALLBACK_MIME_TYPE = 'text/plain'

let activeDraggedDeviceType: string | null = null
type CustomDeviceDragPhase = 'dragging' | 'released'

export interface CustomDeviceDragState {
  phase: CustomDeviceDragPhase
  deviceType: string
  label: string
  imageSrc?: string
  clientX: number
  clientY: number
}

let customDeviceDragState: CustomDeviceDragState | null = null
const customDeviceDragListeners = new Set<(state: CustomDeviceDragState | null) => void>()

const notifyCustomDeviceDragListeners = () => {
  for (const listener of customDeviceDragListeners) {
    listener(customDeviceDragState)
  }
}

export const setActiveDraggedDeviceType = (deviceType: string) => {
  activeDraggedDeviceType = deviceType
}

export const clearActiveDraggedDeviceType = () => {
  activeDraggedDeviceType = null
}

export const getActiveDraggedDeviceType = () => activeDraggedDeviceType

export const hasDeviceDragType = (types: readonly string[] | DOMStringList) => {
  const normalizedTypes = Array.from(types)
  return (
    normalizedTypes.includes(DEVICE_DRAG_MIME_TYPE) ||
    normalizedTypes.includes(DEVICE_DRAG_FALLBACK_MIME_TYPE)
  )
}

export const subscribeCustomDeviceDrag = (
  listener: (state: CustomDeviceDragState | null) => void
) => {
  customDeviceDragListeners.add(listener)
  listener(customDeviceDragState)

  return () => {
    customDeviceDragListeners.delete(listener)
  }
}

export const getCustomDeviceDragState = () => customDeviceDragState

export const startCustomDeviceDrag = ({
  deviceType,
  label,
  imageSrc,
  clientX,
  clientY,
}: Omit<CustomDeviceDragState, 'phase'>) => {
  setActiveDraggedDeviceType(deviceType)
  customDeviceDragState = {
    phase: 'dragging',
    deviceType,
    label,
    imageSrc,
    clientX,
    clientY,
  }
  notifyCustomDeviceDragListeners()
}

export const updateCustomDeviceDrag = (clientX: number, clientY: number) => {
  if (!customDeviceDragState) {
    return
  }

  customDeviceDragState = {
    ...customDeviceDragState,
    phase: 'dragging',
    clientX,
    clientY,
  }
  notifyCustomDeviceDragListeners()
}

export const releaseCustomDeviceDrag = (clientX: number, clientY: number) => {
  if (!customDeviceDragState) {
    return
  }

  customDeviceDragState = {
    ...customDeviceDragState,
    phase: 'released',
    clientX,
    clientY,
  }
  notifyCustomDeviceDragListeners()
  customDeviceDragState = null
  clearActiveDraggedDeviceType()
  notifyCustomDeviceDragListeners()
}

export const cancelCustomDeviceDrag = () => {
  customDeviceDragState = null
  clearActiveDraggedDeviceType()
  notifyCustomDeviceDragListeners()
}
