import { EventEmitter } from 'events'
import ClaudeAgent from './claude-agent.js'

/**
 * Agent run coordinator with task queue
 * Uses Claude Agent SDK directly instead of HTTP server
 */
export default class AgentRunner extends EventEmitter {
    constructor(sessionManager, config = {}) {
        super()
        this.sessionManager = sessionManager
        this.agent = new ClaudeAgent(config)
        this.providerName = this.agent.providerName
        this.queues = new Map() // sessionKey -> { items: [], processing: boolean }
        this.globalStats = {
            totalQueued: 0,
            totalProcessed: 0,
            totalFailed: 0
        }

        // Forward agent events
        this.agent.on('run:start', (data) => this.emit('agent:start', data))
        this.agent.on('run:text', (data) => this.emit('agent:text', data))
        this.agent.on('run:tool', (data) => this.emit('agent:tool', data))
        this.agent.on('run:complete', (data) => this.emit('agent:complete', data))
        this.agent.on('run:error', (data) => this.emit('agent:error', data))
    }

    /**
     * Get queue status for a session
     */
    getQueueStatus(sessionKey) {
        const queue = this.queues.get(sessionKey)
        if (!queue) return { pending: 0, processing: false }
        return {
            pending: queue.items.length,
            processing: queue.processing
        }
    }

    /**
     * Get global queue stats
     */
    getGlobalStats() {
        let totalPending = 0
        let activeSessions = 0

        for (const [_, queue] of this.queues) {
            totalPending += queue.items.length
            if (queue.processing) activeSessions++
        }

        return {
            ...this.globalStats,
            totalPending,
            activeSessions,
            totalSessions: this.queues.size
        }
    }

    /**
     * Extract platform from session key
     */
    extractPlatform(sessionKey) {
        // Format: agent:<agentId>:<platform>:<type>:<id>
        const parts = sessionKey.split(':')
        return parts[2] || 'unknown'
    }

    /**
     * Set MCP servers config (called from gateway after Composio init)
     */
    setMcpServers(mcpServers) {
        this.mcpServers = mcpServers
    }

    /**
     * Enqueue a run for a session
     */
    async enqueueRun(sessionKey, message, adapter, chatId, image = null) {
        if (!this.queues.has(sessionKey)) {
            this.queues.set(sessionKey, { items: [], processing: false })
        }

        const queue = this.queues.get(sessionKey)
        const position = queue.items.length + (queue.processing ? 1 : 0)

        return new Promise((resolve, reject) => {
            const run = {
                id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                sessionKey,
                message,
                adapter,
                chatId,
                image,
                mcpServers: this.mcpServers || {},
                resolve,
                reject,
                queuedAt: Date.now()
            }

            queue.items.push(run)
            this.globalStats.totalQueued++

            this.emit('queued', {
                runId: run.id,
                sessionKey,
                position,
                queueLength: queue.items.length
            })

            if (position > 0) {
                console.log(`[Queue] Message queued at position ${position} for ${sessionKey}`)
            }

            this.processQueue(sessionKey)
        })
    }

    /**
     * Process the queue for a session
     */
    async processQueue(sessionKey) {
        const queue = this.queues.get(sessionKey)
        if (!queue || queue.processing || queue.items.length === 0) {
            return
        }

        queue.processing = true

        while (queue.items.length > 0) {
            const run = queue.items.shift()
            const waitTime = Date.now() - run.queuedAt

            this.emit('processing', {
                runId: run.id,
                sessionKey,
                waitTimeMs: waitTime,
                remainingInQueue: queue.items.length
            })

            if (waitTime > 1000) {
                console.log(`[Queue] Processing after ${Math.round(waitTime / 1000)}s wait`)
            }

            try {
                const response = await this.executeRun(run)
                this.globalStats.totalProcessed++

                this.emit('completed', {
                    runId: run.id,
                    sessionKey,
                    processingTimeMs: Date.now() - run.queuedAt
                })

                run.resolve(response)
            } catch (error) {
                this.globalStats.totalFailed++

                this.emit('failed', {
                    runId: run.id,
                    sessionKey,
                    error: error.message
                })

                run.reject(error)
            }
        }

        queue.processing = false

        // Clean up empty queues
        setTimeout(() => {
            const q = this.queues.get(sessionKey)
            if (q && q.items.length === 0 && !q.processing) {
                this.queues.delete(sessionKey)
            }
        }, 60000)
    }

    /**
     * Create a canUseTool callback for messaging platforms.
     * Sends approval prompts to the user via the adapter and parses their reply.
     */
    createMessagingCanUseTool(adapter, chatId) {
        const gateway = this.agent.gateway
        if (!gateway) return undefined

        return async (toolName, input, options) => {
            // Handle AskUserQuestion specially — format as numbered options
            if (toolName === 'AskUserQuestion') {
                const questions = input.questions || []
                let prompt = ''
                for (const q of questions) {
                    prompt += `${q.question}\n\n`
                    if (q.options) {
                        q.options.forEach((opt, i) => {
                            prompt += `${i + 1}) ${opt.label}`
                            if (opt.description) prompt += ` — ${opt.description}`
                            prompt += '\n'
                        })
                    }
                    prompt += '\nReply with a number or type your answer.'
                }

                const reply = await gateway.waitForApproval(chatId, adapter, prompt.trim())
                if (!reply) {
                    return { behavior: 'deny', message: 'No response received (timed out).' }
                }

                // Parse numbered selection or pass through as free text
                const num = parseInt(reply.trim())
                const firstQuestion = questions[0]
                if (firstQuestion?.options && num >= 1 && num <= firstQuestion.options.length) {
                    const selected = firstQuestion.options[num - 1]
                    return {
                        behavior: 'allow',
                        updatedInput: {
                            ...input,
                            questions: [{
                                ...firstQuestion,
                                answer: selected.label
                            }]
                        }
                    }
                }

                return {
                    behavior: 'allow',
                    updatedInput: {
                        ...input,
                        questions: [{
                            ...firstQuestion,
                            answer: reply.trim()
                        }]
                    }
                }
            }

            // Standard tool approval
            const reason = options.decisionReason || ''
            let prompt = `Claude wants to use: ${toolName}`
            if (reason) prompt += `\n${reason}`

            // Show relevant input details
            const inputStr = JSON.stringify(input, null, 2)
            if (inputStr.length < 500) {
                prompt += `\n\n${inputStr}`
            }
            prompt += '\n\nReply Y to allow, N to deny.'

            const reply = await gateway.waitForApproval(chatId, adapter, prompt)
            if (!reply) {
                return { behavior: 'deny', message: 'No response received (timed out).', interrupt: true }
            }

            const answer = reply.trim().toLowerCase()
            if (answer === 'y' || answer === 'yes') {
                return { behavior: 'allow', updatedInput: input }
            }

            return { behavior: 'deny', message: reply.trim() || 'User denied the action.' }
        }
    }

    /**
     * Execute a single agent run with streaming messages
     */
    async executeRun(run) {
        const { sessionKey, message, adapter, chatId, image, mcpServers } = run
        const platform = this.extractPlatform(sessionKey)

        // Record user message in transcript
        this.sessionManager.appendTranscript(sessionKey, {
            role: 'user',
            content: message,
            hasImage: !!image
        })

        // Create canUseTool callback for messaging platforms
        const canUseTool = this.createMessagingCanUseTool(adapter, chatId)

        try {
            let currentText = ''
            let fullText = ''

            for await (const chunk of this.agent.run({
                message,
                sessionKey,
                platform,
                chatId,
                image,
                mcpServers,
                canUseTool
            })) {
                // Accumulate text
                if (chunk.type === 'text') {
                    currentText += chunk.content
                    fullText += chunk.content
                }

                // Tool called - send accumulated text first
                if (chunk.type === 'tool_use' && currentText.trim()) {
                    await adapter.sendMessage(chatId, currentText.trim())
                    currentText = ''
                }

                // Done - send any remaining text
                if (chunk.type === 'done' && currentText.trim()) {
                    await adapter.sendMessage(chatId, currentText.trim())
                }
            }

            // Record full response in transcript
            this.sessionManager.appendTranscript(sessionKey, {
                role: 'assistant',
                content: fullText
            })

            return fullText
        } catch (error) {
            console.error(`Agent run failed for ${sessionKey}:`, error)
            throw error
        }
    }

    /**
     * Abort a running query
     */
    abort(sessionKey) {
        return this.agent.abort(sessionKey)
    }
}
