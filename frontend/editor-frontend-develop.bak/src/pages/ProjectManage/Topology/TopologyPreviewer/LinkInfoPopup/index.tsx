import styles from './index.module.less'

import React, { useEffect, useState } from 'react'
import { Previewer } from '../../topology-engine'
import { IEdgeClickEvent, ILink } from '../../types'

interface IProps {
  previewer: Previewer
  isPopup?: boolean
}

export const LinkInfoPopup = (props: IProps) => {
  const { previewer, isPopup } = props
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<ILink>({
    link: '',
    src: { device: '', port: '' },
    dst: { device: '', port: '' },
    bandwidth: 0,
  })

  useEffect(() => {
    const onEdgeClick = (event: IEdgeClickEvent) => {
      const { data, x, y } = event

      setPosition({ left: x, top: y })
      setVisible(true)
      setData(data)
    }

    const onBlankClick = () => {
      setVisible(false)
    }

    previewer.bus.on('EDGE_CLICK', onEdgeClick)
    previewer.bus.on('NODE_CLICK', onBlankClick)
    previewer.bus.on('BLANK_CLICK', onBlankClick)
    return () => {
      previewer.bus.off('EDGE_CLICK', onEdgeClick)
      previewer.bus.off('NODE_CLICK', onBlankClick)
      previewer.bus.off('BLANK_CLICK', onBlankClick)
    }
  }, [previewer])

  return (
    <div
      className={styles.container}
      style={{
        display: visible ? 'block' : 'none',
        left: isPopup ? 525 : position.left,
        top: isPopup ? 48 : position.top,
      }}
    >
      <div className={styles.item}>
        <span className={styles.itemLabel}>Link:</span>
        <span className={styles.itemValue}>{data.link}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>SRC:</div>
      <div className={styles.item}>
        <span className={styles.itemLabel}>device:</span>
        <span className={styles.itemValue}>{data.src.device}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.itemLabel}>port:</span>
        <span className={styles.itemValue}>{data.src.port}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>DST:</div>
      <div className={styles.item}>
        <span className={styles.itemLabel}>device:</span>
        <span className={styles.itemValue}>{data.dst.device}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.itemLabel}>port:</span>
        <span className={styles.itemValue}>{data.dst.port}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>
        <span className={styles.itemLabel}>Bandwidth:</span>
        <span className={styles.itemValue}>{data.bandwidth}</span>
      </div>
    </div>
  )
}
