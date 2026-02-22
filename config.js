const parseList = (env) => env ? env.split(',').map(s => s.trim()).filter(Boolean) : []
const parseBool = (env, fallback = true) => env === undefined ? fallback : env !== 'false' && env !== '0'

export default {
    agentId: 'm-y-ai',

    web: {
        enabled: parseBool(process.env.WEB_ENABLED, true),
        allowedDMs: parseList(process.env.WEB_ALLOWED_DMS),       // client IDs, or '*' for all
        allowedGroups: parseList(process.env.WEB_ALLOWED_GROUPS),
        respondToMentionsOnly: true
    },

    app: {
        enabled: parseBool(process.env.APP_ENABLED, true),
        allowedDMs: parseList(process.env.APP_ALLOWED_DMS),       // client IDs, or '*' for all
        allowedGroups: parseList(process.env.APP_ALLOWED_GROUPS),
        respondToMentionsOnly: true
    },

    desktop: {
        enabled: parseBool(process.env.DESKTOP_ENABLED, false),
        allowedDMs: parseList(process.env.DESKTOP_ALLOWED_DMS),   // client IDs, or '*' for all
        allowedGroups: parseList(process.env.DESKTOP_ALLOWED_GROUPS),
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
