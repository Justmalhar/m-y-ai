/**
 * messaging/adapters/app.js — HTTP + SSE Adapter
 *
 * Transport for the m-y-ai mobile app (or any REST/HTTP client).
 *
 * Endpoints:
 *   POST /message
 *     Body: { chatId, text, sender?, isGroup?, mentions?, image? }
 *     → Dispatches the message to the agent, returns 202 Accepted
 *
 *   GET  /events/:chatId
 *     → SSE stream; the server pushes typed events as text/event-stream
 *     Event types:
 *       data: { type: 'connected',    chatId }
 *       data: { type: 'message',      chatId, text }
 *       data: { type: 'typing',       chatId }
 *       data: { type: 'stop_typing',  chatId }
 *       data: { type: 'reaction',     chatId, messageId, emoji }
 *
 *   GET  /health
 *     → 200 OK { status: 'ok', connections: N }
 *
 * Requires: Node built-in `http` only (no extra deps).
 *
 * Usage:
 *   import AppAdapter from './messaging/adapters/app.js'
 *   const adapter = new AppAdapter({ port: 3001, allowedDMs: ['*'] })
 */

import http from 'http'
import { randomUUID } from 'crypto'
import { PlatformAdapter } from '../messaging.js'

export default class AppAdapter extends PlatformAdapter {
    /**
     * @param {Object} config
     * @param {number}   [config.port=3001]            - HTTP server port
     * @param {string}   [config.host='0.0.0.0']
     * @param {string[]} [config.allowedDMs=['*']]
     * @param {string[]} [config.allowedGroups=[]]
     * @param {boolean}  [config.respondToMentionsOnly=false]
     */
    constructor(config = {}) {
        super(config)
        this.port = config.port ?? 3001
        this.host = config.host ?? '0.0.0.0'
        this.platform = 'app'

        /** @type {Map<string, Set<http.ServerResponse>>} chatId → set of SSE response objects */
        this._streams = new Map()
        this._server = null
    }

    async start() {
        this._server = http.createServer((req, res) => this._route(req, res))

        await new Promise((resolve, reject) => {
            this._server.listen(this.port, this.host, () => {
                console.log(`[App] Adapter started on http://${this.host}:${this.port}`)
                resolve()
            })
            this._server.on('error', reject)
        })
    }

    async stop() {
        if (this._server) {
            this._server.close()
            this._server = null
        }
        // Close all open SSE streams
        for (const streams of this._streams.values()) {
            for (const res of streams) {
                try { res.end() } catch { /* ignore */ }
            }
        }
        this._streams.clear()
        console.log('[App] Adapter stopped')
    }

    // ── Outbound ─────────────────────────────────────────────────────────────

    async send(chatId, text) {
        this._pushEvent(chatId, { type: 'message', chatId, text })
    }

    async sendTyping(chatId) {
        this._pushEvent(chatId, { type: 'typing', chatId })
    }

    async stopTyping(chatId) {
        this._pushEvent(chatId, { type: 'stop_typing', chatId })
    }

    async react(chatId, messageId, emoji) {
        this._pushEvent(chatId, { type: 'reaction', chatId, messageId, emoji })
    }

    /** Number of active SSE connections */
    get connectionCount() {
        let n = 0
        for (const s of this._streams.values()) n += s.size
        return n
    }

    // ── Router ────────────────────────────────────────────────────────────────

    async _route(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`)

        // CORS for mobile/browser app consumption
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

        // POST /message
        if (req.method === 'POST' && url.pathname === '/message') {
            return this._handlePost(req, res)
        }

        // GET /events/:chatId
        if (req.method === 'GET' && url.pathname.startsWith('/events/')) {
            const chatId = decodeURIComponent(url.pathname.slice('/events/'.length))
            return this._handleSSE(chatId, req, res)
        }

        // GET /health
        if (req.method === 'GET' && url.pathname === '/health') {
            this._json(res, 200, { status: 'ok', connections: this.connectionCount })
            return
        }

        this._json(res, 404, { error: 'Not found' })
    }

    async _handlePost(req, res) {
        let body = ''
        req.on('data', (c) => (body += c.toString()))
        req.on('end', () => {
            let frame
            try {
                frame = JSON.parse(body)
            } catch {
                return this._json(res, 400, { error: 'Invalid JSON' })
            }

            const text = (frame.text ?? '').trim()
            if (!text && !frame.image) {
                return this._json(res, 400, { error: 'text or image is required' })
            }

            const chatId = (frame.chatId ?? randomUUID()).toString()

            const message = {
                platform: this.platform,
                chatId,
                text,
                sender: frame.sender ?? chatId,
                isGroup: Boolean(frame.isGroup),
                mentions: frame.mentions ?? [],
                image: frame.image ?? null,
                raw: frame
            }

            console.log(`[App] ← "${text.substring(0, 60)}${text.length > 60 ? '…' : ''}" from ${message.sender}`)
            this.dispatch(message)
            this._json(res, 202, { accepted: true, chatId })
        })
    }

    _handleSSE(chatId, req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        })

        // Register this response object
        if (!this._streams.has(chatId)) this._streams.set(chatId, new Set())
        this._streams.get(chatId).add(res)

        // Send connected event
        res.write(`data: ${JSON.stringify({ type: 'connected', chatId })}\n\n`)

        // Heartbeat every 25s to keep connection alive through proxies
        const hb = setInterval(() => {
            try { res.write(': heartbeat\n\n') } catch { clearInterval(hb) }
        }, 25_000)

        req.on('close', () => {
            clearInterval(hb)
            this._streams.get(chatId)?.delete(res)
            if (this._streams.get(chatId)?.size === 0) this._streams.delete(chatId)
            console.log(`[App] SSE stream closed for chatId: ${chatId}`)
        })
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _pushEvent(chatId, payload) {
        const streams = this._streams.get(chatId)
        if (!streams || streams.size === 0) {
            console.warn(`[App] No SSE stream for chatId ${chatId} — event dropped`)
            return
        }
        const data = `data: ${JSON.stringify(payload)}\n\n`
        for (const res of streams) {
            try { res.write(data) } catch { streams.delete(res) }
        }
    }

    _json(res, status, body) {
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(body))
    }
}
