"use client"

import { useParams } from "next/navigation"
import { useCallback } from "react"
import { Shell } from "@/components/layout/shell"
import { ChatCanvas } from "@/components/chat/chat-canvas"
import { useSessions, type StoredSession } from "@/hooks/use-sessions"

export default function ChatSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const { getSession, updateSession } = useSessions()
  const session = getSession(sessionId)

  const handleSessionUpdate = useCallback(
    (id: string, updates: Partial<StoredSession>) => {
      updateSession(id, updates)
    },
    [updateSession]
  )

  return (
    <Shell>
      <ChatCanvas
        sessionId={sessionId}
        session={session}
        onSessionUpdate={handleSessionUpdate}
      />
    </Shell>
  )
}
