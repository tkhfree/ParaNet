import React, { useMemo } from 'react'
import type { DeviceLegend } from '@/model/topology'
import { resolveDeviceColor } from '../config'
import styles from './CanvasLegendOverlay.module.less'

export interface CanvasLegendOverlayProps {
  legends: DeviceLegend[]
}

/**
 * 叠在拓扑画布内的设备类型说明（屏幕坐标，不随画布 zoom 缩放）
 */
export const CanvasLegendOverlay: React.FC<CanvasLegendOverlayProps> = ({ legends }) => {
  const rows = useMemo(
    () => [...legends].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    [legends],
  )

  if (rows.length === 0) {
    return null
  }

  return (
    <div className={styles.root} aria-label="画布设备类型图例">
      <div className={styles.title}>设备类型</div>
      <div className={styles.list}>
        {rows.map((item) => (
          <div key={item.id} className={styles.row}>
            <span
              className={styles.dot}
              style={{ backgroundColor: resolveDeviceColor(item.type) }}
            />
            <span className={styles.label}>{item.label}</span>
            <span className={styles.type}>{item.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
