import { type RefObject, useEffect, useState } from 'react'

const config: MutationObserverInit = { attributes: true, childList: true, subtree: true }

function checkVisibility(element: HTMLElement | null): boolean {
  if (!element) return true
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  return true
}

/**
 * 检查父节点可见性（用于拓扑编辑器在 Tab 切换时重新布局）
 */
export function useVisible(ref: RefObject<HTMLElement>): boolean {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const target = ref.current
    const parent = target?.parentElement
    if (!parent) return

    const observer = new MutationObserver(() => {
      setVisible(checkVisibility(parent))
    })
    observer.observe(parent, config)
    return () => observer.disconnect()
  }, [ref])

  return visible
}
