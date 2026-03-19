import { RefObject, useEffect, useState } from 'react'

const config = { attributes: true, childList: true, subtree: true }

// 检查元素是否可见的函数
function checkVisibility(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  } else {
    return true
  }
}

/**
 * 仅用于检查父节点可见性
 * @param ref 当前节点引用
 * @returns 父节点可见性
 */
export const useVisible = (ref: RefObject<HTMLElement>) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const target = ref.current as HTMLElement

    // 创建一个观察者实例并传入回调函数
    const observer = new MutationObserver(mutationsList => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
            setVisible(checkVisibility(target.parentElement!))
          }
        }
      }
    })

    observer.observe(target.parentElement!, config)

    return () => {
      observer.disconnect()
    }
  }, [ref])

  return visible
}
