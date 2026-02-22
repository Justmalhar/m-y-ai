# m-y.ai Web UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-ready dark glassmorphism Next.js 16 web UI for m-y.ai that connects to the gateway WebSocket and supports multi-session AI chat, memory browsing, session history, and settings.

**Architecture:** Multi-route Next.js 16 App Router app. Each `/chat/[sessionId]` page mounts its own WebSocket to `ws://localhost:4227/ws`. Single-user env-var auth via middleware. Sessions stored in localStorage. All pages share a sidebar+shell layout.

**Tech Stack:** Next.js 16, shadcn (base-ui, already installed), Tailwind v4, Framer Motion, lucide-react, react-markdown + remark-gfm + rehype-highlight, TypeScript. Use `bun` (not npm).

**Working directory for all tasks:** `/Users/malharujawane/Documents/Development/m-y-ai/m-y-ai/ui/web/`

**Design doc:** `docs/plans/2026-02-22-web-ui-design.md`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install framer-motion, react-markdown, and rehype/remark plugins**

```bash
cd /Users/malharujawane/Documents/Development/m-y-ai/m-y-ai/ui/web
bun add framer-motion react-markdown remark-gfm rehype-highlight rehype-raw
```

Expected: All 5 packages added to `node_modules/` and `bun.lock` updated.

**Step 2: Verify installs**

```bash
bun run build 2>&1 | head -20
```

Expected: Build completes or fails only on missing pages (not on import errors for new packages).

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "cc-ui/web: add framer-motion react-markdown rehype-highlight deps"
```

---

## Task 2: Update Globals CSS — Dark Glassmorphism Theme

**Files:**
- Modify: `app/globals.css`

**Step 1: Replace globals.css with glassmorphism theme**

Full replacement — keep the Tailwind imports, replace the `:root` and `.dark` token overrides:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
}

/* ── Dark-only design system ─────────────────────────────────── */
:root {
  --background: oklch(0.08 0.005 280);
  --foreground: oklch(0.95 0 0);
  --card: oklch(0.12 0.008 280);
  --card-foreground: oklch(0.95 0 0);
  --popover: oklch(0.12 0.008 280);
  --popover-foreground: oklch(0.95 0 0);
  --primary: oklch(0.65 0.22 280);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.18 0.008 280);
  --secondary-foreground: oklch(0.85 0 0);
  --muted: oklch(0.16 0.006 280);
  --muted-foreground: oklch(0.55 0 0);
  --accent: oklch(0.65 0.22 280);
  --accent-foreground: oklch(0.98 0 0);
  --destructive: oklch(0.65 0.22 27);
  --border: oklch(1 0 0 / 0.08);
  --input: oklch(1 0 0 / 0.10);
  --ring: oklch(0.65 0.22 280 / 0.5);
  --radius: 0.75rem;
  --sidebar: oklch(0.10 0.006 280);
  --sidebar-foreground: oklch(0.85 0 0);
  --sidebar-primary: oklch(0.65 0.22 280);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.18 0.008 280);
  --sidebar-accent-foreground: oklch(0.85 0 0);
  --sidebar-border: oklch(1 0 0 / 0.07);
  --sidebar-ring: oklch(0.65 0.22 280 / 0.4);
}

/* Glass utility classes */
.glass-1 { background: oklch(1 0 0 / 0.04); backdrop-filter: blur(24px); }
.glass-2 { background: oklch(1 0 0 / 0.07); backdrop-filter: blur(16px); }
.glass-3 { background: oklch(1 0 0 / 0.11); backdrop-filter: blur(12px); }

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    color-scheme: dark;
  }
  body {
    @apply bg-background text-foreground;
    background-image: radial-gradient(
      ellipse 80% 60% at 50% 100%,
      oklch(0.65 0.22 280 / 0.08) 0%,
      transparent 70%
    );
    background-attachment: fixed;
    min-height: 100dvh;
  }
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: oklch(1 0 0 / 0.15); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: oklch(1 0 0 / 0.25); }

/* Syntax highlight theme override (rehype-highlight uses highlight.js) */
.hljs { background: oklch(0.12 0.008 280) !important; border-radius: 0.5rem; }
```

**Step 2: Commit**

```bash
git add app/globals.css
git commit -m "cc-ui/web: dark glassmorphism design system tokens"
```

---

## Task 3: Update Root Layout + Metadata

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Replace app/layout.tsx**

```tsx
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "m-y.ai",
  description: "Personal AI assistant gateway",
  icons: { icon: "/favicon.ico" },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

**Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "cc-ui/web: update root layout for dark mode and m-y.ai branding"
```

---

## Task 4: Environment Variables

**Files:**
- Create: `.env.local` (gitignored)
- Modify: `../../.env.example` (root project env example)

**Step 1: Create .env.local in ui/web/**

```bash
cat > /Users/malharujawane/Documents/Development/m-y-ai/m-y-ai/ui/web/.env.local << 'EOF'
# Auth
GATEWAY_PASSWORD=changeme

# WebSocket URL to the gateway
NEXT_PUBLIC_GATEWAY_WS_URL=ws://localhost:4227/ws

# App branding
NEXT_PUBLIC_APP_NAME=m-y.ai
EOF
```

**Step 2: Update .gitignore to include .env.local (already should be there for Next.js)**

Verify `.gitignore` at root of project includes `.env.local`:

```bash
grep ".env.local" /Users/malharujawane/Documents/Development/m-y-ai/m-y-ai/.gitignore || echo "NOT FOUND - add it"
```

**Step 3: Commit**

```bash
git add ../../.gitignore
git commit -m "cc-ui/web: add GATEWAY_PASSWORD and NEXT_PUBLIC_GATEWAY_WS_URL env vars"
```

---

## Task 5: Auth API Routes — Login & Logout

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`

**Step 1: Create login route**

```bash
mkdir -p app/api/auth/login app/api/auth/logout
```

Create `app/api/auth/login/route.ts`:

```ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const { password } = await req.json()
  const expected = process.env.GATEWAY_PASSWORD

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set("mya-token", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  })

  return NextResponse.json({ ok: true })
}
```

**Step 2: Create logout route**

Create `app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("mya-token")
  return NextResponse.json({ ok: true })
}
```

**Step 3: Commit**

```bash
git add app/api/
git commit -m "cc-ui/web: add auth login/logout API routes"
```

---

## Task 6: Auth Middleware

**Files:**
- Create: `middleware.ts` (at root of `ui/web/`)

**Step 1: Create middleware.ts**

```ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/auth/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get("mya-token")?.value

  if (!token || token !== "authenticated") {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

**Step 2: Commit**

```bash
git add middleware.ts
git commit -m "cc-ui/web: auth middleware — protect all routes except /login"
```

---

## Task 7: Login Page

**Files:**
- Create: `app/login/page.tsx`

**Step 1: Create login page**

```bash
mkdir -p app/login
```

Create `app/login/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { LockIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/chat"

  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.replace(redirect)
      } else {
        setError("Incorrect password")
        setPassword("")
      }
    } catch {
      setError("Connection error. Is the server running?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="glass-2 border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <LockIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight">
                {process.env.NEXT_PUBLIC_APP_NAME ?? "m-y.ai"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your password to continue
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="bg-white/8 border-white/12 h-11"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-destructive text-sm text-center"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={!password || loading}
              className="h-11 w-full"
            >
              {loading ? (
                <LoaderIcon className="w-4 h-4 animate-spin" />
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/login/
git commit -m "cc-ui/web: glassmorphism login page with password auth"
```

---

## Task 8: useSessions Hook — localStorage Session Management

**Files:**
- Create: `hooks/use-sessions.ts`

**Step 1: Create hooks directory and useSessions**

```bash
mkdir -p hooks
```

Create `hooks/use-sessions.ts`:

```ts
"use client"

import { useCallback, useEffect, useState } from "react"

export interface StoredSession {
  id: string        // UUID == URL sessionId
  chatId: string    // Gateway-assigned chatId from WS 'connected' frame
  title: string     // First 60 chars of first user message
  createdAt: number // Unix timestamp ms
  lastMessage: string
  updatedAt: number
}

const STORAGE_KEY = "mya-sessions"

function loadSessions(): StoredSession[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function saveSessions(sessions: StoredSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function useSessions() {
  const [sessions, setSessions] = useState<StoredSession[]>([])

  useEffect(() => {
    setSessions(loadSessions())
  }, [])

  const upsertSession = useCallback((session: StoredSession) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id)
      const next =
        idx >= 0
          ? prev.map((s, i) => (i === idx ? session : s))
          : [session, ...prev]
      // Sort by updatedAt desc
      next.sort((a, b) => b.updatedAt - a.updatedAt)
      saveSessions(next)
      return next
    })
  }, [])

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      saveSessions(next)
      return next
    })
  }, [])

  const getSession = useCallback(
    (id: string) => sessions.find((s) => s.id === id) ?? null,
    [sessions]
  )

  return { sessions, upsertSession, deleteSession, getSession }
}
```

**Step 2: Commit**

```bash
git add hooks/use-sessions.ts
git commit -m "cc-ui/web: useSessions hook for localStorage session management"
```

---

## Task 9: useGateway Hook — WebSocket Connection

**Files:**
- Create: `hooks/use-gateway.ts`

**Step 1: Create useGateway hook**

Create `hooks/use-gateway.ts`:

```ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type GatewayStatus = "connecting" | "connected" | "disconnected" | "error"

export interface GatewayFrame {
  type: "connected" | "message" | "typing" | "stop_typing" | "reaction" | "error"
  chatId?: string
  text?: string
  messageId?: string
  emoji?: string
  message?: string
}

interface UseGatewayOptions {
  onFrame: (frame: GatewayFrame) => void
  enabled?: boolean
}

export function useGateway({ onFrame, enabled = true }: UseGatewayOptions) {
  const [status, setStatus] = useState<GatewayStatus>("connecting")
  const [chatId, setChatId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retriesRef = useRef(0)
  const onFrameRef = useRef(onFrame)
  const mountedRef = useRef(true)

  // Keep onFrame ref current without re-connecting
  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url =
      process.env.NEXT_PUBLIC_GATEWAY_WS_URL ?? "ws://localhost:4227/ws"

    setStatus("connecting")
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      setStatus("connected")
      retriesRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const frame: GatewayFrame = JSON.parse(event.data)
        if (frame.type === "connected" && frame.chatId) {
          setChatId(frame.chatId)
        }
        onFrameRef.current(frame)
      } catch {
        // malformed frame — ignore
      }
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setStatus("error")
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setStatus("disconnected")
      wsRef.current = null

      // Exponential backoff: 1s, 2s, 4s, 8s, max 16s
      const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 16000)
      retriesRef.current += 1

      if (retriesRef.current <= 5) {
        reconnectTimerRef.current = setTimeout(connect, delay)
      }
    }
  }, [enabled])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback(
    (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          chatId: chatId ?? undefined,
          text,
          sender: "malhar",
        })
      )
      return true
    },
    [chatId]
  )

  const reconnect = useCallback(() => {
    retriesRef.current = 0
    wsRef.current?.close()
    connect()
  }, [connect])

  return { status, chatId, sendMessage, reconnect }
}
```

**Step 2: Commit**

```bash
git add hooks/use-gateway.ts
git commit -m "cc-ui/web: useGateway hook with WS reconnect + exponential backoff"
```

---

## Task 10: useChat Hook — Message State + Streaming

**Files:**
- Create: `hooks/use-chat.ts`

**Step 1: Create useChat hook**

Create `hooks/use-chat.ts`:

```ts
"use client"

import { useCallback, useRef, useState } from "react"
import type { GatewayFrame } from "./use-gateway"

export type MessageRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  isStreaming?: boolean
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const streamBufferRef = useRef("")
  const streamingIdRef = useRef<string | null>(null)

  const addUserMessage = useCallback((text: string): ChatMessage => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, msg])
    return msg
  }, [])

  const handleFrame = useCallback((frame: GatewayFrame) => {
    switch (frame.type) {
      case "typing": {
        setIsTyping(true)
        // Create a new streaming AI message placeholder
        if (!streamingIdRef.current) {
          const id = crypto.randomUUID()
          streamingIdRef.current = id
          streamBufferRef.current = ""
          setMessages((prev) => [
            ...prev,
            { id, role: "assistant", content: "", timestamp: Date.now(), isStreaming: true },
          ])
        }
        break
      }

      case "message": {
        if (frame.text) {
          // Accumulate into stream buffer
          streamBufferRef.current += frame.text

          if (streamingIdRef.current) {
            const id = streamingIdRef.current
            const content = streamBufferRef.current
            setMessages((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, content, isStreaming: true } : m
              )
            )
          } else {
            // Non-streaming message (full response at once)
            const msg: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: frame.text,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, msg])
          }
        }
        break
      }

      case "stop_typing": {
        setIsTyping(false)
        if (streamingIdRef.current) {
          const id = streamingIdRef.current
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, isStreaming: false } : m
            )
          )
          streamingIdRef.current = null
          streamBufferRef.current = ""
        }
        break
      }

      case "error": {
        setIsTyping(false)
        streamingIdRef.current = null
        streamBufferRef.current = ""
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ Error: ${frame.message ?? "Unknown error"}`,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errMsg])
        break
      }
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setIsTyping(false)
    streamingIdRef.current = null
    streamBufferRef.current = ""
  }, [])

  return { messages, isTyping, addUserMessage, handleFrame, clearMessages }
}
```

**Step 2: Commit**

```bash
git add hooks/use-chat.ts
git commit -m "cc-ui/web: useChat hook for message state and streaming accumulation"
```

---

## Task 11: ConnectionStatus Component

**Files:**
- Create: `components/chat/connection-status.tsx`

**Step 1: Create directory and component**

```bash
mkdir -p components/chat components/layout components/memory components/sessions components/settings
```

Create `components/chat/connection-status.tsx`:

```tsx
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
```

**Step 2: Commit**

```bash
git add components/chat/connection-status.tsx
git commit -m "cc-ui/web: ConnectionStatus badge component"
```

---

## Task 12: TypingIndicator Component

**Files:**
- Create: `components/chat/typing-indicator.tsx`

**Step 1: Create component**

Create `components/chat/typing-indicator.tsx`:

```tsx
"use client"

import { motion, AnimatePresence } from "framer-motion"

interface TypingIndicatorProps {
  visible: boolean
}

export function TypingIndicator({ visible }: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 px-1"
        >
          <div className="flex items-center gap-1 glass-2 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Commit**

```bash
git add components/chat/typing-indicator.tsx
git commit -m "cc-ui/web: TypingIndicator animated dots component"
```

---

## Task 13: MessageBubble Component

**Files:**
- Create: `components/chat/message-bubble.tsx`

**Step 1: Create MessageBubble**

Create `components/chat/message-bubble.tsx`:

```tsx
"use client"

import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/hooks/use-chat"

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] md:max-w-[75%] px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "glass-3 border border-primary/20 rounded-2xl rounded-tr-sm text-foreground"
            : "glass-2 border border-white/8 rounded-2xl rounded-tl-sm text-foreground border-l-2 border-l-primary/40",
          message.isStreaming && "after:content-['▋'] after:ml-0.5 after:opacity-70 after:animate-pulse"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none
            prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1
            prose-code:before:content-none prose-code:after:content-none
            prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-transparent prose-pre:p-0
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {message.content || (message.isStreaming ? " " : "")}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  )
}
```

**Step 2: Commit**

```bash
git add components/chat/message-bubble.tsx
git commit -m "cc-ui/web: MessageBubble with markdown + syntax highlighting"
```

---

## Task 14: CommandPalette Component

**Files:**
- Create: `components/chat/command-palette.tsx`

**Step 1: Create CommandPalette**

Create `components/chat/command-palette.tsx`:

```tsx
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
  query: string // text after "/"
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
```

**Step 2: Commit**

```bash
git add components/chat/command-palette.tsx
git commit -m "cc-ui/web: CommandPalette slash command overlay"
```

---

## Task 15: InputBar Component

**Files:**
- Create: `components/chat/input-bar.tsx`

**Step 1: Create InputBar**

Create `components/chat/input-bar.tsx`:

```tsx
"use client"

import { useRef, useState, KeyboardEvent } from "react"
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
    autoResize()
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
```

**Step 2: Commit**

```bash
git add components/chat/input-bar.tsx
git commit -m "cc-ui/web: InputBar with auto-resize, slash command detection, keyboard shortcuts"
```

---

## Task 16: ChatCanvas Component

**Files:**
- Create: `components/chat/chat-canvas.tsx`

**Step 1: Create ChatCanvas**

Create `components/chat/chat-canvas.tsx`:

```tsx
"use client"

import { useEffect, useRef } from "react"
import { BotIcon, RefreshCwIcon } from "lucide-react"
import { motion } from "framer-motion"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"
import { InputBar } from "./input-bar"
import { ConnectionStatus } from "./connection-status"
import { Button } from "@/components/ui/button"
import { useGateway } from "@/hooks/use-gateway"
import { useChat } from "@/hooks/use-chat"
import type { StoredSession } from "@/hooks/use-sessions"

interface ChatCanvasProps {
  sessionId: string
  session: StoredSession | null
  onSessionUpdate: (updates: Partial<StoredSession>) => void
}

export function ChatCanvas({ sessionId, session, onSessionUpdate }: ChatCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { messages, isTyping, addUserMessage, handleFrame } = useChat()

  const { status, chatId, sendMessage, reconnect } = useGateway({
    onFrame: handleFrame,
  })

  // Save chatId to session when assigned
  useEffect(() => {
    if (chatId && session && !session.chatId) {
      onSessionUpdate({ chatId })
    }
  }, [chatId, session, onSessionUpdate])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, isTyping])

  function handleSend(text: string) {
    if (status !== "connected") return
    addUserMessage(text)
    sendMessage(text)

    // Update session title from first message
    if (!session?.title) {
      onSessionUpdate({
        title: text.slice(0, 60),
        lastMessage: text.slice(0, 80),
        updatedAt: Date.now(),
      })
    } else {
      onSessionUpdate({ lastMessage: text.slice(0, 80), updatedAt: Date.now() })
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <h2 className="text-sm font-medium">
            {session?.title ?? "New conversation"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(session?.createdAt ?? Date.now()).toLocaleDateString("en-US", {
              weekday: "short", month: "short", day: "numeric"
            })}
          </p>
        </div>
        <ConnectionStatus status={status} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {isEmpty && status === "connected" ? (
          <EmptyState />
        ) : status === "disconnected" || status === "error" ? (
          <DisconnectedState onReconnect={reconnect} />
        ) : null}

        <div className="flex flex-col gap-4 max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <TypingIndicator visible={isTyping} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/8 max-w-3xl w-full mx-auto">
        <InputBar
          onSend={handleSend}
          disabled={status !== "connected"}
          placeholder={
            status === "connecting"
              ? "Connecting to gateway…"
              : status !== "connected"
              ? "Disconnected — check gateway"
              : undefined
          }
        />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full gap-4 py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl glass-2 border border-white/10 flex items-center justify-center">
        <BotIcon className="w-7 h-7 text-primary" />
      </div>
      <div>
        <h3 className="text-base font-medium">How can I help you?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Type a message or use <span className="font-mono text-primary">/</span> for commands
        </p>
      </div>
    </motion.div>
  )
}

function DisconnectedState({ onReconnect }: { onReconnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <p className="text-sm text-muted-foreground">Connection lost</p>
      <Button variant="outline" size="sm" onClick={onReconnect}>
        <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5" />
        Reconnect
      </Button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/chat/chat-canvas.tsx
git commit -m "cc-ui/web: ChatCanvas integrates gateway, chat, messages, input"
```

---

## Task 17: Sidebar Components

**Files:**
- Create: `components/layout/sidebar-session-item.tsx`
- Create: `components/layout/sidebar.tsx`

**Step 1: Create SidebarSessionItem**

Create `components/layout/sidebar-session-item.tsx`:

```tsx
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
```

**Step 2: Create Sidebar**

Create `components/layout/sidebar.tsx`:

```tsx
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
```

**Step 3: Commit**

```bash
git add components/layout/
git commit -m "cc-ui/web: Sidebar with session list, new chat button, bottom nav"
```

---

## Task 18: Shell Layout Component

**Files:**
- Create: `components/layout/shell.tsx`
- Create: `components/layout/mobile-header.tsx`

**Step 1: Create MobileHeader**

Create `components/layout/mobile-header.tsx`:

```tsx
"use client"

import { useState } from "react"
import { MenuIcon, BotIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "./sidebar"
import { motion, AnimatePresence } from "framer-motion"

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/8 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
            <BotIcon className="w-3 h-3 text-primary" />
          </div>
          <span className="font-semibold text-sm">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "m-y.ai"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setOpen(true)}
        >
          <MenuIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 md:hidden"
            >
              <Sidebar className="h-full" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

**Step 2: Create Shell**

Create `components/layout/shell.tsx`:

```tsx
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
```

**Step 3: Commit**

```bash
git add components/layout/shell.tsx components/layout/mobile-header.tsx
git commit -m "cc-ui/web: Shell layout and MobileHeader with slide-out sidebar"
```

---

## Task 19: Chat Pages

**Files:**
- Modify: `app/page.tsx`
- Create: `app/chat/page.tsx`
- Create: `app/chat/[sessionId]/page.tsx`

**Step 1: Update app/page.tsx to redirect to /chat**

```tsx
import { redirect } from "next/navigation"

export default function RootPage() {
  redirect("/chat")
}
```

**Step 2: Create app/chat/page.tsx — generate session, redirect**

```bash
mkdir -p app/chat
```

Create `app/chat/page.tsx`:

```tsx
import { redirect } from "next/navigation"

export default function ChatPage() {
  // New session ID — will be handled client-side via useRouter in production
  // For SSR we redirect to a page that does client-side generation
  redirect("/chat/new")
}
```

Create `app/chat/new/page.tsx`:

```bash
mkdir -p app/chat/new
```

```tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function NewChatPage() {
  const router = useRouter()

  useEffect(() => {
    const id = crypto.randomUUID()
    router.replace(`/chat/${id}`)
  }, [router])

  return null
}
```

**Step 3: Create app/chat/[sessionId]/page.tsx**

```bash
mkdir -p "app/chat/[sessionId]"
```

Create `app/chat/[sessionId]/page.tsx`:

```tsx
"use client"

import { useParams } from "next/navigation"
import { useCallback } from "react"
import { Shell } from "@/components/layout/shell"
import { ChatCanvas } from "@/components/chat/chat-canvas"
import { useSessions, type StoredSession } from "@/hooks/use-sessions"

export default function ChatSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const { sessions, upsertSession, getSession } = useSessions()
  const session = getSession(sessionId)

  const handleSessionUpdate = useCallback(
    (updates: Partial<StoredSession>) => {
      const existing = session ?? {
        id: sessionId,
        chatId: "",
        title: "",
        createdAt: Date.now(),
        lastMessage: "",
        updatedAt: Date.now(),
      }
      upsertSession({ ...existing, ...updates, id: sessionId, updatedAt: Date.now() })
    },
    [session, sessionId, upsertSession]
  )

  return (
    <Shell>
      <ChatCanvas
        sessionId={sessionId}
        session={session}
        onSessionUpdate={handleSessionUpdate}
      />
    </Shell>
  )
}
```

**Step 4: Commit**

```bash
git add app/page.tsx app/chat/
git commit -m "cc-ui/web: chat routes — root redirect, new session, [sessionId] page"
```

---

## Task 20: Memory Page

**Files:**
- Create: `app/memory/page.tsx`
- Create: `components/memory/memory-panel.tsx`

**Step 1: Create MemoryPanel component**

```bash
mkdir -p components/memory
```

Create `components/memory/memory-panel.tsx`:

```tsx
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
```

**Step 2: Create memory page**

```bash
mkdir -p app/memory
```

Create `app/memory/page.tsx`:

```tsx
import { Shell } from "@/components/layout/shell"
import { MemoryPanel } from "@/components/memory/memory-panel"

export default function MemoryPage() {
  return (
    <Shell>
      <MemoryPanel content={null} />
    </Shell>
  )
}
```

**Step 3: Commit**

```bash
git add app/memory/ components/memory/
git commit -m "cc-ui/web: Memory page with search and content display"
```

---

## Task 21: Sessions History Page

**Files:**
- Create: `app/sessions/page.tsx`
- Create: `components/sessions/sessions-table.tsx`

**Step 1: Create SessionsTable component**

```bash
mkdir -p components/sessions
```

Create `components/sessions/sessions-table.tsx`:

```tsx
"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns" // will install next
import { MessageSquareIcon, Trash2Icon, ExternalLinkIcon } from "lucide-react"
import { useSessions } from "@/hooks/use-sessions"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function SessionsTable() {
  const { sessions, deleteSession } = useSessions()

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <MessageSquareIcon className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No sessions yet</p>
        <Link href="/chat">
          <Button size="sm" variant="outline">Start a conversation</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {sessions.map((session, i) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg glass-2 border border-white/8 flex items-center justify-center shrink-0">
            <MessageSquareIcon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <Link href={`/chat/${session.id}`} className="block">
              <p className="text-sm font-medium truncate hover:text-primary transition-colors">
                {session.title || "Untitled conversation"}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {session.lastMessage || "No messages"}
              </p>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground/60">
              {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
            </span>
            <Link href={`/chat/${session.id}`}>
              <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLinkIcon className="w-3 h-3" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
              onClick={() => deleteSession(session.id)}
            >
              <Trash2Icon className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
```

**Step 2: Install date-fns**

```bash
bun add date-fns
```

**Step 3: Create sessions page**

```bash
mkdir -p app/sessions
```

Create `app/sessions/page.tsx`:

```tsx
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
```

**Step 4: Commit**

```bash
git add app/sessions/ components/sessions/
git commit -m "cc-ui/web: Sessions history page with delete and resume"
```

---

## Task 22: Settings Page

**Files:**
- Create: `app/settings/page.tsx`
- Create: `components/settings/status-card.tsx`

**Step 1: Create StatusCard**

```bash
mkdir -p components/settings
```

Create `components/settings/status-card.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { CheckCircleIcon, XCircleIcon, ServerIcon } from "lucide-react"

interface GatewayInfo {
  ok: boolean
  model?: string
  provider?: string
}

export function StatusCard() {
  const [info, setInfo] = useState<GatewayInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = (process.env.NEXT_PUBLIC_GATEWAY_WS_URL ?? "ws://localhost:4227/ws")
      .replace(/^ws/, "http")
      .replace("/ws", "/")

    fetch(url)
      .then((r) => r.ok ? setInfo({ ok: true }) : setInfo({ ok: false }))
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
```

**Step 2: Create Settings page**

```bash
mkdir -p app/settings
```

Create `app/settings/page.tsx`:

```tsx
"use client"

import { useRouter } from "next/navigation"
import { SettingsIcon, LogOutIcon } from "lucide-react"
import { Shell } from "@/components/layout/shell"
import { StatusCard } from "@/components/settings/status-card"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
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
```

**Step 3: Commit**

```bash
git add app/settings/ components/settings/
git commit -m "cc-ui/web: Settings page with gateway status and logout"
```

---

## Task 23: Clean up example files + final build test

**Files:**
- Delete: `app/page.tsx` placeholder content (already replaced in Task 19)
- Delete: `components/example.tsx`, `components/component-example.tsx`

**Step 1: Remove example component files**

```bash
rm /Users/malharujawane/Documents/Development/m-y-ai/m-y-ai/ui/web/components/example.tsx
rm /Users/malharujawane/Documents/Development/m-y-ai/m-y-ai/ui/web/components/component-example.tsx
```

**Step 2: Run build to verify no TypeScript/import errors**

```bash
cd /Users/malharujawane/Documents/Development/m-y-ai/m-y-ai/ui/web
bun run build 2>&1
```

Expected: Build completes successfully. Fix any TS errors before committing.

**Step 3: Run dev server and verify pages load**

```bash
bun run dev &
sleep 3
curl -s http://localhost:3000/ -L -o /dev/null -w "%{http_code}"
```

Expected: `200` (or `307` redirect to `/login`)

**Step 4: Update .env.example at project root**

Add to `/Users/malharujawane/Documents/Development/m-y-ai/m-y-ai/.env.example`:

```bash
# Web UI (ui/web/.env.local)
GATEWAY_PASSWORD=changeme
NEXT_PUBLIC_GATEWAY_WS_URL=ws://localhost:4227/ws
NEXT_PUBLIC_APP_NAME=m-y.ai
```

**Step 5: Update AGENTS.md with web UI architecture**

Add note to AGENTS.md explaining the web UI structure.

**Step 6: Final commit**

```bash
git add -A
git commit -m "cc-ui/web: production web UI — cleanup, build verified, docs updated"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | Install framer-motion, react-markdown, rehype-highlight |
| 2 | Dark glassmorphism CSS design system |
| 3 | Root layout with dark mode + metadata |
| 4 | Environment variables setup |
| 5 | Auth API routes (login/logout) |
| 6 | Auth middleware (protects all routes) |
| 7 | Login page |
| 8 | `useSessions` localStorage hook |
| 9 | `useGateway` WebSocket hook with reconnect |
| 10 | `useChat` streaming message accumulator |
| 11 | `ConnectionStatus` badge |
| 12 | `TypingIndicator` animated dots |
| 13 | `MessageBubble` with markdown + syntax highlighting |
| 14 | `CommandPalette` slash command overlay |
| 15 | `InputBar` with auto-resize + slash detection |
| 16 | `ChatCanvas` full chat assembly |
| 17 | Sidebar + SidebarSessionItem |
| 18 | Shell layout + MobileHeader |
| 19 | Chat routes (`/chat`, `/chat/new`, `/chat/[sessionId]`) |
| 20 | Memory page |
| 21 | Sessions history page |
| 22 | Settings page |
| 23 | Cleanup + build verification |
