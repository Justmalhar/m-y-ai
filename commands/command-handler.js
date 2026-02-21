import { getProvider, getAvailableProviders } from '../providers/index.js'

/**
 * Slash command handler for Secure OpenClaw
 * Processes commands like /new, /reset, /status, /memory, /model, /provider
 */
export default class CommandHandler {
    constructor(gateway) {
        this.gateway = gateway
        this.pendingModelSelect = new Map() // chatId -> resolve
        this.pendingProviderSelect = new Map() // chatId -> resolve
    }

    /**
     * Check if message is a command
     */
    isCommand(text) {
        return text.trim().startsWith('/')
    }

    /**
     * Parse command and arguments
     */
    parse(text) {
        const trimmed = text.trim()
        const spaceIndex = trimmed.indexOf(' ')
        if (spaceIndex === -1) {
            return { command: trimmed.slice(1).toLowerCase(), args: '' }
        }
        return {
            command: trimmed.slice(1, spaceIndex).toLowerCase(),
            args: trimmed.slice(spaceIndex + 1).trim()
        }
    }

    /**
     * Execute a command
     * @returns {Object} { handled: boolean, response?: string }
     */
    async execute(text, sessionKey, adapter, chatId) {
        if (!this.isCommand(text)) {
            return { handled: false }
        }

        const { command, args } = this.parse(text)

        switch (command) {
            case 'new':
            case 'reset':
                return this.handleReset(sessionKey, adapter, chatId)

            case 'status':
                return this.handleStatus(sessionKey)

            case 'memory':
                return this.handleMemory(args)

            case 'queue':
                return this.handleQueue()

            case 'help':
                return this.handleHelp()

            case 'stop':
                return this.handleStop(sessionKey)

            case 'model':
                return this.handleModel(args, chatId, adapter)

            case 'provider':
                return this.handleProvider(args, chatId, adapter)

            default:
                // Unknown command, pass to agent
                return { handled: false }
        }
    }

    /**
     * Check if a message is a reply to a pending /model or /provider selection
     */
    handlePendingReply(text, chatId) {
        if (this.pendingModelSelect.has(chatId)) {
            const resolve = this.pendingModelSelect.get(chatId)
            this.pendingModelSelect.delete(chatId)
            resolve(text.trim())
            return true
        }
        if (this.pendingProviderSelect.has(chatId)) {
            const resolve = this.pendingProviderSelect.get(chatId)
            this.pendingProviderSelect.delete(chatId)
            resolve(text.trim())
            return true
        }
        return false
    }

    async handleReset(sessionKey, adapter, chatId) {
        // Clear the session
        const sessionManager = this.gateway.sessionManager
        const agentRunner = this.gateway.agentRunner

        // Delete session from agent
        if (agentRunner.agent.sessions.has(sessionKey)) {
            agentRunner.agent.sessions.delete(sessionKey)
        }

        // Clear transcript
        if (sessionManager.sessions.has(sessionKey)) {
            sessionManager.sessions.delete(sessionKey)
        }

        return {
            handled: true,
            response: '🔄 Session reset. Starting fresh!'
        }
    }

    handleStatus(sessionKey) {
        const sessionManager = this.gateway.sessionManager
        const agentRunner = this.gateway.agentRunner

        const session = sessionManager.sessions.get(sessionKey)
        const agentSession = agentRunner.agent.sessions.get(sessionKey)
        const queueStatus = agentRunner.getQueueStatus(sessionKey)
        const globalStats = agentRunner.getGlobalStats()

        const lines = [
            '📊 *Status*',
            '',
            `*Session:* ${sessionKey.split(':').slice(-2).join(':')}`,
            `*Messages:* ${agentSession?.messageCount || 0}`,
            `*Queue:* ${queueStatus.pending} pending${queueStatus.processing ? ' (processing)' : ''}`,
            '',
            `*Global:* ${globalStats.totalProcessed} processed, ${globalStats.totalFailed} failed`
        ]

        return {
            handled: true,
            response: lines.join('\n')
        }
    }

    handleMemory(args) {
        const memoryManager = this.gateway.agentRunner.agent.memoryManager

        if (args === 'list') {
            const files = memoryManager.listDailyFiles()
            const lines = [
                '📝 *Memory Files*',
                '',
                `*MEMORY.md:* ${memoryManager.readLongTermMemory() ? 'exists' : 'empty'}`,
                '',
                '*Daily logs:*',
                ...files.slice(0, 10).map(f => `  • ${f}`)
            ]
            if (files.length > 10) {
                lines.push(`  ... and ${files.length - 10} more`)
            }
            return { handled: true, response: lines.join('\n') }
        }

        if (args.startsWith('search ')) {
            const query = args.slice(7)
            const results = memoryManager.searchMemory(query)
            if (results.length === 0) {
                return { handled: true, response: `🔍 No results for "${query}"` }
            }
            const lines = [
                `🔍 *Search: "${query}"*`,
                ''
            ]
            for (const result of results.slice(0, 5)) {
                lines.push(`*${result.file}:*`)
                for (const match of result.matches.slice(0, 2)) {
                    lines.push(`  Line ${match.line}: ${match.context.substring(0, 100)}...`)
                }
            }
            return { handled: true, response: lines.join('\n') }
        }

        // Show today's memory
        const today = memoryManager.readTodayMemory()
        const longTerm = memoryManager.readLongTermMemory()

        const lines = [
            '🧠 *Memory*',
            '',
            '*Long-term (MEMORY.md):*',
            longTerm ? longTerm.substring(0, 500) + (longTerm.length > 500 ? '...' : '') : 'Empty',
            '',
            '*Today:*',
            today ? today.substring(0, 500) + (today.length > 500 ? '...' : '') : 'No notes yet'
        ]

        return {
            handled: true,
            response: lines.join('\n')
        }
    }

    handleQueue() {
        const stats = this.gateway.agentRunner.getGlobalStats()

        const lines = [
            '📋 *Queue Status*',
            '',
            `*Pending:* ${stats.totalPending}`,
            `*Active sessions:* ${stats.activeSessions}`,
            `*Total sessions:* ${stats.totalSessions}`,
            '',
            `*Processed:* ${stats.totalProcessed}`,
            `*Failed:* ${stats.totalFailed}`
        ]

        return {
            handled: true,
            response: lines.join('\n')
        }
    }

    handleStop(sessionKey) {
        const aborted = this.gateway.agentRunner.abort(sessionKey)
        return {
            handled: true,
            response: aborted ? '⏹️ Stopped current operation' : '⏹️ Nothing to stop'
        }
    }

    async handleModel(args, chatId, adapter) {
        const agent = this.gateway.agentRunner.agent
        const provider = agent.provider
        const models = provider.getAvailableModels()
        const current = provider.getModel()

        // If arg provided directly, e.g. /model 2
        if (args) {
            const idx = parseInt(args) - 1
            if (idx >= 0 && idx < models.length) {
                provider.setModel(models[idx].id)
                return { handled: true, response: `✅ Model set to: ${models[idx].label} (${models[idx].id})` }
            }
            // Try matching by name
            const match = models.find(m => m.id.includes(args.toLowerCase()) || m.label.toLowerCase().includes(args.toLowerCase()))
            if (match) {
                provider.setModel(match.id)
                return { handled: true, response: `✅ Model set to: ${match.label} (${match.id})` }
            }
            return { handled: true, response: `Unknown model. Use /model to see options.` }
        }

        // Show list and wait for reply
        const lines = [
            `🤖 *Models* (${agent.providerName})`,
            `Current: ${current || '(default)'}`,
            ''
        ]
        for (let i = 0; i < models.length; i++) {
            const marker = models[i].id === current ? ' ←' : ''
            lines.push(`${i + 1}) ${models[i].label}${marker}`)
        }
        lines.push('', 'Reply with a number to switch.')

        await adapter.sendMessage(chatId, lines.join('\n'))

        // Wait for reply with timeout
        const reply = await new Promise((resolve) => {
            this.pendingModelSelect.set(chatId, resolve)
            setTimeout(() => {
                if (this.pendingModelSelect.has(chatId)) {
                    this.pendingModelSelect.delete(chatId)
                    resolve(null)
                }
            }, 30000)
        })

        if (!reply) return { handled: true, response: '' }

        const idx = parseInt(reply) - 1
        if (idx >= 0 && idx < models.length) {
            provider.setModel(models[idx].id)
            return { handled: true, response: `✅ Model set to: ${models[idx].label}` }
        }
        return { handled: true, response: 'No change.' }
    }

    async handleProvider(args, chatId, adapter) {
        const agent = this.gateway.agentRunner.agent
        const available = getAvailableProviders()
        const current = agent.providerName

        // If arg provided directly, e.g. /provider opencode
        if (args) {
            const target = args.toLowerCase()
            if (!available.includes(target)) {
                return { handled: true, response: `Unknown provider. Available: ${available.join(', ')}` }
            }
            if (target === current) {
                return { handled: true, response: `Already using ${current}.` }
            }
            this.switchProvider(agent, target)
            return { handled: true, response: `✅ Switched to ${target}` }
        }

        // Show list and wait for reply
        const lines = [
            '🔌 *Providers*',
            `Current: ${current}`,
            ''
        ]
        for (let i = 0; i < available.length; i++) {
            const marker = available[i] === current ? ' ←' : ''
            lines.push(`${i + 1}) ${available[i]}${marker}`)
        }
        lines.push('', 'Reply with a number to switch.')

        await adapter.sendMessage(chatId, lines.join('\n'))

        const reply = await new Promise((resolve) => {
            this.pendingProviderSelect.set(chatId, resolve)
            setTimeout(() => {
                if (this.pendingProviderSelect.has(chatId)) {
                    this.pendingProviderSelect.delete(chatId)
                    resolve(null)
                }
            }, 30000)
        })

        if (!reply) return { handled: true, response: '' }

        const idx = parseInt(reply) - 1
        if (idx >= 0 && idx < available.length) {
            const target = available[idx]
            if (target === current) return { handled: true, response: `Already using ${current}.` }
            this.switchProvider(agent, target)
            return { handled: true, response: `✅ Switched to ${target}` }
        }
        return { handled: true, response: 'No change.' }
    }

    switchProvider(agent, providerName) {
        const config = agent.provider.config || {}
        const newProvider = getProvider(providerName, config)
        agent.provider = newProvider
        agent.providerName = providerName
        // Clear sessions since they belong to the old provider
        agent.sessions.clear()
    }

    handleHelp() {
        const lines = [
            '📖 *Commands*',
            '',
            '`/new` or `/reset` - Start fresh session',
            '`/status` - Show session status',
            '`/memory` - Show memory summary',
            '`/memory list` - List memory files',
            '`/memory search <query>` - Search memories',
            '`/queue` - Show queue status',
            '`/model` - Switch AI model',
            '`/model 2` - Switch to model by number',
            '`/provider` - Switch provider (claude/opencode)',
            '`/stop` - Stop current operation',
            '`/help` - Show this help'
        ]

        return {
            handled: true,
            response: lines.join('\n')
        }
    }
}
