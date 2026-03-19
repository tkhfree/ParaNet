import styles from './index.module.less'
import './index.less'

import '@xterm/xterm/css/xterm.css'

import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XtermTerminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useSize } from '@/hooks'

const proposeDimensions = (terminal_dom_ref: HTMLDivElement) => {
  const { clientWidth: width, clientHeight: height } = terminal_dom_ref

  const line_height = 16
  const font_width = 8.5

  return {
    rows: Math.floor(height / line_height),
    cols: Math.floor(width / font_width),
  }
}

const getLocalhost = () => {
  if (window.location.hostname === '127.0.0.1') {
    return '10.10.48.2:40065'
  }
  // return window.location.host
  // 暂时写死
  return '10.7.0.100:8080'
}

export const Terminal = () => {
  const container = useRef<HTMLDivElement>(null!)
  const size = useSize(container)
  const [terminal, setTerminal] = useState<XtermTerminal>()

  const [socket] = useState(() => new WebSocket(`ws://${getLocalhost()}/api/terminal`))

  useEffect(() => {
    const terminal = new XtermTerminal({
      ...proposeDimensions(container.current),
      fontSize: 14,
      lineHeight: 1,
      convertEol: true, //启用时，光标将设置为下一行的开头
      // scrollback: 50, //终端中的回滚量
      disableStdin: false, //是否应禁用输入
      // cursorStyle: "underline", //光标样式
      cursorBlink: true, //光标闪烁
      theme: {
        foreground: '#ECECEC', //字体
        background: '#28292C', //背景色
      },
    })

    terminal.open(container.current)

    const fitAddon = new FitAddon()

    terminal.loadAddon(fitAddon)
    fitAddon.fit()

    terminal.onKey(e => {
      const printable = !e.domEvent.altKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey
      if (e.domEvent.keyCode === 13) {
        // 处理回车键，添加换行
        terminal.write('\n')
      } else if (e.domEvent.keyCode === 8) {
        // 处理退格键，删除最后一个字符
        // socket.send('\b \b')
      } else if (printable) {
        // 处理可打印字符
        // terminal.write(e.key)
      }
    })

    // terminal.onData(key => {
    //   if (key.length > 1) terminal.write(key)
    // })

    socket.onmessage = event => {
      const data = JSON.parse(event.data)

      terminal.write(data.data)
    }

    terminal.onData(key => {
      socket.send(key)
    })

    setTerminal(terminal)

    return () => {
      terminal.dispose()

      setTerminal(undefined)
    }
  }, [socket])

  useEffect(() => {
    if (!socket || !terminal) return
  }, [terminal, socket])

  useEffect(() => {
    const { rows, cols } = proposeDimensions(container.current)

    terminal?.resize(cols, rows)
  }, [terminal, size])

  return <div ref={container} className={styles.container}></div>
}
