"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BotIcon, BrainIcon, ClockIcon, SettingsIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSessions } from "@/hooks/use-sessions"
import { SidebarSessionItem } from "./sidebar-session-item"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { href: "/memory", label: "Memory", icon: BrainIcon },
  { href: "/sessions", label: "History", icon: ClockIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { sessions, deleteSession } = useSessions()

  function handleNewChat() {
    router.push("/chat")
  }

  return (
    <div className={cn(
      "flex flex-col h-full",
      "bg-sidebar border-r border-sidebar-border",
      className
    )}>
      {/* Brand */}
      <div className="px-4 py-5 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <BotIcon className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "m-y.ai"}
          </span>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 py-3 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          className="w-full justify-start gap-2 border-white/10 hover:bg-white/8 text-muted-foreground hover:text-foreground"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          New chat
        </Button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length > 0 && (
          <div>
            <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
              Recent
            </p>
            {sessions.map((session) => (
              <SidebarSessionItem
                key={session.id}
                session={session}
                onDelete={deleteSession}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="px-2 py-3 border-t border-sidebar-border shrink-0">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              "hover:bg-white/6",
              pathname === href
                ? "text-foreground bg-white/8"
                : "text-muted-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
