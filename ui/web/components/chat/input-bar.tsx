"use client"

import { useRef, useState, useLayoutEffect, KeyboardEvent } from "react"
import { SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommandPalette } from "./command-palette"
import { cn } from "@/lib/utils"

interface InputBarProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function InputBar({ onSend, disabled, placeholder }: InputBarProps) {
  const [value, setValue] = useState("")
  const [showPalette, setShowPalette] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const slashQuery = value.startsWith("/") ? value.slice(1) : ""
  const paletteVisible = showPalette && value.startsWith("/")

  // Resize after React flushes the new value to the DOM
  useLayoutEffect(() => {
    autoResize()
  }, [value])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    setValue(v)
    setShowPalette(v.startsWith("/") && !v.includes(" "))
    // autoResize() removed — handled by useLayoutEffect above
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
    if (e.key === "Escape") {
      setShowPalette(false)
    }
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue("")
    setShowPalette(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  function selectCommand(cmd: string) {
    setValue(cmd + " ")
    setShowPalette(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="relative px-4 pb-4 pt-2">
      <CommandPalette
        query={slashQuery}
        visible={paletteVisible}
        onSelect={selectCommand}
      />

      <div className={cn(
        "flex items-end gap-2 glass-3 border border-white/12 rounded-2xl px-4 py-3",
        "focus-within:border-primary/40 transition-colors"
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Message m-y.ai… (/ for commands)"}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground",
            "outline-none border-none leading-relaxed min-h-[24px] max-h-[200px]",
            "disabled:opacity-50"
          )}
        />
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="shrink-0 w-8 h-8 rounded-xl"
        >
          <SendIcon className="w-3.5 h-3.5" />
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground/50 mt-2">
        Shift+Enter for new line · / for commands
      </p>
    </div>
  )
}
