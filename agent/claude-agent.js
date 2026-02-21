import { EventEmitter } from 'events'
import MemoryManager from '../memory/manager.js'
import { createCronMcpServer, setContext as setCronContext, getScheduler } from '../tools/cron.js'
import { createGatewayMcpServer, setGatewayContext } from '../tools/gateway.js'
import { createAppleScriptMcpServer } from '../tools/applescript.js'
import { getProvider } from '../providers/index.js'

/**
 * Build the system prompt with memory system info
 */
function buildSystemPrompt(memoryContext, sessionInfo, cronInfo, providerName = 'claude') {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
    const timeStr = now.toLocaleTimeString('en-US', { hour12: true })

    return `You are Secure OpenClaw, a personal AI assistant communicating via messaging platforms (WhatsApp, iMessage).

## Current Context
- Date: ${dateStr}
- Time: ${timeStr}
- Session: ${sessionInfo.sessionKey}
- Platform: ${sessionInfo.platform}

## Memory System

You have access to a persistent memory system. Use it to remember important information across conversations.

### Memory Structure
- **MEMORY.md**: Curated long-term memory for important facts, preferences, and decisions
- **memory/YYYY-MM-DD.md**: Daily notes (append-only log for each day)

### When to Write Memory
- **Only when the user asks** — e.g. "remember this", "save this", "don't forget"
- **Write to MEMORY.md** for: preferences, important decisions, recurring information, relationships, key facts
- **Write to daily log** for: tasks completed, temporary notes, conversation context, things that happened today

### Memory Tools
- Use \`Read\` tool to read memory files from ~/secure-openclaw/
- Use \`Write\` or \`Edit\` tools to update memory files
- Use \`Bash\` with \`mkdir -p ~/secure-openclaw/memory\` if the directory doesn't exist
- Workspace path: ~/secure-openclaw/
- All memory files should be .md (markdown)

### Memory Writing Guidelines
1. Be concise but include enough context to be useful later
2. Use markdown headers to organize information
3. Include dates when relevant
4. For MEMORY.md, organize by topic/category
5. For daily logs, use timestamps
6. Do NOT proactively use memory unless the user asks you to remember or recall something

## Current Memory Context
${memoryContext || 'No memory files found yet. Start building your memory!'}

## Scheduling / Reminders

You have cron tools to schedule messages:
- \`mcp__cron__schedule_delayed\`: One-time reminder after delay (seconds)
- \`mcp__cron__schedule_recurring\`: Repeat at interval (seconds)
- \`mcp__cron__schedule_cron\`: Cron expression (minute hour day month weekday)
- \`mcp__cron__list_scheduled\`: List all scheduled jobs
- \`mcp__cron__cancel_scheduled\`: Cancel a job by ID

When user says "remind me in X minutes/hours", use schedule_delayed.
When user says "every day at 9am", use schedule_cron with "0 9 * * *".

### Current Scheduled Jobs
${cronInfo || 'No jobs scheduled'}

## Image Handling

When the user sends an image, you will receive it in your context. You can:
- Describe what you see in the image
- Answer questions about the image
- Extract text from images (OCR)
- Analyze charts, diagrams, screenshots

## Communication Style
- Be helpful and conversational
- Keep responses concise for messaging (avoid walls of text)
- DO NOT use markdown formatting (no **, \`, #, -, etc.) - messaging platforms don't render it
- Use plain text only - write naturally without formatting syntax
- Use emoji sparingly and appropriately
- Remember context from the conversation
- Proactively use tools when needed
- DO NOT mention details about connected accounts (emails, usernames, account IDs) unless explicitly asked - just perform the action silently

## Available Tools
Built-in: Read, Write, Edit, Bash, Glob, Grep, TodoWrite, Skill
Scheduling: mcp__cron__schedule_delayed, mcp__cron__schedule_recurring, mcp__cron__schedule_cron, mcp__cron__list_scheduled, mcp__cron__cancel_scheduled
Gateway: mcp__gateway__send_message, mcp__gateway__list_platforms, mcp__gateway__get_queue_status, mcp__gateway__get_current_context, mcp__gateway__list_sessions, mcp__gateway__broadcast_message
AppleScript (macOS): mcp__applescript__run_script, mcp__applescript__list_apps, mcp__applescript__activate_app, mcp__applescript__display_notification
Composio: Access to 500+ app integrations (Gmail, Slack, GitHub, Google Sheets, etc.) and browser automation via Composio MCP tools


## Gateway Tools
- \`mcp__gateway__send_message\`: Send a message to any chat on any platform
- \`mcp__gateway__list_platforms\`: List connected platforms
- \`mcp__gateway__get_queue_status\`: Check message queue status
- \`mcp__gateway__get_current_context\`: Get current platform/chat/session info
- \`mcp__gateway__list_sessions\`: List all active sessions
- \`mcp__gateway__broadcast_message\`: Send to multiple chats (use carefully)

## Tool Selection - IMPORTANT

**Use Composio tools for everything — app integrations AND browser tasks.**
For tasks involving Gmail, Slack, GitHub, Google Sheets, Calendar, Notion, Trello, Jira, and other apps, ALWAYS use Composio MCP tools. These are faster, more reliable, and work via API.

For browser/web tasks, use Composio's browser tool which provides a live browser session. When the user asks to browse a website or interact with a web page, use Composio's browser tool and share the live session URL with the user so they can watch.

## AppleScript Tools (macOS only)
If running on macOS, you have AppleScript automation tools:
- \`mcp__applescript__run_script\`: Execute arbitrary AppleScript code (control apps, system actions, UI scripting)
- \`mcp__applescript__list_apps\`: List running foreground applications
- \`mcp__applescript__activate_app\`: Bring an app to the foreground
- \`mcp__applescript__display_notification\`: Show a macOS notification

Use these for macOS-specific tasks like controlling apps, showing notifications, or system automation.

## Important
- The workspace at ~/secure-openclaw/ is your home — use it to store files and memory
- Always check memory before asking the user for information they may have already told you
- Update memory when you learn new persistent information about the user
- When user asks to be reminded, use the cron scheduling tools

## Platform Switching / Starting Gateway
When the user says things like "can I text you on WhatsApp?" or "I'm going outside, let me message you on WhatsApp":
- This means they want to continue the conversation on WhatsApp
- You need to START the Secure OpenClaw gateway so you can receive WhatsApp messages
- Run this command to start the gateway in the background:
  \`cd ~/secure-openclaw && npm start > /tmp/secure-openclaw.log 2>&1 &\`
- After starting, confirm: "Gateway started! You can message me on WhatsApp now."
- The gateway will show a QR code in the logs if WhatsApp needs to be connected - tell the user to check /tmp/secure-openclaw.log if needed
${providerName === 'opencode' ? `
## Composio Integrations — IMPORTANT

You have access to 500+ app integrations via Composio MCP tools. These are available as remote MCP tools and you SHOULD actively use them.

### How to Use
- Composio tools are available as MCP tools prefixed with the app name (e.g., gmail, slack, github, google_sheets, etc.)
- To find available tools, look for MCP tools related to the app you need
- ALWAYS prefer Composio tools over browser automation for app tasks

### Common Integrations
- **Email**: Gmail — send, read, search emails, manage labels
- **Messaging**: Slack — send messages, read channels, manage threads
- **Code**: GitHub — repos, issues, PRs, commits, actions
- **Docs**: Google Docs, Notion — create, read, edit documents
- **Sheets**: Google Sheets — read, write, update spreadsheets
- **Calendar**: Google Calendar — create, list, update events
- **Tasks**: Trello, Jira, Linear — manage boards, tickets, projects
- **Storage**: Google Drive, Dropbox — upload, download, manage files

### When a User Asks You To Do Something
1. First check if a Composio tool exists for the task (email, messaging, code, docs, etc.)
2. Use the Composio tool directly — do NOT ask the user to do it manually
3. Only fall back to browser tools if no Composio integration exists for that specific task
` : ''}
`
}

/**
 * Claude Agent using the Claude Agent SDK
 * With memory system and cron MCP server
 */
export default class ClaudeAgent extends EventEmitter {
    constructor(config = {}) {
        super()
        this.memoryManager = new MemoryManager()
        this.cronMcpServer = createCronMcpServer()
        this.cronScheduler = getScheduler()
        this.gatewayMcpServer = createGatewayMcpServer()
        this.gateway = null // Set by gateway after construction
        this.sessions = new Map()
        this.abortControllers = new Map()

        // Provider setup
        this.providerName = config.provider || 'claude'
        const providerConfig = {
            allowedTools: config.allowedTools,
            maxTurns: config.maxTurns,
            permissionMode: config.permissionMode,
        }
        if (this.providerName === 'opencode') {
            Object.assign(providerConfig, config.opencode || {})
        }
        this.provider = getProvider(this.providerName, providerConfig)

        this.allowedTools = config.allowedTools || [
            'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
            'TodoWrite', 'Skill', 'AskUserQuestion'
        ]

        // Add cron MCP tools to allowed list
        this.cronTools = [
            'mcp__cron__schedule_delayed',
            'mcp__cron__schedule_recurring',
            'mcp__cron__schedule_cron',
            'mcp__cron__list_scheduled',
            'mcp__cron__cancel_scheduled'
        ]

        // Add gateway MCP tools to allowed list
        this.gatewayTools = [
            'mcp__gateway__send_message',
            'mcp__gateway__list_platforms',
            'mcp__gateway__get_queue_status',
            'mcp__gateway__get_current_context',
            'mcp__gateway__list_sessions',
            'mcp__gateway__broadcast_message'
        ]

        // AppleScript tools (macOS only)
        this.applescriptMcpServer = createAppleScriptMcpServer()
        this.applescriptTools = this.applescriptMcpServer ? [
            'mcp__applescript__run_script',
            'mcp__applescript__list_apps',
            'mcp__applescript__activate_app',
            'mcp__applescript__display_notification'
        ] : []

        this.maxTurns = config.maxTurns || 50
        this.permissionMode = config.permissionMode || 'default'

        // Forward cron events
        this.cronScheduler.on('execute', (data) => this.emit('cron:execute', data))
    }

    getSession(sessionKey) {
        if (!this.sessions.has(sessionKey)) {
            this.sessions.set(sessionKey, {
                sdkSessionId: null,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                messageCount: 0
            })
        }
        return this.sessions.get(sessionKey)
    }

    abort(sessionKey) {
        // Delegate abort to the provider
        return this.provider.abort(sessionKey)
    }

    getCronSummary() {
        const jobs = this.cronScheduler.list()
        if (jobs.length === 0) return null
        return jobs.map(j => `- ${j.id}: ${j.description} (${j.type})`).join('\n')
    }

    /**
     * Build prompt - supports images for vision
     */
    buildPrompt(message, image) {
        if (!image) return message

        return [
            {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: image.mediaType,
                    data: image.data
                }
            },
            {
                type: 'text',
                text: message
            }
        ]
    }

    /**
     * Generate streaming messages for the SDK
     */
    async *generateMessages(message, image) {
        yield {
            type: 'user',
            message: {
                role: 'user',
                content: this.buildPrompt(message, image)
            }
        }
    }

    /**
     * Run the agent for a message
     */
    async *run(params) {
        const {
            message,
            sessionKey,
            platform = 'unknown',
            chatId = null,
            image = null,
            mcpServers = {},
            canUseTool
        } = params

        const session = this.getSession(sessionKey)
        session.lastActivity = Date.now()
        session.messageCount++

        // Set cron context for scheduled messages
        setCronContext({ platform, chatId, sessionKey })

        // Set gateway context
        setGatewayContext({
            gateway: this.gateway,
            currentPlatform: platform,
            currentChatId: chatId,
            currentSessionKey: sessionKey
        })

        // Build system prompt
        const memoryContext = this.memoryManager.getMemoryContext()
        const cronInfo = this.getCronSummary()
        const systemPrompt = buildSystemPrompt(memoryContext, { sessionKey, platform }, cronInfo, this.providerName)

        // Combine all allowed tools
        const allAllowedTools = [...this.allowedTools, ...this.cronTools, ...this.gatewayTools, ...this.applescriptTools]

        const allMcpServers = {
            cron: this.cronMcpServer,
            gateway: this.gatewayMcpServer,
            ...(this.applescriptMcpServer ? { applescript: this.applescriptMcpServer } : {}),
            ...mcpServers
        }

        if (image) console.log('[ClaudeAgent] With image attachment')

        this.emit('run:start', { sessionKey, message, hasImage: !!image })

        try {
            let fullText = ''
            let hasStreamedContent = false

            // Delegate to provider - pass prompt and all options
            const queryParams = {
                prompt: this.generateMessages(message, image),
                chatId: sessionKey,
                mcpServers: allMcpServers,
                allowedTools: allAllowedTools,
                maxTurns: this.maxTurns,
                systemPrompt,
                permissionMode: this.permissionMode
            }
            if (canUseTool) {
                queryParams.canUseTool = canUseTool
            }
            for await (const chunk of this.provider.query(queryParams)) {
                // Handle streaming partial messages (token-level streaming)
                if (chunk.type === 'stream_event' && chunk.event) {
                    const event = chunk.event
                    hasStreamedContent = true

                    // Text delta - stream individual tokens
                    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                        const text = event.delta.text
                        if (text) {
                            fullText += text
                            yield { type: 'text', content: text, isReasoning: !!event.isReasoning }
                            this.emit('run:text', { sessionKey, content: text })
                        }
                    }
                    // Tool use start
                    else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
                        yield {
                            type: 'tool_use',
                            name: event.content_block.name,
                            input: event.content_block.input || {},
                            id: event.content_block.id
                        }
                        this.emit('run:tool', { sessionKey, name: event.content_block.name })
                    }
                    continue
                }

                // Handle complete assistant messages (only if we haven't streamed content)
                if (chunk.type === 'assistant' && chunk.message?.content) {
                    for (const block of chunk.message.content) {
                        if (block.type === 'text' && block.text && !hasStreamedContent) {
                            fullText += block.text
                            yield { type: 'text', content: block.text }
                            this.emit('run:text', { sessionKey, content: block.text })
                        } else if (block.type === 'tool_use') {
                            if (!hasStreamedContent) {
                                yield { type: 'tool_use', name: block.name, input: block.input, id: block.id }
                                this.emit('run:tool', { sessionKey, name: block.name })
                            }
                        }
                    }
                    continue
                }

                // Handle tool results
                if (chunk.type === 'tool_result' || chunk.type === 'result') {
                    yield { type: 'tool_result', result: chunk.result || chunk.content }
                    continue
                }

                // Handle done/aborted/error from provider
                if (chunk.type === 'done') {
                    break
                }
                if (chunk.type === 'aborted') {
                    // silently handle abort
                    yield { type: 'aborted' }
                    this.emit('run:aborted', { sessionKey })
                    return
                }
                if (chunk.type === 'error') {
                    yield { type: 'error', error: chunk.error }
                    this.emit('run:error', { sessionKey, error: chunk.error })
                    return
                }

                if (chunk.type !== 'system') {
                    yield chunk
                }
            }

            yield { type: 'done', fullText }
            this.emit('run:complete', { sessionKey, response: fullText })

        } catch (error) {
            if (error.name === 'AbortError') {
                // silently handle abort
                yield { type: 'aborted' }
                this.emit('run:aborted', { sessionKey })
            } else {
                console.error('[ClaudeAgent] Error:', error)
                yield { type: 'error', error: error.message }
                this.emit('run:error', { sessionKey, error })
                throw error
            }
        }
    }

    /**
     * Run and collect full response
     */
    async runAndCollect(params) {
        let fullText = ''
        for await (const chunk of this.run(params)) {
            if (chunk.type === 'text') {
                fullText += chunk.content
            }
            if (chunk.type === 'done') {
                return chunk.fullText || fullText
            }
            if (chunk.type === 'error') {
                throw new Error(chunk.error)
            }
        }
        return fullText
    }

    stopCron() {
        this.cronScheduler.stop()
    }
}
