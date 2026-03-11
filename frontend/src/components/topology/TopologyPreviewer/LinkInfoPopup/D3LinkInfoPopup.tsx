/**
 * D3 版本连线信息弹窗
 */

import React, { useEffect, useState } from 'react'
import type { D3Previewer, D3Link } from '../../d3-engine'
import styles from './index.module.less'

interface IProps {
  previewer: D3Previewer
  isPopup?: boolean
}

export const D3LinkInfoPopup: React.FC<IProps> = ({ previewer, isPopup }) => {
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<{
    id: string
    srcDevice: string
    srcPort: string
    dstDevice: string
    dstPort: string
    bandwidth: number
  }>({
    id: '',
    srcDevice: '',
    srcPort: '',
    dstDevice: '',
    dstPort: '',
    bandwidth: 0,
  })

  useEffect(() => {
    const onLinkClick = (event: { link: D3Link; x: number; y: number }) => {
      const { link, x, y } = event
      setPosition({ left: x, top: y })
      setVisible(true)

      const srcId = typeof link.source === 'string' ? link.source : link.source.id
      const dstId = typeof link.target === 'string' ? link.target : link.target.id
      const srcNode = previewer.getNodeById(srcId)
      const dstNode = previewer.getNodeById(dstId)

      setData({
        id: link.id,
        srcDevice: srcNode?.name || '',
        srcPort: link.sourcePort || '',
        dstDevice: dstNode?.name || '',
        dstPort: link.targetPort || '',
        bandwidth: link.bandwidth || 0,
      })
    }
    const onBlank = () => setVisible(false)
    previewer.bus.on('LINK_CLICK', onLinkClick)
    previewer.bus.on('NODE_CLICK', onBlank)
    previewer.bus.on('NODE_MOUSELEAVE', onBlank)
    return () => {
      previewer.bus.off('LINK_CLICK', onLinkClick)
      previewer.bus.off('NODE_CLICK', onBlank)
      previewer.bus.off('NODE_MOUSELEAVE', onBlank)
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
        <span className={styles['item-value']}>{data.id}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>SRC:</div>
      <div className={styles.item}>
        <span className={styles['item-label']}>device:</span>
        <span className={styles['item-value']}>{data.srcDevice}</span>
      </div>
      <div className={styles.item}>
        <span className={styles['item-label']}>port:</span>
        <span className={styles['item-value']}>{data.srcPort}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>DST:</div>
      <div className={styles.item}>
        <span className={styles['item-label']}>device:</span>
        <span className={styles['item-value']}>{data.dstDevice}</span>
      </div>
      <div className={styles.item}>
        <span className={styles['item-label']}>port:</span>
        <span className={styles['item-value']}>{data.dstPort}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.item}>
        <span className={styles['item-label']}>Bandwidth:</span>
        <span className={styles['item-value']}>{data.bandwidth}</span>
      </div>
    </div>
  )
}
