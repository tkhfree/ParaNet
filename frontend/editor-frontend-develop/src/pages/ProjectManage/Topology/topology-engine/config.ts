import { Graph } from '@antv/x6'

import device1 from '../../../../assets/svg/devices/device1.svg?url'
import device2 from '../../../../assets/svg/devices/device2.svg?url'
import device3 from '../../../../assets/svg/devices/device3.svg?url'
import device4 from '../../../../assets/svg/devices/device4.svg?url'
import device5 from '../../../../assets/svg/devices/device5.svg?url'

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
  top: { position: 'top', attrs: PortAttrs },
  left: { position: 'left', attrs: PortAttrs },
  right: { position: 'right', attrs: PortAttrs },
  bottom: { position: 'bottom', attrs: PortAttrs },
}

const items = [
  { id: 'port_1', group: 'top' },
  { id: 'port_2', group: 'left' },
  { id: 'port_3', group: 'right' },
  { id: 'port_4', group: 'bottom' },
]

const DeviceNode1 = {
  inherit: 'rect', // 继承于 rect 节点
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
      'xlink:href': device1,
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
}

const DeviceNode2 = {
  inherit: 'rect', // 继承于 rect 节点
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
      'xlink:href': device2,
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
}
const DeviceNode3 = {
  inherit: 'rect', // 继承于 rect 节点
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
      'xlink:href': device3,
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
}
const DeviceNode4 = {
  inherit: 'rect', // 继承于 rect 节点
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
      'xlink:href': device4,
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
}
const DeviceNode5 = {
  inherit: 'rect', // 继承于 rect 节点
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
      'xlink:href': device5,
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
}
// Graph.registerNode(DeviceTypes.Type1, DeviceNode1)
// Graph.registerNode(DeviceTypes.Type2, DeviceNode2)
// Graph.registerNode(DeviceTypes.Type3, DeviceNode3)
// Graph.registerNode(DeviceTypes.Type4, DeviceNode4)
// Graph.registerNode(DeviceTypes.Type5, DeviceNode5)

Graph.registerNode('Device', DeviceNode1)
