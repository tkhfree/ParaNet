import React from 'react'
import { FullscreenOutlined } from '@ant-design/icons'
import styles from './index.module.less'

interface IProps {
  onPopup: () => void
}

export const ToolBar: React.FC<IProps> = ({ onPopup }) => (
  <div className={styles.container}>
    <span className={styles['popup-btn']} onClick={onPopup} title="全屏预览">
      <FullscreenOutlined />
    </span>
  </div>
)
