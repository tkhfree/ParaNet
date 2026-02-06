import React, { useEffect, useRef, useState } from 'react'
import { Button, Space, Typography, message } from 'antd'
import { ReloadOutlined, DisconnectOutlined } from '@ant-design/icons'
import '@xterm/xterm/css/xterm.css'
import { Terminal as XtermTerminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useResizeObserver } from '@/hooks/useResizeObserver'
import { monitorApi } from '@/api/monitor'
import styles from './index.module.less'

export interface TerminalLogProps {
  /** WebSocket URL，用于实时日志流；不传则仅展示拉取的日志 */
  wsUrl?: string
  /** 节点 ID，拉取该节点日志时使用 */
  nodeId?: string
  /** 是否只读（不向终端发送键盘输入） */
  readOnly?: boolean
  /** 高度 */
  height?: number
}

const getDefaultWsUrl = () => {
  const base = window.location.origin.replace(/^http/, 'ws')
  return `${base}/api/monitor/terminal`
}

const TerminalLog: React.FC<TerminalLogProps> = ({
  wsUrl: wsUrlProp,
  nodeId,
  readOnly = true,
  height = 400,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XtermTerminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const size = useResizeObserver(containerRef)
  const wsUrl = wsUrlProp ?? getDefaultWsUrl()

  const initTerminal = () => {
    if (!containerRef.current) return
    const term = new XtermTerminal({
      fontSize: 13,
      lineHeight: 1.2,
      convertEol: true,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      theme: {
        foreground: '#e0e0e0',
        background: '#1e1e1e',
      },
    })
    term.open(containerRef.current)
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    fitAddon.fit()
    terminalRef.current = term
    fitAddonRef.current = fitAddon
  }

  const disposeTerminal = () => {
    fitAddonRef.current = null
    terminalRef.current?.dispose()
    terminalRef.current = null
  }

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    try {
      const url = nodeId ? `${wsUrl}?nodeId=${encodeURIComponent(nodeId)}` : wsUrl
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        terminalRef.current?.writeln('\r\n[已连接] 实时日志流')
      }

      ws.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : { data: event.data }
          const text = typeof data.data === 'string' ? data.data : String(data.data ?? '')
          terminalRef.current?.write(text)
        } catch {
          terminalRef.current?.write(String(event.data))
        }
      }

      ws.onerror = () => {
        terminalRef.current?.writeln('\r\n[错误] 连接异常')
      }

      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        terminalRef.current?.writeln('\r\n[已断开] 实时日志流')
      }
    } catch (e) {
      message.error('无法连接终端服务')
      setConnected(false)
    }
  }

  const disconnectWebSocket = () => {
    wsRef.current?.close()
    wsRef.current = null
    setConnected(false)
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await monitorApi.getTerminalLogs({ nodeId, lines: 500 })
      const text = res?.data ?? ''
      terminalRef.current?.clear()
      terminalRef.current?.writeln(text || '[暂无历史日志]')
    } catch {
      terminalRef.current?.writeln('[拉取日志失败，请检查后端 /monitor/terminal/logs 接口]')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initTerminal()
    return () => {
      disconnectWebSocket()
      disposeTerminal()
    }
  }, [])

  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      fitAddonRef.current?.fit()
    }
  }, [size])

  useEffect(() => {
    if (!readOnly && terminalRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      const term = terminalRef.current
      const disposable = term.onData((data) => {
        wsRef.current?.send(data)
      })
      return () => disposable.dispose()
    }
  }, [readOnly, connected])

  return (
    <div className={styles.wrapper} style={{ height }}>
      <div className={styles.toolbar}>
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={connectWebSocket}
            disabled={connected}
          >
            连接实时日志
          </Button>
          {connected && (
            <Button
              size="small"
              danger
              icon={<DisconnectOutlined />}
              onClick={disconnectWebSocket}
            >
              断开
            </Button>
          )}
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={fetchLogs}
            loading={loading}
          >
            拉取历史
          </Button>
        </Space>
        {connected && (
          <Typography.Text type="success" className={styles.status}>
            已连接
          </Typography.Text>
        )}
      </div>
      <div ref={containerRef} className={styles.terminal} />
    </div>
  )
}

export default TerminalLog
