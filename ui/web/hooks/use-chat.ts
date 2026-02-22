"use client"

import { useCallback, useRef, useState } from "react"
import type { GatewayFrame } from "./use-gateway"

export type MessageRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  isStreaming?: boolean
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const streamBufferRef = useRef("")
  const streamingIdRef = useRef<string | null>(null)

  const addUserMessage = useCallback((text: string): ChatMessage => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, msg])
    return msg
  }, [])

  const handleFrame = useCallback((frame: GatewayFrame) => {
    switch (frame.type) {
      case "typing": {
        setIsTyping(true)
        // Create a new streaming AI message placeholder
        if (!streamingIdRef.current) {
          const id = crypto.randomUUID()
          streamingIdRef.current = id
          streamBufferRef.current = ""
          setMessages((prev) => [
            ...prev,
            { id, role: "assistant", content: "", timestamp: Date.now(), isStreaming: true },
          ])
        }
        break
      }

      case "message": {
        if (frame.text) {
          // Accumulate into stream buffer
          streamBufferRef.current += frame.text

          if (streamingIdRef.current) {
            const id = streamingIdRef.current
            const content = streamBufferRef.current
            setMessages((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, content, isStreaming: true } : m
              )
            )
          } else {
            // Non-streaming message (full response at once)
            const msg: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: frame.text,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, msg])
          }
        }
        break
      }

      case "stop_typing": {
        setIsTyping(false)
        if (streamingIdRef.current) {
          const id = streamingIdRef.current
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, isStreaming: false } : m
            )
          )
          streamingIdRef.current = null
          streamBufferRef.current = ""
        }
        break
      }

      case "error": {
        setIsTyping(false)
        streamingIdRef.current = null
        streamBufferRef.current = ""
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ Error: ${frame.message ?? "Unknown error"}`,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errMsg])
        break
      }
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setIsTyping(false)
    streamingIdRef.current = null
    streamBufferRef.current = ""
  }, [])

  return { messages, isTyping, addUserMessage, handleFrame, clearMessages }
}
