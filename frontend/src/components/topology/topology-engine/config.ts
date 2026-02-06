import { Graph } from '@antv/x6'

import device1 from '@/assets/svg/devices/device1.svg?url'
import device2 from '@/assets/svg/devices/device2.svg?url'
import device3 from '@/assets/svg/devices/device3.svg?url'
import device4 from '@/assets/svg/devices/device4.svg?url'
import device5 from '@/assets/svg/devices/device5.svg?url'

const BodyAttrs = {
  stroke: '#CFDBFF',
  strokeWidth: 0,
  fill: '#424348',
  rx: 4,
  ry: 4,
}

const PortAttrs = {
  circle: {
    magnet: true,
    stroke: '#8f8f8f',
    r: 6,
    attr: {
      zIndex: 1,
    },
    zIndex: 1,
  },
}

const groups = {
  top: { position: 'top' as const, attrs: PortAttrs },
  left: { position: 'left' as const, attrs: PortAttrs },
  right: { position: 'right' as const, attrs: PortAttrs },
  bottom: { position: 'bottom' as const, attrs: PortAttrs },
}

const items = [
  { id: 'port_1', group: 'top' },
  { id: 'port_2', group: 'left' },
  { id: 'port_3', group: 'right' },
  { id: 'port_4', group: 'bottom' },
]

const createDeviceNode = (imgUrl: string) => ({
  inherit: 'rect' as const,
  width: 114,
  height: 100,
  markup: [
    { tagName: 'rect', selector: 'body' },
    { tagName: 'image', selector: 'img' },
    { tagName: 'text', selector: 'label' },
  ],
  attrs: {
    body: BodyAttrs,
    img: {
      'xlink:href': imgUrl,
      width: 90,
      height: 42,
      x: 12,
      y: 16,
    },
    label: {
      y: 30,
      fill: '#ffffffcc',
    },
  },
  ports: { groups, items },
})

Graph.registerNode('Device', createDeviceNode(device1))

/** 设备型号 -> 默认图标 URL（新增节点时若无指定则用此表） */
export const DEVICE_ICON_MAP: Record<string, string> = {
  switch: device1,
  router: device2,
  host: device3,
  controller: device4,
  server: device5,
  p4_switch: device1,
}

/** 内置设备图元列表（侧边栏设备库） */
export const BUILT_IN_DEVICES = [
  { id: '1', deviceType: 'switch', deviceModel: 'switch', picturePath: device1 },
  { id: '2', deviceType: 'router', deviceModel: 'router', picturePath: device2 },
  { id: '3', deviceType: 'host', deviceModel: 'host', picturePath: device3 },
  { id: '4', deviceType: 'controller', deviceModel: 'controller', picturePath: device4 },
  { id: '5', deviceType: 'server', deviceModel: 'server', picturePath: device5 },
  { id: '6', deviceType: 'p4_switch', deviceModel: 'p4_switch', picturePath: device1 },
] as const
