import { useEffect, useState } from 'react'

/**
 * 监听容器尺寸变化，返回 { width, height }
 */
export function useResizeObserver(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      }
    })

    observer.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })

    return () => observer.disconnect()
  }, [ref])

  return size
}
