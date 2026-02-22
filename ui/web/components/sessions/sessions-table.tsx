"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { MessageSquareIcon, Trash2Icon, ExternalLinkIcon } from "lucide-react"
import { useSessions } from "@/hooks/use-sessions"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function SessionsTable() {
  const { sessions, deleteSession } = useSessions()

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <MessageSquareIcon className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No sessions yet</p>
        <Link href="/chat">
          <Button size="sm" variant="outline">Start a conversation</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {sessions.map((session, i) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg glass-2 border border-white/8 flex items-center justify-center shrink-0">
            <MessageSquareIcon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <Link href={`/chat/${session.id}`} className="block">
              <p className="text-sm font-medium truncate hover:text-primary transition-colors">
                {session.title || "Untitled conversation"}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {session.lastMessage || "No messages"}
              </p>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground/60">
              {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
            </span>
            <Link href={`/chat/${session.id}`}>
              <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLinkIcon className="w-3 h-3" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
              onClick={() => deleteSession(session.id)}
            >
              <Trash2Icon className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
