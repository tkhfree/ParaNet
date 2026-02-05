import { RefObject, useEffect, useState } from 'react'

export const useSize = (ref: RefObject<HTMLElement>) => {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
    maxWidth: 0,
    maxHeight: 0,
  })

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      const { scrollWidth, scrollHeight, clientWidth, clientHeight } = entry.target
      setSize({
        width: clientWidth,
        height: clientHeight,
        maxWidth: scrollWidth,
        maxHeight: scrollHeight,
      })
    })

    const target = ref.current as HTMLElement
    observer.observe(target)

    return () => {
      observer.unobserve(target)
      observer.disconnect()
    }
  }, [ref])

  return size
}
