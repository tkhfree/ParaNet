import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Space, Typography } from 'antd'
import { ClearOutlined, DisconnectOutlined, ReloadOutlined } from '@ant-design/icons'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XtermTerminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

import { getTerminalWsUrl } from '@/api'
import { useResizeObserver } from '@/hooks/useResizeObserver'

import styles from './index.module.less'

export interface InteractiveTerminalProps {
  projectId?: string | null
  height?: number | string
}

const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  projectId,
  height = 260,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XtermTerminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const receivedOutputRef = useRef(false)
  const [connected, setConnected] = useState(false)
  const [reconnectSeed, setReconnectSeed] = useState(0)
  const size = useResizeObserver(containerRef)
  const wsUrl = useMemo(() => getTerminalWsUrl(projectId), [projectId])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const terminal = new XtermTerminal({
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      convertEol: true,
      theme: {
        background: '#141414',
        foreground: '#f5f5f5',
      },
      scrollback: 3000,
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)
    fitAddon.fit()
    terminal.focus()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    return () => {
      socketRef.current?.close()
      socketRef.current = null
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [])

  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      fitAddonRef.current?.fit()
    }
  }, [size.height, size.width])

  useEffect(() => {
    if (!terminalRef.current) {
      return
    }

    const socket = new WebSocket(wsUrl)
    socketRef.current = socket
    receivedOutputRef.current = false
    let bootstrapTimer: ReturnType<typeof setTimeout> | null = null

    socket.onopen = () => {
      setConnected(true)
      terminalRef.current?.focus()
      bootstrapTimer = setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN && !receivedOutputRef.current) {
          socket.send('\r')
        }
      }, 250)
    }

    socket.onmessage = (event) => {
      receivedOutputRef.current = true
      try {
        const payload = JSON.parse(event.data as string) as { data?: string }
        terminalRef.current?.write(payload.data ?? '')
      } catch {
        terminalRef.current?.write(String(event.data ?? ''))
      }
    }

    socket.onclose = () => {
      setConnected(false)
      terminalRef.current?.writeln('\r\n[terminal] 连接已关闭')
    }

    const disposable = terminalRef.current.onData((value) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(value)
      }
    })

    return () => {
      disposable.dispose()
      if (bootstrapTimer) {
        clearTimeout(bootstrapTimer)
      }
      socket.close()
      socketRef.current = null
    }
  }, [projectId, reconnectSeed, wsUrl])

  const handleClear = () => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      // Prefer asking the real shell to clear and redraw the prompt.
      socket.send('\x0c')
      terminalRef.current?.focus()
      return
    }

    terminalRef.current?.clear()
  }

  const handleDisconnect = () => {
    socketRef.current?.close()
  }

  const handleReconnect = () => {
    setConnected(false)
    terminalRef.current?.writeln('\r\n[terminal] 正在重新连接...')
    socketRef.current?.close()
    setReconnectSeed((current) => current + 1)
  }

  const handleFocus = () => {
    terminalRef.current?.focus()
  }

  return (
    <div className={styles.wrapper} style={{ height }}>
      <div className={styles.toolbar}>
        <Space size={12}>
          <Typography.Text strong>交互式终端</Typography.Text>
          <Typography.Text type={connected ? 'success' : 'secondary'}>
            {connected ? '已连接' : '未连接'}
          </Typography.Text>
        </Space>
        <Space size={8}>
          <Button size="small" icon={<ClearOutlined />} onClick={handleClear}>
            清空
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleReconnect}
            disabled={!projectId}
          >
            重连
          </Button>
          <Button
            size="small"
            danger
            icon={<DisconnectOutlined />}
            onClick={handleDisconnect}
            disabled={!connected}
          >
            断开
          </Button>
        </Space>
      </div>
      <div ref={containerRef} className={styles.terminal} onClick={handleFocus} />
    </div>
  )
}

export default InteractiveTerminal
