import { Model } from '@antv/x6'

export interface IPoint {
  device: string
  port: string
}

export interface ILink {
  link: string
  src: IPoint
  dst: IPoint
  bandwidth: number
}

export interface ITopologyDevice {
  设备名称: string
  设备型号: string
  设备形态: string
  端口形态: string
  交换容量: string
  包转发率: string
  CPU系统: string
  SSD: string
}

export interface ITopology {
  devices: string[]
  links: ILink[]
  deviceStaticInfo: Record<string, ITopologyDevice>
  graph?: Model.FromJSONData
}
