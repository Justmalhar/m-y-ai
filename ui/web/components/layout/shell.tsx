import { Sidebar } from "./sidebar"
import { MobileHeader } from "./mobile-header"

interface ShellProps {
  children: React.ReactNode
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0">
        <Sidebar className="w-full" />
      </aside>

      {/* Main area */}
      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileHeader />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
