/**
 * messaging/adapters/web.js — WebSocket Adapter
 *
 * Transport for the m-y-ai web app (browser).
 * Each browser connection is a "chat".  The server sends and receives
 * JSON frames over a WebSocket connection.
 *
 * Inbound frame (client → server):
 *   { type: 'message', chatId, text, sender?, isGroup?, image? }
 *
 * Outbound frame (server → client):
 *   { type: 'message',  chatId, text }
 *   { type: 'typing',   chatId }
 *   { type: 'stop_typing', chatId }
 *   { type: 'reaction', chatId, messageId, emoji }
 *   { type: 'error',    message }
 *
 * Requires: `bun add ws` or `npm install ws`
 *
 * Usage:
 *   import WebAdapter from './messaging/adapters/web.js'
 *   const adapter = new WebAdapter({ port: 8765, allowedDMs: ['*'] })
 *   // Then register with MessagingManager
 */

import { WebSocketServer } from 'ws'
import { randomUUID } from 'crypto'
import { PlatformAdapter } from '../messaging.js'

export default class WebAdapter extends PlatformAdapter {
    /**
     * @param {Object} config
     * @param {number}   [config.port=8765]            - WebSocket server port
     * @param {Object}   [config.server]               - Optional existing http.Server to attach to
     * @param {string}   [config.path='/ws']            - WebSocket path
     * @param {string[]} [config.allowedDMs=['*']]
     * @param {string[]} [config.allowedGroups=[]]
     * @param {boolean}  [config.respondToMentionsOnly=false]
     */
    constructor(config = {}) {
        super(config)
        this.port = config.port ?? 8765
        this.httpServer = config.server ?? null
        this.path = config.path ?? '/ws'
        this.platform = 'web'

        /** @type {Map<string, import('ws').WebSocket>} chatId → socket */
        this._sockets = new Map()
        this._wss = null
    }

    async start() {
        const opts = this.httpServer
            ? { server: this.httpServer, path: this.path }
            : { port: this.port, path: this.path }

        this._wss = new WebSocketServer(opts)

        this._wss.on('connection', (ws, req) => {
            const chatId = randomUUID()
            this._sockets.set(chatId, ws)
            console.log(`[Web] Client connected → chatId: ${chatId}`)

            // Greet the client with its assigned chatId
            ws.send(JSON.stringify({ type: 'connected', chatId }))

            ws.on('message', (raw) => {
                try {
                    const frame = JSON.parse(raw.toString())
                    this._handleFrame(chatId, frame)
                } catch (err) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON frame' }))
                }
            })

            ws.on('close', () => {
                this._sockets.delete(chatId)
                console.log(`[Web] Client disconnected → chatId: ${chatId}`)
            })

            ws.on('error', (err) => {
                console.error(`[Web] Socket error (${chatId}):`, err.message)
            })
        })

        this._wss.on('error', (err) => {
            console.error('[Web] WebSocket server error:', err.message)
        })

        console.log(`[Web] Adapter started on ${this.httpServer ? `attached server (${this.path})` : `ws://localhost:${this.port}${this.path}`}`)
    }

    async stop() {
        if (this._wss) {
            this._wss.close()
            this._wss = null
        }
        this._sockets.clear()
        console.log('[Web] Adapter stopped')
    }

    // ── Outbound ─────────────────────────────────────────────────────────────

    async send(chatId, text) {
        this._sendFrame(chatId, { type: 'message', chatId, text })
    }

    async sendTyping(chatId) {
        this._sendFrame(chatId, { type: 'typing', chatId })
    }

    async stopTyping(chatId) {
        this._sendFrame(chatId, { type: 'stop_typing', chatId })
    }

    async react(chatId, messageId, emoji) {
        this._sendFrame(chatId, { type: 'reaction', chatId, messageId, emoji })
    }

    /**
     * Broadcast a frame to every connected client.
     * @param {Object} frame
     */
    broadcast(frame) {
        for (const ws of this._sockets.values()) {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(frame))
            }
        }
    }

    /** Number of currently connected clients. */
    get connectionCount() {
        return this._sockets.size
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _sendFrame(chatId, frame) {
        const ws = this._sockets.get(chatId)
        if (!ws || ws.readyState !== ws.OPEN) {
            console.warn(`[Web] Cannot send to chatId ${chatId} — socket not open`)
            return
        }
        ws.send(JSON.stringify(frame))
    }

    _handleFrame(chatId, frame) {
        if (frame.type !== 'message') return

        const text = (frame.text ?? '').trim()
        if (!text && !frame.image) return

        const message = {
            platform: this.platform,
            chatId: frame.chatId ?? chatId,
            text,
            sender: frame.sender ?? chatId,
            isGroup: Boolean(frame.isGroup),
            mentions: frame.mentions ?? [],
            image: frame.image ?? null,
            raw: frame
        }

        console.log(`[Web] ← "${text.substring(0, 60)}${text.length > 60 ? '…' : ''}" from ${message.sender}`)
        this.dispatch(message)
    }
}
