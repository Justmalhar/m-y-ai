# m-y.ai — Web UI

Production-ready web interface for the [m-y-ai](../../README.md) personal AI assistant gateway. Real-time chat over WebSocket with streaming AI responses, multi-session management, memory browsing, and session history — wrapped in a dark glassmorphism design.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind v4 + dark glassmorphism design system |
| Components | shadcn (base-ui) |
| Animations | Framer Motion |
| Icons | lucide-react |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| Package manager | **bun** (not npm) |

---

## Prerequisites

- The **m-y-ai gateway** running (`node gateway.js` or `docker compose up` from the repo root) — the UI connects to it over WebSocket
- [Bun](https://bun.sh) installed
- Node.js 20+

---

## Setup

```bash
# From the repo root
cd ui/web

# Install dependencies
bun install

# Copy env template and fill in values
cp ../../.env.example .env.local
```

Edit `.env.local`:

```env
# Required — password to access the web UI
GATEWAY_PASSWORD=your_secret_password

# WebSocket URL of the running gateway (default shown)
NEXT_PUBLIC_GATEWAY_WS_URL=ws://localhost:4227/ws

# App branding
NEXT_PUBLIC_APP_NAME=m-y.ai
```

---

## Running

```bash
# Development (hot reload)
bun run dev

# Production build + start
bun run build
bun run start
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login` — enter the `GATEWAY_PASSWORD` to authenticate.

---

## Features

### Chat
- **Multi-session** — each chat session gets a unique UUID and its own WebSocket connection to the gateway
- **Streaming** — AI responses stream token-by-token with a live cursor indicator
- **Typing indicator** — animated three-dot bounce while the AI is processing
- **Markdown rendering** — full GFM (tables, checkboxes, fenced code) with syntax highlighting
- **Slash commands** — type `/` to open the command palette (`/new`, `/status`, `/memory`, `/model`, `/help`, etc.)
- **Auto-reconnect** — WebSocket reconnects automatically with exponential backoff (up to 5 retries, max 16 s)

### Navigation
- **Sidebar** — session history list, new chat button, nav links to Memory / History / Settings
- **Mobile** — sidebar collapses to a spring-animated slide-out drawer; closes automatically on navigation
- **Session persistence** — sessions stored in `localStorage`, survive page refresh

### Auth
- Single-password auth via `GATEWAY_PASSWORD` env var
- `httpOnly` cookie (`mya-token`) with 30-day expiry
- Middleware protects all routes; `/login` and auth API routes are public
- Open-redirect protection on the post-login redirect

---

## Routes

| Route | Description |
|---|---|
| `/` | Redirects to `/chat` |
| `/login` | Password authentication |
| `/chat` | Redirects to `/chat/new` |
| `/chat/new` | Generates a UUID, redirects to `/chat/[sessionId]` |
| `/chat/[sessionId]` | Active chat session |
| `/memory` | Memory viewer (send `/memory` in chat to load content) |
| `/sessions` | Session history with delete and resume |
| `/settings` | Gateway status, env config, logout |
| `POST /api/auth/login` | Auth endpoint (sets cookie) |
| `POST /api/auth/logout` | Clears auth cookie |

---

## Project Structure

```
ui/web/
├── app/
│   ├── layout.tsx              # Root layout — dark mode, Geist fonts
│   ├── globals.css             # Design system tokens + glassmorphism utilities
│   ├── middleware.ts           # Auth gate — protects all routes
│   ├── page.tsx                # → redirect /chat
│   ├── api/auth/
│   │   ├── login/route.ts      # POST: verify password, set cookie
│   │   └── logout/route.ts     # POST: clear cookie
│   ├── login/page.tsx
│   ├── chat/
│   │   ├── page.tsx            # → redirect /chat/new
│   │   ├── new/page.tsx        # UUID generation + redirect
│   │   └── [sessionId]/page.tsx
│   ├── memory/page.tsx
│   ├── sessions/page.tsx
│   └── settings/page.tsx
│
├── hooks/
│   ├── use-gateway.ts          # WebSocket lifecycle + reconnect backoff
│   ├── use-chat.ts             # Message state + streaming token accumulation
│   └── use-sessions.ts         # localStorage session CRUD
│
└── components/
    ├── chat/
    │   ├── chat-canvas.tsx     # Full chat assembly (messages + input + status)
    │   ├── message-bubble.tsx  # AI (markdown) + user (plain) bubbles
    │   ├── input-bar.tsx       # Auto-resize textarea + slash command detection
    │   ├── command-palette.tsx # Slash command overlay
    │   ├── typing-indicator.tsx
    │   └── connection-status.tsx
    ├── layout/
    │   ├── shell.tsx           # Desktop sidebar + main area wrapper
    │   ├── sidebar.tsx         # Session list + nav links + brand
    │   ├── sidebar-session-item.tsx
    │   └── mobile-header.tsx   # Hamburger + slide-out drawer
    ├── memory/
    │   └── memory-panel.tsx    # Memory content viewer with search
    ├── sessions/
    │   └── sessions-table.tsx  # Session history list
    └── settings/
        └── status-card.tsx     # Gateway HTTP health check
```

---

## WebSocket Protocol

The UI connects to the gateway at `NEXT_PUBLIC_GATEWAY_WS_URL`. Frame shapes:

**Client → Server**
```json
{ "type": "message", "chatId": "<uuid>", "text": "Hello", "sender": "malhar" }
```

**Server → Client**
```json
{ "type": "connected",   "chatId": "<uuid>" }
{ "type": "typing",      "chatId": "<uuid>" }
{ "type": "message",     "chatId": "<uuid>", "text": "<chunk>" }
{ "type": "stop_typing", "chatId": "<uuid>" }
{ "type": "error",       "message": "..." }
```

One WebSocket connection is opened per `/chat/[sessionId]` page and closed when the user navigates away.

---

## Design System

Dark-only glassmorphism. Key CSS utilities defined in `globals.css`:

```css
.glass-1   /* bg: white/4%,  blur: 24px */
.glass-2   /* bg: white/7%,  blur: 16px */
.glass-3   /* bg: white/11%, blur: 12px */
```

Primary accent: `oklch(0.65 0.22 280)` — indigo/violet.
Background: `oklch(0.08 0.005 280)` — near-black with a subtle violet radial gradient.

---

## Deployment

The web UI deploys independently of the gateway. Point `NEXT_PUBLIC_GATEWAY_WS_URL` at wherever the gateway is running.

**Vercel (recommended for the UI):**
```bash
vercel --cwd ui/web
```
Set `GATEWAY_PASSWORD` and `NEXT_PUBLIC_GATEWAY_WS_URL` as environment variables in the Vercel dashboard.

**Docker (self-hosted alongside gateway):**
The gateway `docker-compose.yml` at the repo root exposes port `4227`. Run the web UI as a separate service or via `bun run start` on the host.
