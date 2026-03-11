/**
 * D3 拓扑引擎配置
 */

import type { NodeType } from '@/model/topology'

/** 设备颜色方案 */
export const DEVICE_COLORS: Record<NodeType, string> = {
  switch: '#3b82f6', // 蓝
  router: '#8b5cf6', // 紫
  host: '#6b7280', // 灰
  controller: '#10b981', // 绿
  server: '#f59e0b', // 橙
  p4_switch: '#06b6d4', // 青
}

/** 设备中文名称 */
export const DEVICE_NAMES: Record<NodeType, string> = {
  switch: '交换机',
  router: '路由器',
  host: '主机',
  controller: '控制器',
  server: '服务器',
  p4_switch: 'P4交换机',
}

/** 设备图标（使用 SVG 符号） */
export const DEVICE_ICONS: Record<NodeType, string> = {
  switch: 'icon-switch',
  router: 'icon-router',
  host: 'icon-host',
  controller: 'icon-controller',
  server: 'icon-server',
  p4_switch: 'icon-p4-switch',
}

/** 力导向模拟配置 */
export const FORCE_CONFIG = {
  /** 连线距离 */
  linkDistance: 180,
  /** 节点间斥力强度 */
  chargeStrength: -600,
  /** 碰撞半径 */
  collisionRadius: 50,
  /** 中心引力强度 */
  centerStrength: 0.1,
  /** Alpha 衰减率 */
  alphaDecay: 0.02,
  /** Velocity decay */
  velocityDecay: 0.4,
}

/** 节点视觉配置 */
export const NODE_CONFIG = {
  /** 节点半径 */
  radius: 32,
  /** 选中时边框宽度 */
  selectedStrokeWidth: 3,
  /** 默认边框宽度 */
  strokeWidth: 2,
  /** 悬停边框宽度 */
  hoverStrokeWidth: 3,
  /** 标签偏移 */
  labelOffset: 44,
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
