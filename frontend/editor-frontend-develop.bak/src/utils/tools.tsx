import type { ResponseBody } from '@/api/axios'
import type { ValidateErrorEntity } from 'rc-field-form/lib/interface'

import { useWebSocket } from 'ahooks'
import { Button, FormInstance, ModalProps } from 'antd'
import dayjs from 'dayjs'
import React from 'react'

import { message, modal } from '@/App'
import { fetchPasswordTactics } from '@/api/v1/system'
import { useButtonDealAuth } from '@/stores'
import { isArray, isObject, isString } from '@renzp/utils'
import storage, { TOKEN } from './storage'

/**
 * 判断是否未定义
 * @param v 变量
 * @returns 如果变量定义则返回true,否则返回false
 */
export const isUndef = (v: unknown): boolean => v === undefined || v === null

/**
 * 格式化时间戳
 * @param time 时间戳
 * @param format 格式
 * @returns 时间
 */
export const timeFormat = (time: number | undefined, format = 'YYYY-MM-DD HH:mm:ss'): string => {
  if (time) {
    const date = dayjs(time)
    if (date.isValid()) {
      return date.format(format)
    }
  }

  return ''
}
/**
 * 清除对象中的字符串前后空格
 * @param target 目标对象
 * @returns 去除前后空格后的对象
 */
export const recordValueTrim = (target: Record<string, any>) => {
  // 不为空且是对象或数组
  if (isObject(target)) {
    // 如果数组则使用数组解构，如果是对象则使用对象结构
    const query: any = isArray(target) ? [...target] : { ...target }
    const keys = Object.keys(query)
    for (const key of keys) {
      // 是string则进行trim
      if (isString(query[key])) {
        query[key] = (query[key] as string).trim()
        continue
      }
      // 如果是数组，则递归处理
      if (isArray(query[key])) {
        query[key] = query[key].map((item: any) => {
          return typeof item === 'string' ? item.trim() : recordValueTrim(item)
        })
        continue
      }
      // 如果是对象则处理对象
      if (typeof query[key] === 'object') {
        query[key] = recordValueTrim(query[key])
      }
    }

    return query
  }

  return target
}
type FlattenDeepByKey<T = any> = (list: Array<T>, key: string) => Array<T>
/**
 * 通过指定key深度递归扁平化数组
 * @param list 要扁平化的数组
 * @param key 扁平化依据的字段
 * @returns 返回扁平化后的数组
 */
export const flattenDeepByKey: FlattenDeepByKey = (list, key) => {
  return list.reduce(
    (prev: Parameters<FlattenDeepByKey>[0], curr: Parameters<FlattenDeepByKey>[0][0]) => [
      ...prev,
      curr,
      ...(curr[key] ? flattenDeepByKey(curr[key], key) : []),
    ],
    [],
  ) as ReturnType<FlattenDeepByKey>
}
export type classNamesOptions = Array<Record<string, any> | string> | Record<string, any> | string
/**
 * 根据条件判断生产className
 * @param options classNamesOptions
 * @returns 返回实际渲染的className
 */
export const classNames = (options: classNamesOptions): string | undefined => {
  if (isString(options)) {
    return options
  }

  if (isArray(options)) {
    return options.map(classNames).join(' ')
  }

  const isDef = !isUndef(options)
  if (isDef && typeof options === 'object') {
    return Object.keys(options)
      .filter((key: string) => !!options[key])
      .join(' ')
  }

  return undefined
}
/**
 * 将数字转换为千分位分隔的字符串
 * @param value 千分位分隔
 * @param decimalZeroCount 小数位补0的个数
 * @returns 返回千分位分隔的字符串
 */
export const thousandthSeparate = (value: number | string, decimalZeroCount = 0) => {
  if (!value && value !== 0) {
    return ''
  }

  const values = value.toString()?.split('.')
  values[0] = values[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  if (decimalZeroCount) {
    if (values.length === 1) {
      values.push(''.padStart(decimalZeroCount, '0'))
    } else {
      values[1] = values[1].padEnd(decimalZeroCount, '0')
    }
  }

  return values.join('.')
}
export type UnitOfTime =
  | 'd'
  | 'day'
  | 'days'
  | 'h'
  | 'hour'
  | 'hours'
  | 'm'
  | 'M'
  | 'millisecond'
  | 'milliseconds'
  | 'minute'
  | 'minutes'
  | 'month'
  | 'months'
  | 'ms'
  | 's'
  | 'second'
  | 'seconds'
  | 'w'
  | 'week'
  | 'weeks'
  | 'y'
  | 'year'
  | 'years'

export function timeFormatRange(timeStamp: dayjs.Dayjs | number, unitOfTime?: UnitOfTime): number
export function timeFormatRange(
  timeStamp: Array<dayjs.Dayjs | number>,
  unitOfTime?: UnitOfTime,
): Array<number>

/**
 * 将时间戳转换为指定格式的开始时间和结束时间
 * @param timeStamp 需要转换的时间戳
 * @param unitOfTime 转换的格式
 * @returns 如果timeStamp参数是number，则返回指定格式的开始时间。
 * 如果是数组，返回一个数组，第一个元素转换为指定格式的开始时间，第二个元素转换为指定格式的结束时间。
 */
export function timeFormatRange(
  timeStamp: Array<dayjs.Dayjs | number> | dayjs.Dayjs | number,
  unitOfTime: UnitOfTime = 'days',
): number | number[] | undefined {
  if (!isUndef(timeStamp)) {
    if (typeof timeStamp === 'number') {
      return dayjs(timeStamp).startOf(unitOfTime).valueOf()
    }

    if (dayjs.isDayjs(timeStamp)) {
      return timeStamp.startOf(unitOfTime).valueOf()
    }

    const [start, end] = timeStamp
    return [
      (dayjs.isDayjs(start) ? start : dayjs(start)).startOf(unitOfTime).valueOf(),
      (dayjs.isDayjs(end) ? end : dayjs(end)).endOf(unitOfTime).valueOf(),
    ]
  }

  return undefined
}

export interface WebSocketDataExtendFields {
  // 页数
  pageNo: number
  // 每页大小
  pageSize: number
  // 基站ID
  stationId: number
  // 树的节点
  treeKey: string
}
export interface WebSocketData {
  // 跳转需要的业务id
  businessId?: number
  extendFields: WebSocketDataExtendFields
  // 文件编号
  fileNo?: string
  // 消息内容
  message: string
  // 一级类型 1导出任务 2配置任务 3任务管理4.刷新配置
  messageType: number
  // 二级类型 1导出 2配置任务-重启 3配置任务-恢复出厂设置 4配置任务-锁定 5配置任务-解锁 6配置任务-运行 7配置任务-暂停 8配置任务-参数配置 9任务管理-重启 10任务管理-恢复出厂设置 11批处理 12同步告警13.刷新-同步配置14.刷新-参数树16.刷新-全局配置
  messageTypeSub: number
}
/**
 * 使用webSocket
 * @param onMessage 消息回调函数
 */
export const useAppWebSocket = (
  onMessage?: (
    data: ResponseBody<WebSocketData>,
    message: MessageEvent<{ data: WebSocketData }>,
    instance: WebSocket,
  ) => void,
) => {
  let { hostname, port } = window.location
  // 本地开发使用开发环境
  if (['127.0.0.1', 'localhost'].includes(hostname)) {
    hostname = '10.10.48.32'
    port = '40299'
  }
  const wsPort: Record<string, string> = {
    // 开发
    '40284': '40299',
    // 本地
    '40299': '40299',
    // 测试
    '40305': '40319',
    // 预生产
    '40359': '40355',
    // 生产
    '8099': '8099',
  }

  const token = storage.get(TOKEN)
  const url = `ws://${hostname}:${wsPort[port]}/api/omc/v1/websocket/connect`
  const protocol = window.encodeURIComponent(token as string)
  useWebSocket(url, {
    onMessage: (e, instance) => {
      if (e?.data) {
        onMessage?.(JSON.parse(e.data), e, instance)
      }
    },
    protocols: [protocol],
    reconnectInterval: 3 * 1000,
    reconnectLimit: 3,
  })
}
/**
 * 复制文本
 * @param text 复制内容
 */
export const copyText = (text: string) => {
  // navigator.clipboard只能用于https或者localhost。
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  const input = document.createElement('input')
  document.body.appendChild(input)
  input.value = text
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
  return Promise.resolve()
}
/**
 * 根据密码策略详情获取
 * @param token 用户token，首次登录时修改密码时需要手动传入token
 * @returns [密码策略字符串，密码策略数据]
 */
export const getPasswordRuleMsg = async (token?: string) => {
  const { data } = await fetchPasswordTactics(token)
  const {
    blankFlag,
    letterMin,
    lowerMin,
    numberMin,
    passwordCharMax,
    passwordCharMin,
    reversePositiveFlag,
    specialCharactersMin,
    uppercaseMin,
  } = data ?? {}
  let ruleMsg = ''
  // 范围规则
  if (passwordCharMin && passwordCharMax) {
    ruleMsg += `密码需包含${passwordCharMin}~${passwordCharMax}个字符`
  }
  // 包含规则
  if (letterMin || uppercaseMin || lowerMin || numberMin || specialCharactersMin) {
    ruleMsg += `${ruleMsg ? '，' : ''}其中至少包含`
    ruleMsg += letterMin ? `字母${letterMin}个、` : ''
    ruleMsg += uppercaseMin ? `大写字母${uppercaseMin}个、` : ''
    ruleMsg += lowerMin ? `小写字母${lowerMin}个、` : ''
    ruleMsg += numberMin ? `数字${numberMin}个、` : ''
    ruleMsg += specialCharactersMin ? `特殊字符${specialCharactersMin}个、` : ''
    // 去掉最后一个顿号(、)
    ruleMsg = ruleMsg.slice(0, ruleMsg.length - 1)
  }
  // 空格规则
  if (blankFlag === '1') {
    ruleMsg += `${ruleMsg ? '，' : ''}密码不允许包含空格`
  }
  // 空格规则
  if (reversePositiveFlag === '1') {
    ruleMsg += `${ruleMsg ? '，' : ''}不能包含账号正序和倒序排列`
  }

  return [ruleMsg, data]
}
export interface FormValidateFieldsSCrollToFirstErrorOptions {
  modalProps?: Omit<ModalProps, 'content'>
  showMessage?: { count: number } | boolean
}

/**
 * 调用form.validateFields并滚动到第一个错误位置
 * @param form 表单实例
 * @returns 同form.validateFields
 */
export const formValidateFieldsSCrollToFirstError = async (
  form: FormInstance,
  options?: FormValidateFieldsSCrollToFirstErrorOptions,
) => {
  const { modalProps, showMessage } = options ?? {}

  try {
    return await form.validateFields()
  } catch (error: unknown) {
    const errorInfo = error as ValidateErrorEntity<any>
    if (showMessage) {
      const defaultErrorMsgCount = 3
      const errorMsgList = errorInfo.errorFields.map(item => item.errors)
      const count =
        typeof showMessage !== 'boolean'
          ? (showMessage?.count ?? defaultErrorMsgCount)
          : defaultErrorMsgCount
      const showErrorMsgList = errorMsgList.splice(0, count)

      modal.warning({
        content: (
          <>
            {showErrorMsgList.map((item, index) => (
              <div key={`${item.toString()}_${index}`}>{item.toString()}</div>
            ))}
            {showErrorMsgList.length === errorMsgList.length ? null : '...'}
          </>
        ),
        title: modalProps?.title ?? '提醒',
      })
    }

    form.scrollToField(errorInfo.errorFields[0].name)
    throw error
  }
}
/**
 * 获取uuid
 */
export const getUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (c === 'x' ? (Math.random() * 16) | 0 : 'r&0x3' | '0x8').toString(16),
  )
}

/**
 * 将对象中的数组转换为逗号分隔的字符串
 */
export const objectArrayFiledToString = (data: any) => {
  return Object.keys(data).reduce((prev, key) => {
    return {
      ...prev,
      [key]: isArray(data[key]) ? data[key].toString() : data[key],
    }
  }, {} as any)
}
/**
 * 列表页删除和批量删除按钮
 * @param deleteApiFn 删除Api函数
 * @param setRowSelectKeys 复选框数据
 * @param refresh 操作成功之后刷新列表函数
 */
export const useRemoveBtn = (
  deleteApiFn: (ids: string[]) => any,
  setRowSelectKeys: any,
  refresh: any,
  isDealAuthCheck = true,
) => {
  const hasDealAuth = useButtonDealAuth()

  // 批量删除
  const onBatchRemove = (ids: string | string[]) => {
    const isBatch = isArray(ids)
    const idList = isBatch ? ids : [ids]
    modal.confirm({
      title: '删除提示',
      content: `${isBatch ? `已选中${idList.length}项,` : ''}删除后对应记录将不存在，是否确认删除?`,
      async onOk() {
        const { msg } = await deleteApiFn(idList)
        setRowSelectKeys([])
        message.success(msg)
        refresh()
      },
    })
  }

  const getRemoveBtn = (record: any, disabled?: boolean) => {
    return (
      <Button
        className="g-action-link"
        type="link"
        size="small"
        danger
        disabled={isDealAuthCheck ? !hasDealAuth(record) || disabled : (disabled ?? false)}
        onClick={() => onBatchRemove(record.id)}
      >
        删除
      </Button>
    )
  }

  const getBatchRemoveBtn = (rowSelectKeys: any[]) => {
    return (
      <Button
        type="primary"
        ghost
        danger
        disabled={!rowSelectKeys.length}
        onClick={() => onBatchRemove(rowSelectKeys as string[])}
      >
        批量删除
      </Button>
    )
  }

  return { getRemoveBtn, getBatchRemoveBtn, onBatchRemove }
}
