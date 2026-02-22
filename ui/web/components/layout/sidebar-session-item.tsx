"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { MessageSquareIcon, Trash2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StoredSession } from "@/hooks/use-sessions"

interface SidebarSessionItemProps {
  session: StoredSession
  onDelete: (id: string) => void
}

export function SidebarSessionItem({ session, onDelete }: SidebarSessionItemProps) {
  const pathname = usePathname()
  const isActive = pathname === `/chat/${session.id}`

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm",
        "hover:bg-white/6 transition-colors cursor-pointer",
        isActive && "bg-white/8 text-foreground",
        !isActive && "text-muted-foreground"
      )}
    >
      <Link href={`/chat/${session.id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
        <MessageSquareIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{session.title || "New chat"}</span>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onDelete(session.id)
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:text-destructive"
      >
        <Trash2Icon className="w-3 h-3" />
      </button>
    </motion.div>
  )
}
