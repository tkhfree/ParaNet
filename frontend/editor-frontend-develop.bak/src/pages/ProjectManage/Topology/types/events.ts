import { ILink, ITopologyDevice } from './topology'

export interface ILinkAddedEvent {
  source: string
  target: string
}

export interface INodeClickEvent {
  data: ITopologyDevice
  x: number
  y: number
}

export interface IEdgeClickEvent {
  data: ILink
  x: number
  y: number
}

export type Events = {
  GRAPH_DESERIALIZE: undefined
  LINK_ADDED: ILinkAddedEvent
  CELL_ADDED: undefined
  CELL_CHANGED: undefined
  CELL_REMOVED: undefined
  NODE_CLICK: INodeClickEvent
  EDGE_CLICK: IEdgeClickEvent
  BLANK_CLICK: undefined
  TOPOLOGY_POPUP: string
}
