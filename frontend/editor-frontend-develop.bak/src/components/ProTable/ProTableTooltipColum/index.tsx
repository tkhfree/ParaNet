import { Typography } from 'antd'
import { TextProps } from 'antd/es/typography/Text'
import React from 'react'
import './index.less'

export interface ProTableTooltipColumProps extends TextProps {}

const ProTableTooltipColum = (props: ProTableTooltipColumProps) => {
  return <Typography.Text {...props} className={`pro-table-tooltip-colum ${props?.className}`} />
}

export default ProTableTooltipColum
