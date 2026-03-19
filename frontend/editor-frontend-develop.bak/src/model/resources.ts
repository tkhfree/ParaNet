export interface TRouteModel {
  /** 路由型号 */
  name: string
  /** 星间链路口数量 */
  interStarNum: number
  /** 星间链路口支持带宽
字典 route_band_width */
  interStarBandwidth: number[]
  /** 馈电链路口数量 */
  feedNum: number
  /** 馈电链路口支持带宽
字典 route_band_width */
  feedBandwidth: number
  /** 内部转发口数量 */
  transpondNum: number
  /** 内部转发口带宽
字典 route_band_width */
  transpondBandwidth: number
  /** 最大转发速率 */
  maxTranspond: number
  /** 备注 */
  remark: string
  /** 是否公开 0 公开 1 私有
字典authority */
  isPublic: number
  /** id */
  id: string
  /** 更新时间 */
  updateTime: string
  /** 操作人id */
  updateBy: string
  /** 操作人名 */
  updateByName: string
}

export interface ResourcesConstellationModel {
  /** 唯一id */
  id: string
  /** 星座名称 */
  name?: string
  /** 生成方式，0：手动导入，1：单星TLE解析，2：多星TLE解析 */
  generateType?: number
  generateTypeName?: string
  /** 生成方法，0：walker-delta，1：walker-star */
  generateFunction?: number
  generateFunctionName?: string
  /** 轨道个数 */
  planeCount?: number
  /** 轨道卫星个数 */
  planeSataCount?: number
  /** 相位因子 */
  planeOffset?: number
  /** 半长轴，m */
  semiMajorAxis?: number
  /** 离心率 */
  eccentricity?: number
  /** 轨道倾角，° */
  inclination?: number
  /** 近心点辐角，° */
  argumentOfPeriapsis?: number
  /** 升交点赤经，° */
  raan?: string
  /** 真近点角，° */
  trueAnomaly?: string
  /** 平均运动关于时间的一阶倒数，° */
  drag?: string
  /** 平均运动关于时间的二阶倒数，° */
  nddot6?: string
  /** B°阻力系数，° */
  bstar?: string
  /** 轨道预测类型，0：TWO_BODY:1：SGP4 */
  orbitType?: number
  orbitTypeName?: string
  /** 星座仿真起始时间，unix时间戳，秒 */
  startTime?: number
  /** 星座仿真结束时间，unix时间戳，秒 */
  endTime?: number
  /** 星座仿真时间间隔，秒 */
  timeStep?: number
  // 时区
  timezone?: number
  timezoneName?: string
  islRole?: null
  rocketId?: null
  deployCost?: null
  maintenanceCost?: null
  /** 创建时间 */
  createTime?: null
  /** 创建者id */
  createBy?: null
  createByName?: null
  isPublic?: null
  deleteFlag?: boolean
  /** 卫星列表 */
  satelliteList: Array<any>
  tleFileNo: string
  tleFileName: string
  raanIncrement: string
  meanAnomalyPhasing: string
}
