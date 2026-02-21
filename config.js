const parseList = (env) => env ? env.split(',').map(s => s.trim()).filter(Boolean) : []

export default {
    agentId: 'm-y-ai',

    web: {
        enabled: true,
        allowedDMs: parseList(process.env.WHATSAPP_ALLOWED_DMS),       // phone numbers, or '*' for all
        allowedGroups: parseList(process.env.WHATSAPP_ALLOWED_GROUPS),  // group JIDs
        respondToMentionsOnly: true
    },

    desktop: {
        enabled: false,
        allowedDMs: parseList(process.env.IMESSAGE_ALLOWED_DMS),       // chat IDs, or '*' for all
        allowedGroups: parseList(process.env.IMESSAGE_ALLOWED_GROUPS),
        respondToMentionsOnly: true
    },

    app: {
        enabled: true,
        token: process.env.TELEGRAM_BOT_TOKEN || '',
        allowedDMs: parseList(process.env.TELEGRAM_ALLOWED_DMS),       // user IDs, or '*' for all
        allowedGroups: parseList(process.env.TELEGRAM_ALLOWED_GROUPS),
        respondToMentionsOnly: true
    },


    // Agent configuration
    agent: {
        workspace: '~/m-y-ai',        // Agent workspace directory
        maxTurns: 100,                // Max tool-use turns per message
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        provider: 'claude',          // 'claude' or 'opencode'
        opencode: {
            model: 'opencode/gpt-5-nano',
            hostname: '127.0.0.1',
            port: 2727
        }
    }
}
