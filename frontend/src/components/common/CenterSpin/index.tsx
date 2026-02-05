import { Spin } from 'antd'
import React from 'react'
import styles from './index.module.less'

interface CenterSpinProps {
  tip?: string
  size?: 'small' | 'default' | 'large'
}

export const CenterSpin: React.FC<CenterSpinProps> = ({ 
  tip = '加载中...', 
  size = 'large' 
}) => {
  return (
    <div className={styles.container}>
      <Spin tip={tip} size={size}>
        <div className={styles.content} />
      </Spin>
    </div>
  )
}

export default CenterSpin
