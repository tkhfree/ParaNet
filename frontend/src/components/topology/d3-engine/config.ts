/**
 * D3 拓扑引擎配置
 */

import type { DeviceLegend } from '@/model/topology'
import device1 from '@/assets/svg/devices/device1.svg?url'
import device2 from '@/assets/svg/devices/device2.svg?url'
import device3 from '@/assets/svg/devices/device3.svg?url'
import device4 from '@/assets/svg/devices/device4.svg?url'
import device5 from '@/assets/svg/devices/device5.svg?url'

/** 设备颜色方案 */
export const DEVICE_COLORS: Record<string, string> = {
  switch: '#3b82f6', // 蓝
  router: '#8b5cf6', // 紫
  host: '#6b7280', // 灰
  controller: '#10b981', // 绿
  server: '#f59e0b', // 橙
  p4_switch: '#06b6d4', // 青
}

/** 设备中文名称 */
export const DEVICE_NAMES: Record<string, string> = {
  switch: '交换机',
  router: '路由器',
  host: '终端',
  controller: '控制器',
  server: '服务器',
  p4_switch: 'P4交换机',
}

/** 设备图标（使用 SVG 符号） */
export const DEVICE_ICONS: Record<string, string> = {
  switch: 'icon-switch',
  router: 'icon-router',
  host: 'icon-host',
  controller: 'icon-controller',
  server: 'icon-server',
  p4_switch: 'icon-p4-switch',
}

/** 设备图片资源 */
export const DEVICE_IMAGE_MAP: Record<string, string> = {
  switch: device1,
  router: device2,
  host: device3,
  controller: device4,
  server: device5,
  p4_switch: device1,
}

export const DEVICE_IMAGE_OPTIONS: Record<string, string> = {
  device1,
  device2,
  device3,
  device4,
  device5,
}

export const DEFAULT_DEVICE_LEGENDS: DeviceLegend[] = [
  {
    id: 'switch',
    type: 'switch',
    label: '交换机',
    imageKey: 'device1',
    color: '#3b82f6',
    sort: 10,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'router',
    type: 'router',
    label: '路由器',
    imageKey: 'device2',
    color: '#8b5cf6',
    sort: 20,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'host',
    type: 'host',
    label: '终端',
    imageKey: 'device3',
    color: '#6b7280',
    sort: 30,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'controller',
    type: 'controller',
    label: '控制器',
    imageKey: 'device4',
    color: '#10b981',
    sort: 40,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'server',
    type: 'server',
    label: '服务器',
    imageKey: 'device5',
    color: '#f59e0b',
    sort: 50,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p4_switch',
    type: 'p4_switch',
    label: 'P4交换机',
    imageKey: 'device1',
    color: '#06b6d4',
    sort: 60,
    createdAt: '',
    updatedAt: '',
  },
]

let deviceLegendRegistry: DeviceLegend[] = [...DEFAULT_DEVICE_LEGENDS]

export function setDeviceLegendRegistry(legends: DeviceLegend[]) {
  deviceLegendRegistry = legends.length > 0 ? [...legends] : [...DEFAULT_DEVICE_LEGENDS]
}

export function getDeviceLegendRegistry() {
  return deviceLegendRegistry
}

function findDeviceLegend(type: string) {
  return deviceLegendRegistry.find((item) => item.type === type)
}

export function resolveDeviceName(type: string): string {
  return findDeviceLegend(type)?.label ?? DEVICE_NAMES[type] ?? type
}

export function resolveDeviceColor(type: string): string {
  return findDeviceLegend(type)?.color ?? DEVICE_COLORS[type] ?? '#64748b'
}

export function resolveDeviceImage(type: string): string {
  const imageKey = findDeviceLegend(type)?.imageKey
  if (imageKey && DEVICE_IMAGE_OPTIONS[imageKey]) {
    return DEVICE_IMAGE_OPTIONS[imageKey]
  }
  return DEVICE_IMAGE_MAP[type] ?? device1
}

/** 力导向模拟配置 */
export const FORCE_CONFIG = {
  /** 连线距离 */
  linkDistance: 120,
  /** 节点间斥力强度 */
  chargeStrength: -120,
  /** 碰撞半径 */
  collisionRadius: 42,
  /** 中心引力强度 */
  centerStrength: 0.03,
  /** Alpha 衰减率 */
  alphaDecay: 0.08,
  /** Velocity decay */
  velocityDecay: 0.72,
}

/** 节点视觉配置 */
export const NODE_CONFIG = {
  /** 节点半径 */
  radius: 34,
  /** 节点卡片宽度 */
  width: 104,
  /** 节点卡片高度 */
  height: 72,
  /** 设备图示宽度 */
  imageWidth: 72,
  /** 设备图示高度 */
  imageHeight: 34,
  /** 选中时边框宽度 */
  selectedStrokeWidth: 3,
  /** 默认边框宽度 */
  strokeWidth: 2,
  /** 悬停边框宽度 */
  hoverStrokeWidth: 3,
  /** 标签偏移 */
  labelOffset: 52,
  /** 字体大小 */
  fontSize: 12,
}

/** 连线视觉配置 */
export const LINK_CONFIG = {
  /** 线条宽度 */
  strokeWidth: 2,
  /** 默认颜色 */
  stroke: '#64748b',
  /** 悬停颜色 */
  hoverStroke: '#94a3b8',
  /** 选中颜色 */
  selectedStroke: '#3b82f6',
}

/** 画布配置 */
export const CANVAS_CONFIG = {
  /** 背景色 */
  backgroundColor: '#1a1a2e',
  /** 网格色 */
  gridColor: '#2a2a4a',
  /** 网格大小 */
  gridSize: 40,
  /** 最小缩放 */
  minZoom: 0.3,
  /** 最大缩放 */
  maxZoom: 3,
}

/** 动画配置 */
export const ANIMATION_CONFIG = {
  /** 过渡时长 */
  transitionDuration: 300,
  /** 缩放动画时长 */
  zoomDuration: 500,
}

/** 连线颜色（根据连接设备类型） */
export const LINK_COLORS = {
  default: '#64748b',
  controller: '#f59e0b',
  data: '#07ccfa',
}
