export type ManagarChangeEchoModel = {
  /** 选址单位id */
  selectUnitId: number
  /** 选址单位名称 */
  selectUnitName: string
  /** 设计负责人Id */
  selectManagerUser: number
  /** 设计负责人姓名 */
  selectManagerUserName: string
  /** 选址负责人联系方式 */
  selectManagerPhone: string
  /** 业务表ID(站点主键id) */
  baseStationId: string
}
export type SecondChangeEchoModel = {
  /** 选址单位id */
  selectUnitId: number
  /** 选址单位名称 */
  selectUserName: string
  /** 选址人员联系方式 */
  selectUserPhone: string
  /** 业务表ID(站点主键id) */
  baseStationId: string
  /** 备注 */
  remark?: string
}
