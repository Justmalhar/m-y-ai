import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk';
import { BaseProvider } from './base-provider.js';

/**
 * Opencode SDK provider implementation
 * Adapts Opencode SDK to match the same interface as Claude provider
 */
export class OpencodeProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.client = null;
    this.serverInstance = null;
    this.defaultModel = config.model;
    this.hostname = config.hostname || '127.0.0.1';
    this.port = config.port || 4227;
    this.useExistingServer = config.useExistingServer || false;
    this.existingServerUrl = config.existingServerUrl || null;
    this.abortControllers = new Map();
    this.mcpRegistered = false;
  }

  get name() {
    return 'opencode';
  }

  getAvailableModels() {
    return [
      { id: 'opencode/big-pickle', label: 'Big Pickle (reasoning)' },
      { id: 'opencode/gpt-5-nano', label: 'GPT-5 Nano' },
      { id: 'opencode/glm-4.7-free', label: 'GLM-4.7' },
      { id: 'opencode/grok-code', label: 'Grok Code Fast' },
      { id: 'opencode/minimax-m2.1-free', label: 'MiniMax M2.1' },
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

  async initialize() {
    if (this.client) return;

    const baseUrl = this.existingServerUrl || `http://${this.hostname}:${this.port}`;

    // Auto-detect: try connecting to existing server first
    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) });
      if (res.ok || res.status < 500) {
        this.client = createOpencodeClient({ baseUrl });
        return;
      }
    } catch (_) {
      // Not running, fall through to start one
    }

    // No existing server — start our own
    try {
      const { client, server } = await createOpencode({
        hostname: this.hostname,
        port: this.port
      });
      this.client = client;
      this.serverInstance = server;
    } catch (error) {
      console.error('[Opencode] Initialization error:', error.message);
      throw error;
    }
  }

  /**
   * Register MCP servers dynamically via the opencode SDK API
   */
  async registerMcpServers(mcpServers) {
    if (this.mcpRegistered || !mcpServers) return;
    if (!this.client) await this.initialize();

    for (const [name, cfg] of Object.entries(mcpServers)) {
      if (cfg.type === 'http' || cfg.type === 'remote') {
        try {
          await this.client.mcp.add({
            body: {
              name,
              config: {
                type: 'remote',
                url: cfg.url,
                headers: cfg.headers || {}
              }
            }
          });
          await this.client.mcp.connect({
            path: { name }
          });
        } catch (err) {
          console.error(`[Opencode] Failed to register MCP "${name}":`, err.message);
        }
      }
    }
    this.mcpRegistered = true;
  }

  async *query(params) {
    const {
      prompt,
      chatId,
      mcpServers = {},
      model = null,
      systemPrompt = null
    } = params;

    const modelToUse = model || this.currentModel || this.defaultModel || 'opencode/big-pickle';

    await this.initialize();

    // Register MCP servers (Composio etc.) via SDK API on first query
    if (!this.mcpRegistered && Object.keys(mcpServers).length > 0) {
      await this.registerMcpServers(mcpServers);
    }

    let sessionId = chatId ? this.getSession(chatId) : null;

    const abortController = new AbortController();
    if (chatId) {
      this.abortControllers.set(chatId, abortController);
    }

    try {
      // Create session if needed
      if (!sessionId) {
        const sessionConfig = { model: modelToUse };
        if (systemPrompt) {
          sessionConfig.systemPrompt = systemPrompt;
        }
        const sessionResult = await this.client.session.create({
          body: { config: sessionConfig }
        });
        sessionId = sessionResult.data?.id || sessionResult.id;
        if (chatId && sessionId) {
          this.setSession(chatId, sessionId);
        }
      }

      // Parse model string into providerID and modelID
      const [providerID, ...modelParts] = modelToUse.split('/');
      const modelID = modelParts.join('/');

      // Subscribe to events for streaming
      const events = await this.client.event.subscribe();

      // Extract plain text from prompt (which may be an async generator)
      let promptText = '';
      if (typeof prompt === 'string') {
        promptText = prompt;
      } else if (typeof prompt === 'object' && prompt !== null) {
        try {
          for await (const msg of prompt) {
            if (msg?.message?.content) {
              const content = msg.message.content;
              if (typeof content === 'string') {
                promptText = content;
              } else if (Array.isArray(content)) {
                for (const part of content) {
                  if (part.type === 'text') {
                    promptText += part.text;
                  }
                }
              }
            }
          }
        } catch (e) {
          promptText = String(prompt);
        }
      }

      // Build message parts - include system prompt on first message if session didn't accept it
      const parts = [];
      if (systemPrompt && !this.getSession(chatId + ':sysSent')) {
        parts.push({ type: 'text', text: `[System Instructions]\n${systemPrompt}\n\n[User Message]\n${promptText}` });
        if (chatId) this.setSession(chatId + ':sysSent', 'true');
      } else {
        parts.push({ type: 'text', text: promptText });
      }

      // Send prompt
      await this.client.session.promptAsync({
        path: { id: sessionId },
        body: {
          model: { providerID, modelID },
          parts
        }
      });

      // Track streaming state
      let userMessageId = null;
      const lastYieldedLength = new Map();
      const yieldedToolCalls = new Set();

      for await (const event of events.stream) {
        if (abortController.signal.aborted) break;

        const props = event.properties || {};
        const part = props.part || props;
        const eventSessionId = props.sessionID || part?.sessionID || props.session?.id;

        if (eventSessionId && eventSessionId !== sessionId) continue;

        if (event.type === 'message.part.updated') {
          const messageId = part?.messageID;
          const partId = part?.id;

          // Skip user's message
          if (!userMessageId && part?.type === 'text') {
            userMessageId = messageId;
            continue;
          }
          if (messageId === userMessageId) continue;

          // Streaming text
          if (part?.type === 'text' && part?.text) {
            const prevLength = lastYieldedLength.get(partId) || 0;
            const fullText = part.text;
            if (fullText.length > prevLength) {
              const delta = fullText.slice(prevLength);
              yield {
                type: 'stream_event',
                event: {
                  type: 'content_block_delta',
                  delta: { type: 'text_delta', text: delta }
                }
              };
              lastYieldedLength.set(partId, fullText.length);
            }
          } else if (part?.type === 'reasoning') {
            const reasonText = part.reasoning || part.text || '';
            const prevLength = lastYieldedLength.get(partId) || 0;
            if (reasonText.length > prevLength) {
              const delta = reasonText.slice(prevLength);
              yield {
                type: 'stream_event',
                event: {
                  type: 'content_block_delta',
                  delta: { type: 'text_delta', text: delta },
                  isReasoning: true
                }
              };
              lastYieldedLength.set(partId, reasonText.length);
            }
          } else if (part?.type === 'tool-invocation' || part?.type === 'tool_invocation' || part?.type === 'tool') {
            const toolId = part.toolInvocationId || part.callID || part.id || part.tool_invocation_id;
            if (yieldedToolCalls.has(toolId)) continue;
            if (part.state?.status === 'pending') continue;

            const toolName = part.toolName || part.tool || part.name;
            const toolArgs = part.state?.input || part.args || part.input || part.parameters || {};

            yieldedToolCalls.add(toolId);

            yield {
              type: 'stream_event',
              event: {
                type: 'content_block_start',
                content_block: {
                  type: 'tool_use',
                  name: toolName,
                  input: toolArgs,
                  id: toolId
                }
              }
            };
          } else if (part?.type === 'tool-result' || part?.type === 'tool_result') {
            const toolId = part.toolInvocationId || part.callID || part.id;
            const resultData = part.result || part.output || part.content;
            yield {
              type: 'tool_result',
              result: resultData,
              tool_use_id: toolId
            };
          }
        } else if (event.type === 'session.idle') {
          break;
        } else if (event.type === 'session.error') {
          yield {
            type: 'error',
            error: props.message || 'Session error'
          };
          break;
        }
      }

      if (abortController.signal.aborted) {
        yield { type: 'aborted' };
      } else {
        yield { type: 'done' };
      }

    } catch (error) {
      console.error('[Opencode] Error:', error.message);
      yield { type: 'error', error: error.message };
    } finally {
      if (chatId) {
        this.abortControllers.delete(chatId);
      }
    }
  }

  async cleanup() {
    await super.cleanup();
    if (this.serverInstance) {
      try {
        await this.serverInstance.close();
      } catch (e) {
        // ignore
      }
    }
    this.client = null;
    this.serverInstance = null;
  }
}
