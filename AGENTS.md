
---

## Web UI (`ui/web/`)

Next.js 16 App Router web application. **Never modify gateway code when working on UI.**

### Routes
- `/login` — Password auth (env: `GATEWAY_PASSWORD`)
- `/chat/new` — Auto-generates UUID session, redirects to `/chat/[sessionId]`
- `/chat/[sessionId]` — Active chat session with dedicated WebSocket
- `/memory` — Memory viewer
- `/sessions` — Session history (localStorage)
- `/settings` — Gateway status, logout

### Key Conventions
- **Auth:** `middleware.ts` protects all routes; `mya-token` httpOnly cookie
- **WebSocket:** `hooks/use-gateway.ts` — one WS per `/chat/[sessionId]` page, reconnects automatically
- **Sessions:** Stored in `localStorage` under key `mya-sessions` via `hooks/use-sessions.ts`
- **Streaming:** `hooks/use-chat.ts` accumulates streaming tokens in `useRef`, updates state batched
- **Design:** Dark-only glassmorphism; `.glass-1/.glass-2/.glass-3` utility classes in `globals.css`
- **Components:** Chat components in `components/chat/`, layout in `components/layout/`
- **Package manager:** Use `bun` (not npm) for installs

### Environment Variables
```env
GATEWAY_PASSWORD=         # Server-side auth secret
NEXT_PUBLIC_GATEWAY_WS_URL=ws://localhost:4227/ws
NEXT_PUBLIC_APP_NAME=m-y.ai
```

### Running
```bash
cd ui/web && bun run dev
```
