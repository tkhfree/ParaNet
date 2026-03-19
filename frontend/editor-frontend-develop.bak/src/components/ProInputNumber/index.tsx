import type { InputNumberProps } from 'antd'

import { InputNumber } from 'antd'
import React from 'react'

import { DEFAULT_INPUT_NUMBER_PROPS } from '@/utils/constants'

import './index.less'

const ProInputNumber = (props: InputNumberProps) => {
  return <InputNumber {...DEFAULT_INPUT_NUMBER_PROPS} {...props} />
}

export default ProInputNumber
