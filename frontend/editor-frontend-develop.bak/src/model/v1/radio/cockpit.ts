export interface todoSearchdModel {
  /** 页码 */
  pageNo?: number
  /** 每页大小 */
  pageSize?: number
  /** 代办状态（0:待办，1：已办） */
  completeStatus?: string
  /** 站点id/工单id */
  stationId?: string
  /** 站点名称/工单名称 */
  stationName?: string
  /** 事项类型 */
  stationType?: string
  /** 状态：选择对应事项下的状态 */
  stationTypeStatus?: string

  /** 站点进度 */
  stationProcess?: string
  /** 提单人 */
  createBy?: string
}

export interface todoResponseModel {
  /** 数据 */
  records?: Array<{
    /** 序号 */
    id?: string
    /** 站点ID/工单ID */
    stationId?: string
    /** 站点名称/工单名称 */
    stationName?: string
    /** 事项类型 */
    taskType?: string
    /** 提单人 */
    createBy?: string
    /** 提单时间 */
    createTime?: string
    /** 站点进度 */
    stationProcess?: string
    /** 站点进度状态 */
    stationProcessStatus?: string
    /** 等待时间 */
    waitTime?: string
    /** 当前审批环节 */
    currentNode?: string
    /** 审批时间 */
    currentOperateTime?: string
  }>
  /** 总条数 */
  totalRecord?: number
  /** 每页大小 */
  pageSize?: number
  /** 第几页 */
  pageNo?: number
}
