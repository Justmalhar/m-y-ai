import { Shell } from "@/components/layout/shell"
import { SessionsTable } from "@/components/sessions/sessions-table"
import { ClockIcon } from "lucide-react"

export default function SessionsPage() {
  return (
    <Shell>
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-white/8 flex items-center gap-2.5">
          <ClockIcon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium">Session History</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SessionsTable />
        </div>
      </div>
    </Shell>
  )
}
