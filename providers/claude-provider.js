import { query } from '@anthropic-ai/claude-agent-sdk';
import { BaseProvider } from './base-provider.js';

/**
 * Claude Agent SDK provider implementation
 */
export class ClaudeProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.defaultAllowedTools = config.allowedTools || [
      'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
      'TodoWrite', 'Skill'
    ];
    this.defaultMaxTurns = config.maxTurns || 50;
    this.permissionMode = config.permissionMode || 'default';
    this.abortControllers = new Map();
  }

  get name() {
    return 'claude';
  }

  getAvailableModels() {
    return [
      { id: 'claude-opus-4-6', label: 'Opus 4.6' },
      { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.6' },
    ];
  }

  abort(chatId) {
    const controller = this.abortControllers.get(chatId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(chatId);
      return true;
    }
    return false;
  }

  /**
   * Execute a query using Claude Agent SDK
   *
   * @param {Object} params
   * @param {string|AsyncGenerator} params.prompt - The user message or message generator
   * @param {string} params.chatId - Chat session identifier
   * @param {Object} params.mcpServers - MCP server configurations
   * @param {string[]} [params.allowedTools] - List of allowed tool names
   * @param {number} [params.maxTurns] - Maximum conversation turns
   * @param {string} [params.systemPrompt] - System prompt
   * @param {string} [params.permissionMode] - Permission mode override
   * @param {Function} [params.canUseTool] - Permission callback for tool approval
   * @yields {Object} Normalized response chunks
   */
  async *query(params) {
    const {
      prompt,
      chatId,
      mcpServers = {},
      allowedTools = this.defaultAllowedTools,
      maxTurns = this.defaultMaxTurns,
      systemPrompt = null,
      permissionMode = this.permissionMode,
      canUseTool
    } = params;

    const queryOptions = {
      allowedTools,
      maxTurns,
      mcpServers,
      permissionMode,
      includePartialMessages: true
    };

    if (canUseTool) {
      queryOptions.canUseTool = canUseTool;
    }

    if (this.currentModel) {
      queryOptions.model = this.currentModel;
    }

    if (systemPrompt) {
      queryOptions.systemPrompt = systemPrompt;
    }

    // Check for existing session
    const existingSessionId = chatId ? this.getSession(chatId) : null;

    if (existingSessionId) {
      queryOptions.resume = existingSessionId;
    }

    const abortController = new AbortController();
    if (chatId) {
      this.abortControllers.set(chatId, abortController);
    }

    try {
      for await (const chunk of query({
        prompt,
        options: queryOptions,
        abortSignal: abortController.signal
      })) {
        // Capture session ID from system init message
        if (chunk.type === 'system' && chunk.subtype === 'init') {
          const newSessionId = chunk.session_id || chunk.data?.session_id;
          if (newSessionId && chatId) {
            this.setSession(chatId, newSessionId);
          }
          continue;
        }

        // Pass through all non-system chunks as-is (agent handles normalization)
        if (chunk.type !== 'system') {
          yield chunk;
        }
      }

      yield { type: 'done' };

    } catch (error) {
      if (error.name === 'AbortError') {
        yield { type: 'aborted' };
      } else {
        throw error;
      }
    } finally {
      if (chatId) {
        this.abortControllers.delete(chatId);
      }
    }
  }
}
