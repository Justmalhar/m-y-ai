"use client"

import { useState } from "react"
import { BrainIcon, SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

interface MemoryPanelProps {
  content: string | null
  loading?: boolean
}

export function MemoryPanel({ content, loading }: MemoryPanelProps) {
  const [query, setQuery] = useState("")

  const lines = content?.split("\n") ?? []
  const filtered = query
    ? lines.filter((l) => l.toLowerCase().includes(query.toLowerCase()))
    : lines

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrainIcon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium">Memory</h2>
        </div>
        <div className="relative w-48">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memory…"
            className="pl-8 h-8 text-xs bg-white/6 border-white/10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Loading memory…
          </div>
        ) : content === null ? (
          <p className="text-sm text-muted-foreground">
            Send <span className="font-mono text-primary">/memory</span> in a chat to load memory content here.
          </p>
        ) : (
          <pre className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">
            {filtered.join("\n") || "No matches found."}
          </pre>
        )}
      </div>
    </div>
  )
}
