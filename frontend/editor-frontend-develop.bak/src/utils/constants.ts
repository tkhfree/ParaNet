export type ReadonlyRecord<T = unknown> = Readonly<Record<string, T>>

// 按钮Key
export enum BUTTON_KEY {
  // 添加
  ADD = 'ADD',
  // 批量删除
  BATCH_DELETE = 'BATCH_DELETE',
  // 删除
  DELETE = 'DELETE',
  // 详情
  DETAIL = 'DETAIL',
  // 编辑
  EDIT = 'EDIT',
  // 导出
  EXPORT = 'EXPORT',
  // 导入
  IMPORT = 'IMPORT',
}

// 最大字符
export enum MAX_CHAR_SIZE {
  // 单行
  INPUT = 200,
  // 多行
  TEXTAREA = 1000,
}

// placeholder默认
export enum PLACEHOLDER {
  // 单行输入
  INPUT = '请输入',
  // 数字输入
  INPUT_NUMBER = '请输入',
  // 选择(所有通过选择得到的值都使用此值)
  SELECT = '请选择',
  // 多行输入
  TEXTAREA = '请输入',
}
// 数字输入的默认配置
export const DEFAULT_INPUT_NUMBER_PROPS: ReadonlyRecord = {
  max: 999999999999,
  placeholder: PLACEHOLDER.INPUT_NUMBER,
  precision: 2,
}
// 单行输入的默认配置
export const DEFAULT_INPUT_PROPS: ReadonlyRecord = {
  allowClear: true,
  autoComplete: 'new-password',
  maxLength: MAX_CHAR_SIZE.INPUT,
  placeholder: PLACEHOLDER.INPUT,
}
// 下拉选择的默认配置
export const DEFAULT_SELECT_PROPS: ReadonlyRecord = {
  allowClear: true,
  // 下拉搜索使用label搜索
  optionFilterProp: 'label',
  placeholder: PLACEHOLDER.SELECT,
  showSearch: true,
  // 取消虚拟滚动，为了实现左右滚动
  virtual: false,
}

// 文件大小，单位：MB
export const MAX_FILE_SIZE = 200
// 文件类型
export const FILE_TYPES = [
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.zip',
  '.7z',
  '.rar',
  '.txt',
  '.pdf',
  '.wps',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.png',
  '.psd',
  '.wmv',
  '.asf',
  '.rm',
  '.rmvb',
  '.mov',
  '.mp4',
  '.avi',
  '.wav',
  '.mp3',
  '.acc',
  '.m4a',
]

export const fileTypesTips = `支持扩展名：${FILE_TYPES.join('、')}`

// 最大上传的文件个数
export const MAX_FILE_COUNT = 9

export const DEFAULT_PAGE_SIZE = 10

/**
 * 字典类型
 */
export enum DICTIONARY_TYPE {
  /**专业类型 */
  WIRELESS_MAJORC = 'wireless_majorC',
  /**流程阶段 （站点进度） */
  PROCESS_STAGE = 'process_stage',
  /**流程阶段 （站点进度） */
  STAGE_STATUS = 'stage_status',
  /**站点类型） */
  SITE_TYPE = 'site_type',
  /**网络制式 */
  NETWORK_STANDARD = 'network_standard',
  /** 建设方式 */
  CONSTRUCTION_METHOD = 'construction_method ',
  /** 施工 工序类型 */
  PROCESS_NAME = 'process_name',
}
// 系统环境标识
export enum SYSTEM_ENV {
  DEVELOP = 'develop',
  LOCAL = 'local',
  PRODUCTION = 'production',
  TEST = 'test',
  TRIAL = 'trial',
  UAT = 'uat',
  YACE = 'yace',
}

/**
 * 业务阶段BizTypeEnum
 */
export enum BIZ_TYPE {
  /**101：规建维优审核阶段 */
  BUILD_MAINTAIN_APPLICATION = 101,
  /**102：选址阶段 */
  SITE_SELECTION_APPLICATION = 102,
  /**103：勘察阶段 */
  SURVEY_DESIGN_APPLICATION = 103,
  /**104：施工阶段 */
  CONFIRMATION_COMPLETION_APPLICATION = 104,
}

export const inputRequiredRules = [{ required: true, message: '请输入' }]
export const selectRequiredRules = [{ required: true, message: '请选择' }]
