# m-y.ai Web UI — Design Document
**Date:** 2026-02-22
**Domain:** m-y.ai
**Status:** Approved

---

## Overview

Production-ready Next.js 16 web UI for the m-y.ai personal AI assistant gateway. Dark glassmorphism aesthetic. Multi-route SPA with persistent WebSocket per chat session. Single-user with env-var-based auth gate.

---

## Architecture

### Stack
- **Framework:** Next.js 16 (App Router)
- **UI Components:** shadcn (base-ui, already installed in `ui/web/`)
- **Styling:** Tailwind v4 (already configured)
- **Animations:** Framer Motion (to be added)
- **Icons:** lucide-react (already installed)
- **Markdown:** react-markdown + remark-gfm + rehype-highlight (to be added)
- **Font:** Geist Sans + Geist Mono (already in layout)

### Route Structure
```
/                       → redirect to /chat
/login                  → Password entry (env-var auth)
/chat                   → New chat → auto-redirect to /chat/[sessionId]
/chat/[sessionId]       → Active chat session with WebSocket
/memory                 → Memory viewer (long-term + daily logs via /memory gateway command)
/sessions               → Session history browser (localStorage)
/settings               → Model switcher, provider toggle, status
```

### Auth
- **Middleware** (`middleware.ts`): Intercepts all non-login routes; checks for `mya-token` httpOnly cookie
- **`GATEWAY_PASSWORD`** (server-side env): The secret password
- **Login flow**: POST `/api/auth/login` → verify password → set `mya-token` cookie (httpOnly, secure, 30-day expiry) → redirect to `/`
- No user accounts, no JWT, no Supabase

### WebSocket
- **Env var:** `NEXT_PUBLIC_GATEWAY_WS_URL` (default: `ws://localhost:4227/ws`)
- Each `/chat/[sessionId]` page mounts its own WS connection via `useGateway(sessionId)` hook
- On connect: receives `{ type: 'connected', chatId }` — this `chatId` is used for all subsequent frames
- Inbound frames handled: `connected`, `message`, `typing`, `stop_typing`, `error`
- Outbound frame: `{ type: 'message', chatId, text, sender: 'malhar' }`

---

## Component Structure

```
app/
  layout.tsx                    # Root: dark bg, Geist fonts, metadata
  globals.css                   # Tailwind + glassmorphism CSS vars
  middleware.ts                 # Auth gate
  api/
    auth/
      login/route.ts            # POST: verify GATEWAY_PASSWORD, set cookie
      logout/route.ts           # POST: clear cookie
  login/
    page.tsx                    # Login UI
  chat/
    page.tsx                    # Generate UUID, redirect to /chat/[sessionId]
    [sessionId]/
      page.tsx                  # Chat page — mounts shell + canvas
  memory/
    page.tsx
  sessions/
    page.tsx
  settings/
    page.tsx

components/
  layout/
    shell.tsx                   # Root layout: sidebar + main area
    sidebar.tsx                 # Session list, nav links
    sidebar-session-item.tsx    # Individual session entry
    mobile-header.tsx           # Hamburger + title for mobile
  chat/
    chat-canvas.tsx             # Scrollable message area
    message-bubble.tsx          # AI + user bubbles, markdown rendered
    input-bar.tsx               # Textarea, send, slash command detection
    typing-indicator.tsx        # Animated 3-dot indicator
    connection-status.tsx       # WS status badge (connected/reconnecting/offline)
    command-palette.tsx         # Slash command overlay (/, /new, /status, etc.)
  memory/
    memory-panel.tsx            # Long-term + daily memory display
  sessions/
    sessions-table.tsx          # Session list with delete/open actions
  settings/
    model-selector.tsx
    provider-selector.tsx
    status-card.tsx
  hooks/
    use-gateway.ts              # WebSocket lifecycle, frame send/receive
    use-sessions.ts             # localStorage session CRUD
    use-chat.ts                 # Message array state, streaming accumulator
```

---

## Data Flow

### Chat Session Lifecycle
1. User visits `/chat` → `crypto.randomUUID()` → redirect to `/chat/[sessionId]`
2. Page mounts → `useGateway()` opens WS → receives `{ type: 'connected', chatId }`
3. User types message → `{ type: 'message', chatId, text, sender: 'malhar' }` sent
4. Server sends `{ type: 'typing' }` → `TypingIndicator` shown
5. Server streams `{ type: 'message', text: chunk }` → accumulated in `useRef` buffer → last AI bubble updated incrementally
6. Server sends `{ type: 'stop_typing' }` → streaming cursor removed, bubble finalized

### Session Persistence (localStorage)
```ts
type StoredSession = {
  id: string          // UUID == sessionId in route
  title: string       // First 60 chars of first user message
  createdAt: number   // Unix timestamp
  lastMessage: string // Last message preview
  chatId: string      // Gateway chatId assigned on WS connect
}
```
Stored in `localStorage` as `mya-sessions` JSON array. Sidebar renders from this store.

### Slash Commands
Input starting with `/` triggers `CommandPalette` overlay showing:
| Command | Action |
|---|---|
| `/new` | New chat session |
| `/status` | Show session stats |
| `/memory` | Open memory panel |
| `/model [n]` | Switch model |
| `/help` | Show all commands |
Commands are sent directly over WS as text messages.

---

## Visual Design

### Color System (Dark Glassmorphism)
```css
--bg-base: oklch(0.08 0 0)           /* near-black */
--glass-1: rgba(255,255,255,0.05)    /* subtle panels */
--glass-2: rgba(255,255,255,0.08)    /* AI bubbles */
--glass-3: rgba(255,255,255,0.12)    /* input areas */
--accent: oklch(0.65 0.22 280)       /* indigo/violet */
--accent-glow: oklch(0.65 0.22 280 / 0.3)
```

### Key Visual Decisions
- Background: near-black `#0a0a0f` with a radial gradient accent at center-bottom
- Sidebar: `backdrop-blur-xl bg-white/5 border-r border-white/10`, 260px wide on desktop
- AI bubble: `bg-white/8 backdrop-blur-sm rounded-2xl rounded-tl-sm` with left border in accent color
- User bubble: `bg-indigo-500/20 backdrop-blur-sm rounded-2xl rounded-tr-sm` right-aligned
- Input bar: `bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl` sticky at bottom
- Code blocks inside AI messages: dark background with syntax highlighting (rehype-highlight)
- Framer Motion: message bubbles slide up + fade in, typing indicator spring-bounces, sidebar slides

### Responsive
- `< md`: Sidebar hidden, `MobileHeader` with hamburger opens sidebar as sheet overlay
- Input bar always sticky at bottom
- Message bubbles full-width on mobile

---

## Environment Variables

```env
# Server-side (never exposed to browser)
GATEWAY_PASSWORD=your_secret_password

# Client-side (exposed to browser, prefixed NEXT_PUBLIC_)
NEXT_PUBLIC_GATEWAY_WS_URL=ws://localhost:4227/ws
NEXT_PUBLIC_APP_NAME=m-y.ai
```

---

## Production Checklist
- [ ] Auth middleware on all non-login routes
- [ ] WS reconnect with exponential backoff (max 5 retries)
- [ ] Error boundary on chat canvas (shows reconnect button on WS failure)
- [ ] Streaming accumulation via `useRef` to avoid render thrash
- [ ] `react-markdown` + `remark-gfm` for tables, lists, bold/italic in AI responses
- [ ] `rehype-highlight` for code syntax highlighting
- [ ] `framer-motion` animations (message entry, typing, sidebar)
- [ ] Mobile responsive (sidebar as sheet on mobile)
- [ ] `.env.example` updated with new vars
- [ ] `AGENTS.md` updated with web UI architecture notes
