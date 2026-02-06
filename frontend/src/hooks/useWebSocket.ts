import { useEffect, useRef, useState } from 'react'

export interface UseWebSocketOptions {
  onOpen?: (event: Event) => void
  onMessage?: (event: MessageEvent) => void
  onError?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export const useWebSocket = (url: string, options: UseWebSocketOptions = {}) => {
  const {
    onOpen,
    onMessage,
    onError,
    onClose,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options

  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING)
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const connect = () => {
    if (!url) return
    try {
      const ws = new WebSocket(url)
      
      ws.onopen = (event) => {
        setReadyState(WebSocket.OPEN)
        reconnectCountRef.current = 0
        onOpen?.(event)
      }

      ws.onmessage = (event) => {
        setLastMessage(event)
        onMessage?.(event)
      }

      ws.onerror = (event) => {
        setReadyState(WebSocket.CLOSED)
        onError?.(event)
      }

      ws.onclose = (event) => {
        setReadyState(WebSocket.CLOSED)
        onClose?.(event)

        // 自动重连
        if (
          reconnect &&
          reconnectCountRef.current < maxReconnectAttempts
        ) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectCountRef.current += 1
            connect()
          }, reconnectInterval)
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('WebSocket connection failed:', error)
    }
  }

  useEffect(() => {
    if (url) connect()

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [url])

  const sendMessage = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  const disconnect = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }
    wsRef.current?.close()
  }

  return {
    readyState,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect,
  }
}
