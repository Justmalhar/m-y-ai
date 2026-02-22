"use client"

import { motion, AnimatePresence } from "framer-motion"
import { TerminalIcon } from "lucide-react"

const COMMANDS = [
  { cmd: "/new", description: "Start a new chat session" },
  { cmd: "/status", description: "Show session stats & queue depth" },
  { cmd: "/memory", description: "Show long-term & today's memory" },
  { cmd: "/model", description: "List or switch AI model" },
  { cmd: "/provider", description: "List or switch provider" },
  { cmd: "/stop", description: "Stop current agent run" },
  { cmd: "/help", description: "Show all commands" },
]

interface CommandPaletteProps {
  query: string
  visible: boolean
  onSelect: (cmd: string) => void
}

export function CommandPalette({ query, visible, onSelect }: CommandPaletteProps) {
  const filtered = COMMANDS.filter((c) =>
    c.cmd.slice(1).startsWith(query.toLowerCase())
  )

  return (
    <AnimatePresence>
      {visible && filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-0 right-0 mb-2 glass-2 border border-white/10 rounded-xl overflow-hidden shadow-xl"
        >
          {filtered.map((c) => (
            <button
              key={c.cmd}
              type="button"
              onClick={() => onSelect(c.cmd)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/8 transition-colors text-left"
            >
              <TerminalIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-mono text-primary">{c.cmd}</span>
              <span className="text-muted-foreground">{c.description}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
