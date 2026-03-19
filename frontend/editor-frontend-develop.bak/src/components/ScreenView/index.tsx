import React from 'react'

import { useResize } from '@/utils/screenhooks/useResize'

const WIDTH = 1920
const HEIGHT = 1080

interface IProps {
  children?: React.ReactNode
  height: number
  width: number
}

const ScreenView = (props: IProps) => {
  const { children, height, width } = props
  const style: any = useResize(width, height, WIDTH, HEIGHT)

  return (
    <div
      style={{
        height: HEIGHT,
        left: `${style.left}px`,
        position: 'absolute',
        top: `${style.top}px`,
        transform: `scale(${style.scale})`,
        width: WIDTH,
      }}
    >
      <div style={{ height: HEIGHT, position: 'relative', width: WIDTH }}>{children}</div>
    </div>
  )
}

export default ScreenView
