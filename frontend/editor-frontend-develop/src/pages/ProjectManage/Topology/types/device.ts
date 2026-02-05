import device1 from '../../../../assets/svg/devices/device1.svg?url'
import device2 from '../../../../assets/svg/devices/device2.svg?url'
import device3 from '../../../../assets/svg/devices/device3.svg?url'
import device4 from '../../../../assets/svg/devices/device4.svg?url'
import device5 from '../../../../assets/svg/devices/device5.svg?url'

// export enum DeviceTypes {
//   Type1 = '接入级多模态网元-7132',
//   Type2 = '核心级多模态网元-8180',
//   Type3 = 'Tofino芯片P4交换机',
//   Type4 = 'Behavioral Model v2',
//   Type5 = '虚拟网元',
// }

// export const DeviceTypeNames = {
//   [DeviceTypes.Type1]: '接入级多模态网元-7132',
//   [DeviceTypes.Type2]: '核心级多模态网元-8180',
//   [DeviceTypes.Type3]: 'Tofino芯片P4交换机',
//   [DeviceTypes.Type4]: 'Behavioral Model v2',
//   [DeviceTypes.Type5]: '虚拟网元',
// }

// export const Devices = [
//   { label: DeviceTypeNames[DeviceTypes.Type1], value: DeviceTypes.Type1, icon: device1 },
//   { label: DeviceTypeNames[DeviceTypes.Type2], value: DeviceTypes.Type2, icon: device2 },
//   { label: DeviceTypeNames[DeviceTypes.Type3], value: DeviceTypes.Type3, icon: device3 },
//   { label: DeviceTypeNames[DeviceTypes.Type4], value: DeviceTypes.Type4, icon: device4 },
//   { label: DeviceTypeNames[DeviceTypes.Type5], value: DeviceTypes.Type5, icon: device5 },
// ]

export interface IDevice {
  /** 设备名称 */
  deviceName: string
  /** 设备型号 */
  deviceClass: string
  /** 设备形态 */
  deviceForm: string
  /** 端口形态 */
  portForm: string
  /** 交换容量 */
  capacity: string
  /** 包转发率 */
  rate: string
  /** CPU系统 */
  system: string
  /** SSD */
  ssd: string
}
