import React from 'react'

import './index.less'

export interface OptGroupLabelProps {
  children?: React.ReactNode
}

const OptGroupLabel = (props: OptGroupLabelProps) => {
  return (
    <div className="pro-select-group-label">
      <div className="pro-select-group-label__content">{props?.children}</div>
    </div>
  )
}

export default OptGroupLabel
