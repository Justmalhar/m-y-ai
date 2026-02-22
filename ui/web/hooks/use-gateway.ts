"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type GatewayStatus = "connecting" | "connected" | "disconnected" | "error"

export interface GatewayFrame {
  type: "connected" | "message" | "typing" | "stop_typing" | "reaction" | "error"
  chatId?: string
  text?: string
  messageId?: string
  emoji?: string
  message?: string
}

interface UseGatewayOptions {
  onFrame: (frame: GatewayFrame) => void
  enabled?: boolean
}

export function useGateway({ onFrame, enabled = true }: UseGatewayOptions) {
  const [status, setStatus] = useState<GatewayStatus>("connecting")
  const [chatId, setChatId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retriesRef = useRef(0)
  const onFrameRef = useRef(onFrame)
  const mountedRef = useRef(true)

  // Keep onFrame ref current without re-connecting
  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url =
      process.env.NEXT_PUBLIC_GATEWAY_WS_URL ?? "ws://localhost:4227/ws"

    setStatus("connecting")
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      setStatus("connected")
      retriesRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const frame: GatewayFrame = JSON.parse(event.data)
        if (frame.type === "connected" && frame.chatId) {
          setChatId(frame.chatId)
        }
        onFrameRef.current(frame)
      } catch {
        // malformed frame — ignore
      }
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setStatus("error")
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setStatus("disconnected")
      wsRef.current = null

      // Exponential backoff: 1s, 2s, 4s, 8s, max 16s
      retriesRef.current += 1
      const delay = Math.min(1000 * Math.pow(2, retriesRef.current - 1), 16000)

      if (retriesRef.current <= 5) {
        reconnectTimerRef.current = setTimeout(connect, delay)
      }
    }
  }, [enabled])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback(
    (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          chatId: chatId ?? undefined,
          text,
          sender: "malhar",
        })
      )
      return true
    },
    [chatId]
  )

  const reconnect = useCallback(() => {
    retriesRef.current = 0
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    connect()
  }, [connect])

  return { status, chatId, sendMessage, reconnect }
}
