"use client"

import { useState, useEffect } from "react"
import { CheckCircleIcon, XCircleIcon, ServerIcon } from "lucide-react"

interface GatewayInfo {
  ok: boolean
}

export function StatusCard() {
  const [info, setInfo] = useState<GatewayInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_GATEWAY_WS_URL ?? "ws://localhost:4227/ws"
    const httpUrl = wsUrl.replace(/^wss?/, "http").replace(/\/ws$/, "/")

    fetch(httpUrl)
      .then((r) => setInfo({ ok: r.ok }))
      .catch(() => setInfo({ ok: false }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="glass-2 border border-white/10 rounded-xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg glass-1 border border-white/8 flex items-center justify-center">
        <ServerIcon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">Gateway Status</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {process.env.NEXT_PUBLIC_GATEWAY_WS_URL ?? "ws://localhost:4227/ws"}
        </p>
      </div>
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      ) : info?.ok ? (
        <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
      ) : (
        <XCircleIcon className="w-4 h-4 text-destructive" />
      )}
    </div>
  )
}
