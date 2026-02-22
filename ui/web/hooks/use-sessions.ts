"use client"

import { useCallback, useEffect, useState } from "react"

export interface StoredSession {
  id: string        // UUID == URL sessionId
  chatId: string    // Gateway-assigned chatId from WS 'connected' frame
  title: string     // First 60 chars of first user message
  createdAt: number // Unix timestamp ms
  lastMessage: string
  updatedAt: number
}

const STORAGE_KEY = "mya-sessions"

function loadSessions(): StoredSession[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function saveSessions(sessions: StoredSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function useSessions() {
  const [sessions, setSessions] = useState<StoredSession[]>([])

  useEffect(() => {
    setSessions(loadSessions())
  }, [])

  const upsertSession = useCallback((session: StoredSession) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id)
      const next =
        idx >= 0
          ? prev.map((s, i) => (i === idx ? session : s))
          : [session, ...prev]
      // Sort by updatedAt desc
      next.sort((a, b) => b.updatedAt - a.updatedAt)
      saveSessions(next)
      return next
    })
  }, [])

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      saveSessions(next)
      return next
    })
  }, [])

  const getSession = useCallback(
    (id: string) => sessions.find((s) => s.id === id) ?? null,
    [sessions]
  )

  return { sessions, upsertSession, deleteSession, getSession }
}
