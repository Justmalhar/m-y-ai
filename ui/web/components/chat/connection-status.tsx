import { cn } from "@/lib/utils"
import type { GatewayStatus } from "@/hooks/use-gateway"

const labels: Record<GatewayStatus, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Connection error",
}

const dots: Record<GatewayStatus, string> = {
  connecting: "bg-yellow-400 animate-pulse",
  connected: "bg-emerald-400",
  disconnected: "bg-zinc-500",
  error: "bg-red-500",
}

interface ConnectionStatusProps {
  status: GatewayStatus
  className?: string
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dots[status])} />
      <span>{labels[status]}</span>
    </div>
  )
}
