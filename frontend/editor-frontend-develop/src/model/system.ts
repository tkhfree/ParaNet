import { SYSTEM_ENV } from '@/utils/constants'

// 用户信息数据模型
export interface UserInfoModel {
  /** 用户id */
  userId: number
  /** 用户名 */
  username: string
  /** 用户电子邮件 */
  userEmail: string
  /** 昵称 */
  nickname: string
  /** 电话 */
  phone: string
  /** 用户在系统内配置的所有专业 */
  allMajor: Array<MajorModel>
  /** 登录专业的用户级别 */
  loginLevel: {
    /** 编码 */
    code: string
    /** 名称 */
    name: string
  }
  /** 当前登录的专业 */
  loginMajor: MajorModel
  /** 角色列表 */
  roleList: Array<{
    id: number
    roleName: string
    roleDesc: string
  }>
}
// 用户信息部门数据模型
export interface RoleModel {
  id: number
  // 角色描述
  roleDesc: string
  // 角色名
  roleName: string
}

//  用户专业数据模型
export interface MajorModel {
  // 专业编码
  code: string
  // 专业名称
  name: string
}

// 字典数据
export interface BaseDataDict {
  code: string
  name: string
}
// 系统配置数据
export interface SystemConfigModel {
  captchaSwitch?: boolean
  // local：本地 test：测试 develop：开发 uat：预生产 production：生产 yace：压测 trial：试点
  systemEnv: SYSTEM_ENV
}
