/**
 * messaging/adapters/desktop.js — Desktop Adapter
 *
 * Transport for the m-y-ai desktop app.  Supports two modes:
 *
 * ── Mode A: IPC / stdin-stdout (default) ────────────────────────────────────
 *   Reads newline-delimited JSON from stdin, writes newline-delimited JSON to stdout.
 *   Compatible with any desktop shell, CLI wrapper, or child_process IPC.
 *
 *   Inbound (stdin):
 *     { type: 'message', chatId, text, sender?, isGroup?, image? }
 *
 *   Outbound (stdout):
 *     { type: 'message',     chatId, text }
 *     { type: 'typing',      chatId }
 *     { type: 'stop_typing', chatId }
 *     { type: 'reaction',    chatId, messageId, emoji }
 *     { type: 'connected' }
 *
 * ── Mode B: Electron ipcMain ─────────────────────────────────────────────────
 *   Set config.mode = 'electron' and pass config.ipcMain from the Electron main process.
 *   IPC channels:
 *     'mya:message'  — renderer → main  (inbound frame)
 *     'mya:send'     — main → renderer  (reply text)
 *     'mya:typing'   — main → renderer
 *     'mya:stop_typing'
 *     'mya:reaction' — main → renderer
 *
 *   Renderer-side example:
 *     const { ipcRenderer } = require('electron')
 *     ipcRenderer.send('mya:message', { chatId: 'desktop-1', text: 'Hello!' })
 *     ipcRenderer.on('mya:send', (_, { chatId, text }) => displayReply(text))
 *
 * Usage:
 *   import DesktopAdapter from './messaging/adapters/desktop.js'
 *
 *   // Mode A (stdio):
 *   const adapter = new DesktopAdapter({ allowedDMs: ['*'] })
 *
 *   // Mode B (Electron):
 *   const adapter = new DesktopAdapter({ mode: 'electron', ipcMain, webContents, allowedDMs: ['*'] })
 */

import { createInterface } from 'readline'
import { PlatformAdapter } from '../messaging.js'

const DEFAULT_CHAT_ID = 'desktop-main'

export default class DesktopAdapter extends PlatformAdapter {
    /**
     * @param {Object} config
     * @param {'stdio'|'electron'} [config.mode='stdio']  - Transport mode
     * @param {Object}  [config.ipcMain]      - Electron ipcMain (mode = 'electron')
     * @param {Object}  [config.webContents]  - Electron BrowserWindow.webContents (mode = 'electron')
     * @param {string}  [config.chatId]       - Default chat ID for stdio mode
     * @param {string[]} [config.allowedDMs=['*']]
     * @param {string[]} [config.allowedGroups=[]]
     * @param {boolean}  [config.respondToMentionsOnly=false]
     */
    constructor(config = {}) {
        super(config)
        this.mode = config.mode ?? 'stdio'
        this.ipcMain = config.ipcMain ?? null
        this.webContents = config.webContents ?? null
        this.chatId = config.chatId ?? DEFAULT_CHAT_ID
        this.platform = 'desktop'
        this._rl = null
    }

    async start() {
        if (this.mode === 'electron') {
            this._startElectron()
        } else {
            this._startStdio()
        }
        console.log(`[Desktop] Adapter started (mode: ${this.mode})`)
    }

    async stop() {
        if (this._rl) {
            this._rl.close()
            this._rl = null
        }
        if (this.mode === 'electron' && this.ipcMain) {
            this.ipcMain.removeAllListeners('mya:message')
        }
        console.log('[Desktop] Adapter stopped')
    }

    // ── Outbound ─────────────────────────────────────────────────────────────

    async send(chatId, text) {
        this._out({ type: 'message', chatId, text })
    }

    async sendTyping(chatId) {
        this._out({ type: 'typing', chatId })
    }

    async stopTyping(chatId) {
        this._out({ type: 'stop_typing', chatId })
    }

    async react(chatId, messageId, emoji) {
        this._out({ type: 'reaction', chatId, messageId, emoji })
    }

    // ── Mode A: stdio ─────────────────────────────────────────────────────────

    _startStdio() {
        this._rl = createInterface({
            input: process.stdin,
            terminal: false
        })

        this._rl.on('line', (line) => {
            line = line.trim()
            if (!line) return
            try {
                const frame = JSON.parse(line)
                this._handleFrame(frame)
            } catch {
                this._out({ type: 'error', message: 'Invalid JSON frame' })
            }
        })

        this._rl.on('close', () => {
            console.log('[Desktop] stdin closed — adapter stopping')
            this.emit('disconnected')
        })

        // Signal readiness
        this._out({ type: 'connected', chatId: this.chatId })
    }

    _handleFrame(frame) {
        if (frame.type !== 'message') return

        const text = (frame.text ?? '').trim()
        if (!text && !frame.image) return

        const message = {
            platform: this.platform,
            chatId: frame.chatId ?? this.chatId,
            text,
            sender: frame.sender ?? 'user',
            isGroup: Boolean(frame.isGroup),
            mentions: frame.mentions ?? [],
            image: frame.image ?? null,
            raw: frame
        }

        console.error(`[Desktop] ← "${text.substring(0, 60)}${text.length > 60 ? '…' : ''}"`)
        this.dispatch(message)
    }

    _out(payload) {
        if (this.mode === 'electron') {
            this._sendToRenderer(payload)
        } else {
            // Write to stdout as newline-delimited JSON
            process.stdout.write(JSON.stringify(payload) + '\n')
        }
    }

    // ── Mode B: Electron ──────────────────────────────────────────────────────

    _startElectron() {
        if (!this.ipcMain) {
            throw new Error('[Desktop] config.ipcMain is required in electron mode')
        }

        this.ipcMain.on('mya:message', (_event, frame) => {
            if (!frame || frame.type !== 'message') return

            const text = (frame.text ?? '').trim()
            if (!text && !frame.image) return

            // In Electron mode, capture the sender's webContents for targeted replies
            if (_event.sender && !this.webContents) {
                this.webContents = _event.sender
            }

            const message = {
                platform: this.platform,
                chatId: frame.chatId ?? this.chatId,
                text,
                sender: frame.sender ?? 'user',
                isGroup: Boolean(frame.isGroup),
                mentions: frame.mentions ?? [],
                image: frame.image ?? null,
                raw: frame
            }

            console.log(`[Desktop/Electron] ← "${text.substring(0, 60)}${text.length > 60 ? '…' : ''}"`)
            this.dispatch(message)
        })
    }

    _sendToRenderer(payload) {
        if (!this.webContents || this.webContents.isDestroyed()) {
            console.warn('[Desktop/Electron] No webContents available — event dropped')
            return
        }
        const channel = `mya:${payload.type}`
        this.webContents.send(channel, payload)
    }
}
