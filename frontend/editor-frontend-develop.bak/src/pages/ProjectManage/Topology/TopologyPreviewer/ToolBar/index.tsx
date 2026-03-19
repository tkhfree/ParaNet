import styles from './index.module.less'

import React from 'react'

interface IProps {
  onPopup: () => void
}

export const ToolBar = (props: IProps) => {
  const { onPopup } = props

  return (
    <div className={styles.container}>
      <div className={styles.topologyPopupIcon} onClick={onPopup} />
    </div>
  )
}
