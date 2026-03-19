import { useEffect, useState } from 'react'

export const useResize = (
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
) => {
  const [style, setStyle] = useState({ left: 0, scale: 1, top: 0 })
  useEffect(() => {
    const applyScale = (scale: number) => {
      let offset = width - targetWidth
      const left = offset * 0.5
      offset = height - targetHeight
      const top = offset * 0.5
      setStyle({ left, scale, top })
    }
    const resize = () => {
      let scale = width / targetWidth
      const newHeight = targetHeight * scale
      if (newHeight > height) {
        scale = height / targetHeight
      }
      applyScale(scale)
    }
    resize()
  }, [width, height, targetWidth, targetHeight])

  return style
}
