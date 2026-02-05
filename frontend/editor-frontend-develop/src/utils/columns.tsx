import { DescriptionsItemType } from 'antd/es/descriptions'
import { timeFormat } from './tools'

export const tableColumns = {
  /**
   * 高危单号
   */
  orderNumber: {
    dataIndex: 'orderNumber',
    title: '高危单号',
  },
  /**
   * 站点名称
   */
  stationName: {
    dataIndex: 'stationName',
    title: '站点名称',
  },

  /**
   * 站点状态
   */
  stationStageStatusName: {
    dataIndex: 'stationStageStatusName',
    title: '站点状态',
  },
  /**
   * 站点进度
   */
  stationStageTypeName: {
    dataIndex: 'stationStageTypeName',
    title: '站点进度',
  },
  /**
   * 物理站ID
   */
  stationId: {
    dataIndex: 'stationId',
    title: '物理站ID',
  },
  /**
   * 逻辑站ID
   */
  logicStationId: {
    dataIndex: 'logicStationId',
    title: '逻辑站ID',
  },
  /**
   * 项目名称
   */
  projectName: {
    dataIndex: 'projectName',
    title: '项目名称',
  },
  /**
   * 项目类型
   */
  siteType: {
    dataIndex: 'siteType',
    title: '项目类型',
  },
  /**
   * 项目编号
   */
  projectCode: {
    dataIndex: 'projectCode',
    title: '项目编号',
  },
  /**
   * 项目经理
   */
  managerUser: {
    dataIndex: 'managerUser',
    title: '项目经理',
  },
  /**
   * 项目阶段
   */
  flied81: {
    dataIndex: 'flied8',
    title: '项目阶段',
  },
  /**
   * 施工工艺
   */
  processName: {
    dataIndex: 'processName',
    title: '施工工艺',
  },
  /**
   * 施工单位
   */
  constructionUnitName: {
    dataIndex: 'constructionUnitName',
    title: '施工单位',
  },
  /**
   * 施工负责人
   */
  constructionManagerName: {
    dataIndex: 'constructionManagerName',
    title: '施工负责人',
  },
  /**
   * 省份
   */
  provinceName: {
    dataIndex: 'provinceName',
    title: '省分',
  },
  /**
   * 地市
   */
  cityName: {
    dataIndex: 'cityName',
    title: '地市',
  },
  /**
   * 区县
   */
  areaName: {
    dataIndex: 'areaName',
    title: '区县',
  },
  /**
   * 场景
   */
  subScene: {
    dataIndex: 'subScene',
    title: '场景',
  },
  /**
   * 预计建设年份
   */
  buildYear: {
    dataIndex: 'buildYear',
    title: '预计建设年份',
  },
  /**
   * 一级场景分类
   */
  scene: {
    dataIndex: 'scene',
    title: '一级场景分类',
  },
  /**
   * 规建维优审核通过时间
   */
  gjwyCheckTime: {
    dataIndex: 'gjwyCheckTime',
    title: '规建维优审核通过时间',
  },
  /**
   * 提单人
   */
  submitUser: {
    dataIndex: 'submitUser',
    title: '提单人',
  },
  /**
   * 规建维优审核通过时间
   */
  submitTime: {
    dataIndex: 'submitTime',
    title: '提单时间',
  },
  /**
   * 更新时间
   */
  stateUpdateTime: {
    dataIndex: 'stateUpdateTime',
    title: '更新时间',
  },
  /**
   * 施工状态
   */
  processStatusName: {
    dataIndex: 'processStatusName',
    title: '施工状态',
  },
  /**
   * 施工人员
   */
  constructionStaffName: {
    dataIndex: 'constructionStaffName',
    title: '施工人员',
  },
  /**
   * 监理状态
   */
  supervisionStatusName: {
    dataIndex: 'supervisionStatusName',
    title: '监理状态',
  },
  /**
   * 监理负责人
   */
  supervisionManagerName: {
    dataIndex: 'supervisionManagerName',
    title: '监理负责人',
  },
  /**
   * 监理人员
   */
  supervisionStaffName: {
    dataIndex: 'supervisionStaffName',
    title: '监理人员',
  },
  /**
   * 施工开始时间
   */
  actualStartTime: {
    dataIndex: 'actualStartTime',
    title: '施工开始时间',
  },
  /**
   * 完工确认时间
   */
  finishConfirmTime: {
    dataIndex: 'finishConfirmTime',
    title: '完工确认时间',
  },

  /**
   * 站址名称
   */
  flied14: {
    dataIndex: 'flied10',
    title: '站址名称',
  },
  /**
   * 经度
   */
  flied141: {
    dataIndex: 'flied10',
    title: '经度',
  },
  /**
   * 纬度
   */
  flied142: {
    dataIndex: 'flied10',
    title: '纬度',
  },
  /**
   * 创建时间
   */
  createTime: {
    dataIndex: 'createTime',
    title: '创建时间',
    render: (v: number) => timeFormat(v),
  },
}

export const descriptionItems: Record<string, DescriptionsItemType> = {}
