import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'

/**
 * Gateway context — set by the gateway before the agent runs.
 *
 * messaging: MessagingManager instance (from messaging/messaging.js)
 * gateway:   top-level gateway object that owns the agentRunner
 */
let gatewayContext = {
    gateway: null,
    messaging: null,          // MessagingManager
    currentPlatform: null,
    currentChatId: null,
    currentSessionKey: null
}

export function setGatewayContext(ctx) {
    gatewayContext = { ...gatewayContext, ...ctx }
}

export function getGatewayContext() {
    return gatewayContext
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a human-readable connection status from any adapter. */
function adapterStatus(adapter) {
    if (!adapter) return 'unknown'
    // WebAdapter
    if (typeof adapter.connectionCount === 'number') {
        return `connected (${adapter.connectionCount} client${adapter.connectionCount !== 1 ? 's' : ''})`
    }
    // AppAdapter
    if (typeof adapter._streams !== 'undefined') {
        return `connected (${adapter.connectionCount} SSE stream${adapter.connectionCount !== 1 ? 's' : ''})`
    }
    return 'registered'
}

/**
 * Create Gateway MCP server with tools for interacting with the gateway.
 */
export function createGatewayMcpServer() {
    return createSdkMcpServer({
        name: 'gateway',
        version: '1.0.0',
        tools: [

            tool(
                'send_message',
                'Send a message to a specific chat on any connected platform.',
                {
                    platform: z.string().describe('Platform name — one of the registered adapters, e.g. "web", "app", "desktop"'),
                    chat_id: z.string().describe('The chat / conversation ID to send to'),
                    message: z.string().describe('The message text to send')
                },
                async ({ platform, chat_id, message }) => {
                    const { messaging } = gatewayContext
                    if (!messaging) return { success: false, error: 'Messaging manager not available' }

                    if (!messaging.platforms().includes(platform)) {
                        return {
                            success: false,
                            error: `Platform '${platform}' is not registered. Available: ${messaging.platforms().join(', ')}`
                        }
                    }

                    try {
                        await messaging.sendMessage(platform, chat_id, message)
                        return { success: true, platform, chat_id, message_length: message.length }
                    } catch (err) {
                        return { success: false, error: err.message }
                    }
                }
            ),

            tool(
                'list_platforms',
                'List all registered messaging platforms with their adapter type and connection status.',
                {},
                async () => {
                    const { messaging } = gatewayContext
                    if (!messaging) return { success: false, error: 'Messaging manager not available' }

                    const platforms = messaging.platforms().map(name => {
                        const adapter = messaging.getAdapter(name)
                        return {
                            name,
                            adapter: adapter?.constructor?.name ?? 'Unknown',
                            status: adapterStatus(adapter)
                        }
                    })

                    return { success: true, platforms, count: platforms.length }
                }
            ),

            tool(
                'get_queue_status',
                'Get the current processing queue status for all sessions, or a specific session.',
                {
                    session_key: z.string().optional().describe('Optional session key to query a specific session')
                },
                async ({ session_key }) => {
                    const { gateway } = gatewayContext
                    if (!gateway) return { success: false, error: 'Gateway not available' }

                    if (session_key) {
                        const status = gateway.agentRunner.getQueueStatus(session_key)
                        return { success: true, session: session_key, ...status }
                    }

                    return { success: true, ...gateway.agentRunner.getGlobalStats() }
                }
            ),

            tool(
                'get_current_context',
                'Get the current conversation context — platform, chat ID, and session key.',
                {},
                async () => {
                    const { currentPlatform, currentChatId, currentSessionKey } = gatewayContext
                    return {
                        success: true,
                        platform: currentPlatform,
                        chat_id: currentChatId,
                        session_key: currentSessionKey
                    }
                }
            ),

            tool(
                'list_sessions',
                'List all active conversation sessions with metadata.',
                {},
                async () => {
                    const { gateway } = gatewayContext
                    if (!gateway) return { success: false, error: 'Gateway not available' }

                    const sessions = []
                    for (const [key, data] of gateway.agentRunner.agent.sessions) {
                        sessions.push({
                            key,
                            message_count: data.messageCount,
                            last_activity: new Date(data.lastActivity).toISOString(),
                            created: new Date(data.createdAt).toISOString()
                        })
                    }

                    return { success: true, sessions, count: sessions.length }
                }
            ),

            tool(
                'broadcast_message',
                'Send the same message to multiple chats across any connected platforms. Use with caution.',
                {
                    targets: z.array(z.object({
                        platform: z.string().describe('Registered platform name (e.g. "web", "app", "desktop")'),
                        chat_id: z.string().describe('Chat / conversation ID on that platform')
                    })).describe('Array of { platform, chat_id } targets'),
                    message: z.string().describe('The message to broadcast to all targets')
                },
                async ({ targets, message }) => {
                    const { messaging } = gatewayContext
                    if (!messaging) return { success: false, error: 'Messaging manager not available' }

                    const results = []
                    for (const target of targets) {
                        if (!messaging.platforms().includes(target.platform)) {
                            results.push({ ...target, success: false, error: `Platform '${target.platform}' not registered` })
                            continue
                        }
                        try {
                            await messaging.sendMessage(target.platform, target.chat_id, message)
                            results.push({ ...target, success: true })
                        } catch (err) {
                            results.push({ ...target, success: false, error: err.message })
                        }
                    }

                    const successful = results.filter(r => r.success).length
                    return { success: true, sent: successful, failed: results.length - successful, results }
                }
            )
        ]
    })
}