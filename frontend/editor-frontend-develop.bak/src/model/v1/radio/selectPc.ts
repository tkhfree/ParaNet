export type TemplateModel = {
  id?: number
  /** 关联模板表id */
  templateId?: number
  /** 关联模板字段定义表id */
  fieldId?: number
  /** 关联业务表id */
  objectId?: number
  /** 表单模板类型(0:基站选址1:基站设计) */
  templateType?: number
  /** 字段级别 */
  fieldLevel?: string
  /** 字段归类 */
  classiName?: string
  /** 字段所属单元 */
  theUnit?: string
  /** 字段名称 */
  fieldName?: string
  /** 字段英文名称 */
  fieldEn?: string
  /** 单位 */
  fieldUnit?: string
  /** 是否显示(1：显示，0：不显示') */
  isShow?: number
  /** 展示形式  EDIT_TYPE */
  fieldType?: number
  /** 展示形式（中文名称） */
  fieldTypeName?: string
  /** 格式 */
  fieldFmt?: string
  /** 候选值/默认值 */
  candidateValue?: string
  /** 多媒体信息(环拍(0455)、拍照) */
  multimedia?: string
  /** 是否必填(1：必填，0：不必填) */
  isFill?: number
  /** 显示颜色 */
  showColor?: string
  /** 字段说明 */
  explain?: string
  /** 字段排序 */
  fieldOrder?: number
  /** 是否固定字段(1:固定字段，0：动态字段) */
  isFixed?: number
  /** 操作方式(1.不修改，2.APP/PC修改，3.PC修改，4.APP修改) */
  operationMode?: number
  /** 备注 */
  remark?: string
  valueInField?: string
  /** 是否文件 */
  isFile?: number
  /** 文件表id（多个;分割) */
  fileIds?: string
  /** 文件路径（多个;分割） */
  fileRelativePath?: string
  jsonData?: string
  createTime?: string
  createUser?: string
  createUsername?: string
  updateTime?: string
  updateUser?: string
  updateUsername?: string
}

export type SelectPcInfoModel = {
  /** 服务商信息 */
  serviceProviderVO?: {
    /** 选址单位id */
    selectUnitId?: number
    /** 选址单位名称 */
    selectUnitName?: string
    /** 选址负责人oaAccount */
    selectManagerUser?: number
    /** 选址负责人oaAccount */
    selectManagerUserName?: string
    /** 选址负责人联系方式 */
    selectManagerUserPhone?: string
    /** 选址人员oaAccount */
    selectUser?: number
    /** 选址人员 */
    selectUserName?: string
    /** 选址人员联系方式 */
    selectUserPhone?: string
    /** 要求完成时间 */
    selectRequireTime?: number
  }
  /** 动态模版数据 */
  instanceList?: Array<TemplateModel>
  /** 选址阶段内部状态 */
  selectInternalStatus?: number
}
