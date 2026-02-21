/**
 * messaging.js — Unified Messaging Module for m-y-ai
 *
 * Platform-agnostic messaging layer.
 * Quick-start:
 *
 *   import { MessagingManager, PlatformAdapter } from './messaging.js'
 *
 *   class MyAppAdapter extends PlatformAdapter {
 *     // implement send(), start(), stop()
 *   }
 *
 *   const manager = new MessagingManager()
 *   manager.register('myapp', new MyAppAdapter({ allowedDMs: ['*'] }))
 *   manager.onMessage(async (msg) => {
 *     await manager.sendTyping(msg.platform, msg.chatId)
 *     await manager.sendMessage(msg.platform, msg.chatId, 'Hello!')
 *   })
 *   await manager.start()
 */

import { EventEmitter } from 'events'

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Standard Message Shape
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} Message
 * @property {string}      platform   - Platform identifier (e.g. 'myapp', 'web', 'desktop')
 * @property {string}      chatId     - Conversation / channel identifier
 * @property {string}      text       - Message body
 * @property {string}      sender     - User / device identifier of the sender
 * @property {boolean}     isGroup    - True when the chat is a group/channel
 * @property {string[]}    mentions   - Mentioned IDs; includes 'self' when the AI is @-mentioned
 * @property {Attachment|null} image  - Optional image attachment
 * @property {any}         raw        - Original, platform-specific message object
 */

/**
 * @typedef {Object} Attachment
 * @property {string} data      - Base-64 encoded binary content
 * @property {string} mediaType - MIME type (e.g. 'image/jpeg', 'image/png')
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Shared Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Split long text into chunks at sensible break-points (newline → space → hard cut).
 * Useful for any platform or UI component with a character limit.
 *
 * @param {string} text
 * @param {number} [maxLength=4096]
 * @returns {string[]}
 */
export function splitMessage(text, maxLength = 4096) {
    const chunks = []
    let remaining = text
    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining)
            break
        }
        let bp = remaining.lastIndexOf('\n', maxLength)
        if (bp === -1 || bp < maxLength / 2) bp = remaining.lastIndexOf(' ', maxLength)
        if (bp === -1 || bp < maxLength / 2) bp = maxLength
        chunks.push(remaining.substring(0, bp))
        remaining = remaining.substring(bp).trim()
    }
    return chunks
}

/**
 * Generate a deterministic session / memory key for a conversation.
 * Format: `agent:<agentId>:<platform>:<dm|group>:<chatId>`
 *
 * @param {string}  agentId  - AI agent / persona identifier
 * @param {string}  platform - Platform name
 * @param {Message} message
 * @returns {string}
 */
export function generateSessionKey(agentId, platform, message) {
    const type = message.isGroup ? 'group' : 'dm'
    return `agent:${agentId}:${platform}:${type}:${message.chatId}`
}

/**
 * Evaluate whether the app should respond to a message based on allow-lists
 * and optional mention-gating. Returns true if the message passes all rules.
 *
 * @param {Message} message
 * @param {Object}  cfg
 * @param {string[]}  cfg.allowedGroups          - Group IDs to accept; '*' = all; [] = none
 * @param {string[]}  cfg.allowedDMs             - Sender IDs to accept;  '*' = all; [] = none
 * @param {boolean}   [cfg.respondToMentionsOnly] - Only respond in groups when @-mentioned
 * @param {string}  [label='Messaging']           - Label used in log output
 * @returns {boolean}
 */
export function shouldRespond(message, cfg = {}, label = 'Messaging') {
    const { chatId, isGroup, sender, mentions } = message
    const { allowedGroups = [], allowedDMs = [], respondToMentionsOnly = false } = cfg

    if (isGroup) {
        if (allowedGroups.length === 0) {
            console.log(`[${label}][Security] Blocked group ${chatId} — no groups allowed`)
            return false
        }
        if (!allowedGroups.includes('*') && !allowedGroups.includes(chatId)) {
            console.log(`[${label}][Security] Blocked group ${chatId} — not in allowlist`)
            return false
        }
        if (respondToMentionsOnly && !mentions?.includes('self')) {
            console.log(`[${label}][Security] Blocked group ${chatId} — not mentioned`)
            return false
        }
    } else {
        if (allowedDMs.length === 0) {
            console.log(`[${label}][Security] Blocked DM from ${sender || chatId} — no DMs allowed`)
            return false
        }
        if (!allowedDMs.includes('*') && !allowedDMs.includes(chatId)) {
            console.log(`[${label}][Security] Blocked DM from ${sender || chatId} — not in allowlist`)
            return false
        }
    }

    return true
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — PlatformAdapter Base Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PlatformAdapter — extend this for every transport you want to plug into m-y-ai.
 *
 * Minimal implementation:
 *   class WebSocketAdapter extends PlatformAdapter {
 *     async start()                          { ... }
 *     async stop()                           { ... }
 *     async send(chatId, text)               { ... }
 *   }
 *
 * Optional overrides for richer platforms:
 *   async sendTyping(chatId)  {}
 *   async stopTyping(chatId)  {}
 *   async react(chatId, messageId, emoji) {}
 *
 * Emit incoming messages by calling:
 *   this.emit('message', message)   // message must conform to the Message typedef above
 */
export class PlatformAdapter extends EventEmitter {
    /**
     * @param {Object}   [config={}]
     * @param {string[]} [config.allowedGroups=[]]           - See shouldRespond()
     * @param {string[]} [config.allowedDMs=['*']]           - See shouldRespond()
     * @param {boolean}  [config.respondToMentionsOnly=false] - See shouldRespond()
     */
    constructor(config = {}) {
        super()
        this.config = {
            allowedGroups: [],
            allowedDMs: ['*'],
            respondToMentionsOnly: false,
            ...config
        }
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    /** Connect / initialise the transport. Override in subclass. */
    async start() {
        throw new Error(`${this.constructor.name}.start() must be implemented`)
    }

    /** Disconnect / tear down the transport. Override in subclass. */
    async stop() {
        throw new Error(`${this.constructor.name}.stop() must be implemented`)
    }

    // ── Outbound API ─────────────────────────────────────────────────────────

    /**
     * Send a text message. Override in subclass.
     * @param {string} chatId
     * @param {string} text
     */
    async send(chatId, text) {
        throw new Error(`${this.constructor.name}.send() must be implemented`)
    }

    /**
     * Show a "typing…" indicator. Override only if the platform supports it.
     * @param {string} chatId
     */
    async sendTyping(chatId) { /* no-op by default */ }

    /**
     * Clear a "typing…" indicator. Override only if the platform supports it.
     * @param {string} chatId
     */
    async stopTyping(chatId) { /* no-op by default */ }

    /**
     * React to a message with an emoji. Override only if the platform supports it.
     * @param {string} chatId
     * @param {string} messageId
     * @param {string} emoji
     */
    async react(chatId, messageId, emoji) { /* no-op by default */ }

    // ── Inbound helpers ───────────────────────────────────────────────────────

    /**
     * Call this from your subclass when an incoming message passes your filters.
     * Runs shouldRespond() automatically unless you pass skipCheck = true.
     *
     * @param {Message} message
     * @param {boolean} [skipCheck=false]
     */
    dispatch(message, skipCheck = false) {
        if (!skipCheck && !shouldRespond(message, this.config, this.constructor.name)) return
        this.emit('message', message)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — MessagingManager (Orchestrator)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * MessagingManager — central hub for all platform adapters in m-y-ai.
 *
 * All incoming messages across every registered adapter are normalised and
 * delivered through a single `onMessage` callback as a standard Message object.
 *
 * @example
 *   import { MessagingManager, PlatformAdapter } from './messaging.js'
 *
 *   class MyWebAdapter extends PlatformAdapter {
 *     async start()               { ... ws.on('message', (raw) => this.dispatch({ ... })) }
 *     async stop()                { ... }
 *     async send(chatId, text)    { ... ws.send(...) }
 *     async sendTyping(chatId)    { ... }
 *   }
 *
 *   const manager = new MessagingManager()
 *   manager.register('web', new MyWebAdapter({ allowedDMs: ['*'] }))
 *
 *   manager.onMessage(async (msg) => {
 *     const session = manager.sessionKey('agent-1', msg)
 *     await manager.sendTyping(msg.platform, msg.chatId)
 *     await manager.sendMessage(msg.platform, msg.chatId, 'Hello from m-y-ai!')
 *   })
 *
 *   await manager.start()
 */
export class MessagingManager extends EventEmitter {
    constructor() {
        super()
        /** @type {Map<string, PlatformAdapter>} */
        this._adapters = new Map()
        this._messageCallback = null
    }

    // ── Registration ─────────────────────────────────────────────────────────

    /**
     * Register a platform adapter before calling start().
     * @param {string}          name    - Unique platform name (e.g. 'web', 'desktop', 'api')
     * @param {PlatformAdapter} adapter
     */
    register(name, adapter) {
        if (this._adapters.has(name)) {
            console.warn(`[Messaging] Adapter '${name}' already registered — overwriting`)
        }
        this._adapters.set(name, adapter)

        // Wire up events
        adapter.on('message', (msg) => {
            const enriched = { ...msg, platform: msg.platform || name }
            if (this._messageCallback) {
                Promise.resolve(this._messageCallback(enriched)).catch((err) => {
                    console.error(`[Messaging][${name}] Error in message handler:`, err.message)
                })
            }
            this.emit('message', enriched)
        })

        // Bubble optional lifecycle events
        for (const ev of ['connected', 'disconnected', 'qr', 'error']) {
            adapter.on(ev, (...args) => this.emit(ev, { platform: name }, ...args))
        }

        return this // chainable
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /**
     * Start one or more adapters (or all registered adapters if none specified).
     * @param {string[]} [platforms]  - Subset of registered platform names to start
     */
    async start(platforms) {
        const names = platforms?.length ? platforms : [...this._adapters.keys()]

        for (const name of names) {
            const adapter = this._adapters.get(name)
            if (!adapter) {
                console.warn(`[Messaging] No adapter registered for '${name}'`)
                continue
            }
            try {
                await adapter.start()
                console.log(`[Messaging] ✓ ${name} started`)
            } catch (err) {
                console.error(`[Messaging] ✗ Failed to start ${name}:`, err.message)
            }
        }
    }

    /**
     * Stop one or more adapters (or all if none specified).
     * @param {string[]} [platforms]
     */
    async stop(platforms) {
        const names = platforms?.length ? platforms : [...this._adapters.keys()]

        for (const name of names) {
            const adapter = this._adapters.get(name)
            if (!adapter) continue
            try {
                await adapter.stop()
                console.log(`[Messaging] ${name} stopped`)
            } catch (err) {
                console.error(`[Messaging] Error stopping ${name}:`, err.message)
            }
        }
    }

    // ── Inbound ───────────────────────────────────────────────────────────────

    /**
     * Register a handler for all incoming messages across all platforms.
     * @param {(msg: Message) => void | Promise<void>} callback
     */
    onMessage(callback) {
        this._messageCallback = callback
        return this
    }

    // ── Outbound API ─────────────────────────────────────────────────────────

    /**
     * Send a text message on a specific platform.
     * Long text is automatically chunked using splitMessage() if the adapter
     * sets a `maxMessageLength` property.
     *
     * @param {string} platform
     * @param {string} chatId
     * @param {string} text
     */
    async sendMessage(platform, chatId, text) {
        const adapter = this._get(platform)
        const limit = adapter.maxMessageLength
        if (limit && text.length > limit) {
            for (const chunk of splitMessage(text, limit)) {
                await adapter.send(chatId, chunk)
            }
        } else {
            await adapter.send(chatId, text)
        }
    }

    /**
     * Show a "typing…" indicator (if the platform supports it).
     * @param {string} platform
     * @param {string} chatId
     */
    async sendTyping(platform, chatId) {
        await this._get(platform).sendTyping(chatId)
    }

    /**
     * Clear a "typing…" indicator (if the platform supports it).
     * @param {string} platform
     * @param {string} chatId
     */
    async stopTyping(platform, chatId) {
        await this._get(platform).stopTyping(chatId)
    }

    /**
     * React to a message with an emoji (if the platform supports it).
     * @param {string} platform
     * @param {string} chatId
     * @param {string} messageId
     * @param {string} emoji
     */
    async react(platform, chatId, messageId, emoji) {
        await this._get(platform).react(chatId, messageId, emoji)
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    /**
     * Generate a session / memory key from a message.
     * @param {string}  agentId
     * @param {Message} message
     * @returns {string}
     */
    sessionKey(agentId, message) {
        return generateSessionKey(agentId, message.platform, message)
    }

    /**
     * Get a direct reference to a registered adapter.
     * @param {string} platform
     * @returns {PlatformAdapter|null}
     */
    getAdapter(platform) {
        return this._adapters.get(platform) ?? null
    }

    /**
     * List all registered platform names.
     * @returns {string[]}
     */
    platforms() {
        return [...this._adapters.keys()]
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _get(platform) {
        const adapter = this._adapters.get(platform)
        if (!adapter) throw new Error(`[Messaging] No adapter registered for '${platform}'. Call register() first.`)
        return adapter
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Convenience factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a pre-wired MessagingManager from a map of { platformName → adapter }.
 *
 * @param {Object.<string, PlatformAdapter>} adapters
 * @returns {MessagingManager}
 *
 * @example
 *   const manager = createMessaging({
 *     web:     new MyWebSocketAdapter(),
 *     desktop: new MyDesktopAdapter(),
 *   })
 */
export function createMessaging(adapters = {}) {
    const manager = new MessagingManager()
    for (const [name, adapter] of Object.entries(adapters)) {
        manager.register(name, adapter)
    }
    return manager
}

export default MessagingManager
