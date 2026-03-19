export interface UserInfoModel {
  /** 用户id */
  userId?: number
  /** 用户名 */
  username?: string
  /** 用户电子邮件 */
  userEmail?: string
  /** 昵称 */
  nickname?: string
  /** 电话 */
  phone?: string
  /** 用户在系统内配置的所有专业 */
  allMajor?: Array<{
    /** 专业编码 */
    code?: number
    /** 专业名称 */
    name?: string
  }>
  /** 登录专业的用户级别
1-集团用户
2-省分用户
3-地市用户 */
  loginLevel?: {
    /** 编码 */
    code?: string
    /** 名称 */
    name?: string
  }
  /** 当前登录的专业 */
  loginMajor?: {
    /** 专业编码 */
    code?: number
    /** 专业名称 */
    name?: string
  }
  /** 当前登录的合作公司 */
  cooperative?: {
    /** 合作公司ID */
    id: number
    /** 合作公司名称 */
    name: string
    /** 合作公司类型 */
    type?: number[]
  }
  /** 角色列表 */
  roleList?: Array<{
    id: number
    roleName: string
    roleDesc?: string
  }>
  /** 服务区域 */
  serviceArea?: Array<{
    /** 区域ID */
    id: number
    /** 区域级别 */
    level: string
    /** 区域名称 */
    name: string
    /** 下级区域 */
    children?: Array<{
      /** 区域ID */
      id?: number
      /** 区域级别 */
      level?: string
      /** 区域名称 */
      name?: string
      /** 下级区域 */
      children?: any[]
    }>
  }>
}

//  用户专业数据模型
export interface MajorModel {
  // 专业编码
  code: string
  // 专业名称
  name: string
}

export interface LoginParams {
  captcha?: string
  // 密码
  password: string
  // 账号
  username: string
  uuid?: string
}
export interface LoginResult {
  // 账号到期前提示code
  accountDueCode: number
  // 账户到期提示msg
  accountDueMsg: string
  // 是否首次登录 true 首次登录 false 非首次登录
  firstLoginFlag: boolean
  // 密码到期code
  passwordDueCode: number
  // 密码到期提示信息
  passwordDueMsg: string
  sysLoginUserDetail: UserInfoModel
  token: string
}

export type LoginMajorParams = {
  /** 登录专业编码 */
  major: number
}
export interface LoginMajorModel {
  /** 系统定义的业务错误码（非HTTP标准状态码）
// @see ErrorCodeEnum */
  code?: number
  /** 系统定义的业务错误信息
//  @see ErrorCodeEnum */
  msg?: string
  /** 本次请求的返回值 */
  data?: any
}
