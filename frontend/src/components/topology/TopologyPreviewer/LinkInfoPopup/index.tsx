import React, { useEffect, useState } from 'react'
import type { IEdgeClickEvent, ILink } from '@/model/topology'
import type { Previewer } from '../../topology-engine'
import styles from './index.module.less'

interface IProps {
  previewer: Previewer
  isPopup?: boolean
}

const emptyLink: ILink = {
  link: '',
  src: { device: '', port: '' },
  dst: { device: '', port: '' },
  bandwidth: 0,
}

export const LinkInfoPopup: React.FC<IProps> = ({ previewer, isPopup }) => {
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<ILink>(emptyLink)

  useEffect(() => {
    const onEdgeClick = (event: IEdgeClickEvent) => {
      setPosition({ left: event.x, top: event.y })
      setVisible(true)
      setData(event.data)
    }
    const onBlank = () => setVisible(false)
    previewer.bus.on('EDGE_CLICK', onEdgeClick)
    previewer.bus.on('NODE_CLICK', onBlank)
    previewer.bus.on('BLANK_CLICK', onBlank)
    return () => {
      previewer.bus.off('EDGE_CLICK', onEdgeClick)
      previewer.bus.off('NODE_CLICK', onBlank)
      previewer.bus.off('BLANK_CLICK', onBlank)
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
        <span className={styles['item-label']}>Link:</span>
        <span className={styles['item-value']}>{data.link}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>SRC:</div>
      <div className={styles.item}>
        <span className={styles['item-label']}>device:</span>
        <span className={styles['item-value']}>{data.src.device}</span>
      </div>
      <div className={styles.item}>
        <span className={styles['item-label']}>port:</span>
        <span className={styles['item-value']}>{data.src.port}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>DST:</div>
      <div className={styles.item}>
        <span className={styles['item-label']}>device:</span>
        <span className={styles['item-value']}>{data.dst.device}</span>
      </div>
      <div className={styles.item}>
        <span className={styles['item-label']}>port:</span>
        <span className={styles['item-value']}>{data.dst.port}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>
        <span className={styles['item-label']}>Bandwidth:</span>
        <span className={styles['item-value']}>{data.bandwidth}</span>
      </div>
    </div>
  )
}
