import { TreeSelect, TreeSelectProps } from 'antd'
import React from 'react'

import { PLACEHOLDER } from '@/utils/constants'

import './index.less'

const ProTreeSelect = (props: TreeSelectProps) => {
  return (
    <TreeSelect
      allowClear
      dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
      placeholder={PLACEHOLDER.SELECT}
      showSearch
      {...props}
    />
  )
}

export default ProTreeSelect
