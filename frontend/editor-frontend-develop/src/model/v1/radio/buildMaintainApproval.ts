export interface BuildMaintainDetailModel {
  /** 省分 */
  province?: string
  /** 地市 */
  city?: string
  /** 工单状态 */
  workOrderStatus?: string
  /** 工单状态名称 */
  workOrderStatusName?: string
  /** 第一个需求专业标签列表结构 */
  majorTabs?: {
    /** 需求专业 */
    majorType?: string
    /** 需求专业名称 */
    majorTypeName?: string
    /** 查询条件 */
    headerColumns?: Array<{
      /** 查询条件表单属性 */
      formItemProps?: {
        /** 查询条件英文字段 */
        name?: string
        /** 查证条件中文名 */
        label?: string
      }
      /** 查询内容 input select */
      content?: string
      /** 下拉选项 */
      contentProps?: {
        /** 下拉选项数组 */
        options?: Array<{
          /** 字典值 */
          value?: string
          /** 字典名称 */
          label?: string
        }>
      }
    }>
    /** 工具栏字典枚举 */
    tools?: string[]
    /** 列表表头 */
    columns?: Array<{
      /** 列名 */
      dataIndex?: string
      /** 列标题 */
      title?: string
    }>
    /** 子级列表表头 */
    expandColumns?: Array<{
      /** 列名 */
      dataIndex?: string
      /** 列标题 */
      title?: string
    }>
    /** 无线网搬迁获取详情信息时，逻辑站列表详情数据，不分页 */
  }[]
}
