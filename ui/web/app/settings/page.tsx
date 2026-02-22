"use client"

import { useRouter } from "next/navigation"
import { SettingsIcon, LogOutIcon } from "lucide-react"
import { Shell } from "@/components/layout/shell"
import { StatusCard } from "@/components/settings/status-card"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      router.replace("/login")
    }
  }

  return (
    <Shell>
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-white/8 flex items-center gap-2.5">
          <SettingsIcon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium">Settings</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg flex flex-col gap-6">
            {/* Gateway Status */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-3">
                Gateway
              </h3>
              <StatusCard />
            </section>

            {/* Environment Info */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-3">
                Configuration
              </h3>
              <div className="glass-2 border border-white/10 rounded-xl divide-y divide-white/6">
                {[
                  ["WebSocket URL", process.env.NEXT_PUBLIC_GATEWAY_WS_URL ?? "ws://localhost:4227/ws"],
                  ["App Name", process.env.NEXT_PUBLIC_APP_NAME ?? "m-y.ai"],
                ].map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">{key}</span>
                    <span className="text-sm font-mono text-foreground/80">{val}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Logout */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-3">
                Account
              </h3>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-white/10 hover:border-destructive/50 hover:text-destructive"
              >
                <LogOutIcon className="w-3.5 h-3.5 mr-2" />
                Sign out
              </Button>
            </section>
          </div>
        </div>
      </div>
    </Shell>
  )
}
