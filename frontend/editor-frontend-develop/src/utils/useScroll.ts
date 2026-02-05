import { useCallback, useEffect, useRef } from 'react'

const useScroll = (selector: string) => {
  const interval = useRef<any>(null)

  const startScroll = useCallback((wrapper: HTMLDivElement) => {
    const child = wrapper?.children?.[0] as HTMLDivElement
    interval.current = setInterval(() => {
      const scrollTop = wrapper.scrollTop
      const wrapperHeight = wrapper.offsetHeight
      const childrenHeight = child.offsetHeight * (wrapper?.children?.length ?? 1)
      if (wrapperHeight + scrollTop >= childrenHeight) {
        wrapper.scrollTop = 0
      } else {
        wrapper.scrollTop = wrapper.scrollTop + 1
      }
    }, 30)
  }, [])

  const stopScroll = useCallback(() => {
    clearInterval(interval.current)
    interval.current = null
  }, [])

  useEffect(() => {
    const wrapper = document.querySelector(selector) as HTMLDivElement
    const child = wrapper?.children?.[0] as HTMLDivElement
    if (interval.current) {
      stopScroll()
    }
    if (!wrapper || !child) {
      return
    }
    wrapper.onmouseenter = () => stopScroll()
    wrapper.onmouseleave = () => startScroll(wrapper)
    startScroll(wrapper)

    return () => {
      stopScroll()
    }
  }, [selector, stopScroll, startScroll])
}

export default useScroll
