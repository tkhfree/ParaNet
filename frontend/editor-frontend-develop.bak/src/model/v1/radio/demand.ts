import { ProTableProps } from '@/components/ProTable'
import { ProTableHeaderColumn } from '@/components/ProTable/ProTableHeader'

export interface RadioDemandConfigModel {
  /** 需求专业 */
  majorType?: string
  /** 需求专业名称 */
  majorTypeName?: string
  /** 查询条件 */
  headerColumns?: Array<
    Omit<ProTableHeaderColumn, 'content'> & {
      content: string
      contentProps?: any
    }
  >
  /** 工具栏字典枚举 */
  tools?: string[]
  /** 列表表头 */
  columns?: ProTableProps['columns']
  /** 子级列表表头 */
  expandColumns?: Array<{
    /** 列名 */
    dataIndex?: string
    /** 列标题 */
    title?: string
  }>
}

export interface RadioDemandDetailModel {
  workOrderNo?: string
  /** 基本详情信息 */
  labelValues?: Array<{
    /** 字典值 */
    value?: string
    /** 字典名称 */
    label?: string
  }>
  /** 无线网搬迁逻辑站列表信息 */
  logicalInfo?: RadioDemandConfigModel & {
    dataSource?: ProTableProps['dataSource']
  }
}

export interface checkModel {
  /** 工单号 */
  workOrderNo: string
  /** 审核状态 */
  checkStatus: number
  /** 审核描述 */
  checkDesc?: string
  /** 下一步用户 */
  nextUserId: number
}
