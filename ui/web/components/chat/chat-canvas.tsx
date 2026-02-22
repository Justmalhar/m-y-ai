"use client"

import { useEffect, useRef } from "react"
import { BotIcon, RefreshCwIcon } from "lucide-react"
import { motion } from "framer-motion"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"
import { InputBar } from "./input-bar"
import { ConnectionStatus } from "./connection-status"
import { Button } from "@/components/ui/button"
import { useGateway } from "@/hooks/use-gateway"
import { useChat } from "@/hooks/use-chat"
import type { StoredSession } from "@/hooks/use-sessions"

interface ChatCanvasProps {
  sessionId: string
  session: StoredSession | null
  onSessionUpdate: (updates: Partial<StoredSession>) => void
}

export function ChatCanvas({ sessionId, session, onSessionUpdate }: ChatCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { messages, isTyping, addUserMessage, handleFrame } = useChat()

  const { status, chatId, sendMessage, reconnect } = useGateway({
    onFrame: handleFrame,
  })

  // Save chatId to session when assigned
  useEffect(() => {
    if (chatId && session && !session.chatId) {
      onSessionUpdate({ chatId })
    }
  }, [chatId, session, onSessionUpdate])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, isTyping])

  function handleSend(text: string) {
    if (status !== "connected") return
    addUserMessage(text)
    sendMessage(text)

    // Update session title from first message
    if (!session?.title) {
      onSessionUpdate({
        title: text.slice(0, 60),
        lastMessage: text.slice(0, 80),
        updatedAt: Date.now(),
      })
    } else {
      onSessionUpdate({ lastMessage: text.slice(0, 80), updatedAt: Date.now() })
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <h2 className="text-sm font-medium">
            {session?.title ?? "New conversation"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(session?.createdAt ?? Date.now()).toLocaleDateString("en-US", {
              weekday: "short", month: "short", day: "numeric"
            })}
          </p>
        </div>
        <ConnectionStatus status={status} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {isEmpty && status === "connected" && <EmptyState />}
        {(status === "disconnected" || status === "error") && (
          <DisconnectedState onReconnect={reconnect} />
        )}

        <div className="flex flex-col gap-4 max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <TypingIndicator visible={isTyping} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/8 max-w-3xl w-full mx-auto">
        <InputBar
          onSend={handleSend}
          disabled={status !== "connected"}
          placeholder={
            status === "connecting"
              ? "Connecting to gateway…"
              : status !== "connected"
              ? "Disconnected — check gateway"
              : undefined
          }
        />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full gap-4 py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl glass-2 border border-white/10 flex items-center justify-center">
        <BotIcon className="w-7 h-7 text-primary" />
      </div>
      <div>
        <h3 className="text-base font-medium">How can I help you?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Type a message or use <span className="font-mono text-primary">/</span> for commands
        </p>
      </div>
    </motion.div>
  )
}

function DisconnectedState({ onReconnect }: { onReconnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <p className="text-sm text-muted-foreground">Connection lost</p>
      <Button variant="outline" size="sm" onClick={onReconnect}>
        <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5" />
        Reconnect
      </Button>
    </div>
  )
}
