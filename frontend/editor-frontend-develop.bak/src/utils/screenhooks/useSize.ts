import { RefObject, useEffect, useState } from 'react'

export const useSize = (ref: RefObject<HTMLElement>) => {
  const [size, setSize] = useState({
    height: 0,
    maxHeight: 0,
    maxWidth: 0,
    width: 0,
  })

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      const { clientHeight, clientWidth, scrollHeight, scrollWidth } = entry.target
      setSize({
        height: clientHeight,
        maxHeight: scrollHeight,
        maxWidth: scrollWidth,
        width: clientWidth,
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
