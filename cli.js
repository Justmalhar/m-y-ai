#!/usr/bin/env node

import 'dotenv/config'
import { createInterface } from 'readline'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(__dirname, 'config.js')

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
})

const prompt = (q) => new Promise(resolve => rl.question(q, resolve))

const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
}

function print(msg, color = '') {
    console.log(color + msg + colors.reset)
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function animateLines(text, delayMs = 40) {
    const lines = text.split('\n')
    for (const line of lines) {
        console.log(line)
        await sleep(delayMs)
    }
}

async function printHeader() {
    console.log('')
    try {
        let logo1 = execSync('npx oh-my-logo "SECURE" --filled --color --palette-colors "#FF0000,#FF0000"', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        })
        logo1 = logo1.replace(/\x1b\[0m\x1b\[\?25h\x1b\[K[\s\n]*/g, '\n').trimEnd()
        let logo2 = execSync('npx oh-my-logo "M-Y-AI" --filled --color --palette-colors "#FF0000,#FF0000"', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        })
        logo2 = logo2.replace(/\x1b\[0m\x1b\[\?25h\x1b\[K[\s\n]*/g, '\n').trimEnd()
        await animateLines(logo1, 60)
        await animateLines(logo2, 60)
    } catch (err) {
        print('  M-Y-AI CLI', colors.red + colors.bold)
    }
    await sleep(60)
    console.log('')
}

async function getConfiguredProvider() {
    try {
        // Read directly from file to get current value (import() caches modules)
        const content = readFileSync(CONFIG_PATH, 'utf-8')
        const match = content.match(/provider:\s*'([^']*)'/)
        return match ? match[1] : 'claude'
    } catch {
        return 'claude'
    }
}

async function mainMenu() {
    await printHeader()

    const defaultProvider = await getConfiguredProvider()
    print(`  Provider: ${defaultProvider}`, colors.dim)
    console.log('')

    const menuLines = [
        [colors.bold, 'What would you like to do?\n'],
        [colors.red, '  1) Terminal chat'],
        [colors.green, '  2) Start gateway'],
        [colors.blue, '  3) Setup adapters'],
        [colors.yellow, '  4) Show current config'],
        [colors.cyan, '  5) Test connection'],
        [colors.green, '  6) Change provider'],
        [colors.dim, '  7) Exit\n'],
    ]
    for (const [color, text] of menuLines) {
        print(text, color)
        await sleep(60)
    }

    const choice = await prompt('Enter choice (1-7): ')

    switch (choice.trim()) {
        case '1':
            await terminalChat()
            break
        case '2':
            await startGateway()
            break
        case '3':
            await setupWizard()
            break
        case '4':
            showConfig()
            await mainMenu()
            break
        case '5':
            await testConnection()
            break
        case '6':
            await changeProvider()
            break
        case '7':
            print('\nGoodbye!\n', colors.red)
            rl.close()
            process.exit(0)
        default:
            print('\nInvalid choice, try again.\n', colors.red)
            await mainMenu()
    }
}

async function changeProvider() {
    const currentProvider = await getConfiguredProvider()
    print('\n🔄 Change Provider\n', colors.green + colors.bold)
    print(`  Current: ${currentProvider}\n`, colors.dim)

    const providerLines = [
        [colors.red, '  1) Claude Agent SDK'],
        [colors.green, '  2) Opencode'],
        [colors.dim, ''],
    ]
    for (const [color, text] of providerLines) {
        print(text, color)
        await sleep(40)
    }

    const choice = await prompt('Enter choice (1-2): ')
    let newProvider
    switch (choice.trim()) {
        case '1':
            newProvider = 'claude'
            break
        case '2':
            newProvider = 'opencode'
            break
        default:
            print('\nNo change.\n', colors.dim)
            await mainMenu()
            return
    }

    if (newProvider === currentProvider) {
        print(`\nAlready using ${newProvider}.\n`, colors.dim)
    } else {
        // Update config file
        try {
            let content = readFileSync(CONFIG_PATH, 'utf-8')
            content = content.replace(
                /provider:\s*'[^']*'/,
                `provider: '${newProvider}'`
            )
            writeFileSync(CONFIG_PATH, content)
            print(`\n✅ Provider changed to: ${newProvider}\n`, colors.green)
        } catch (err) {
            print('\nFailed to update config: ' + err.message, colors.red)
        }
    }

    await mainMenu()
}

async function startGateway() {
    print('\n🚀 Starting M-Y-AI Gateway...\n', colors.green)
    rl.close()

    // Dynamic import to start the gateway
    await import('./gateway.js')
}

// ── Spinner for loading states ──────────────────────────────────────
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

function createSpinner(label) {
    let frame = 0
    let interval = null
    let currentLabel = label
    let onOwnLine = false

    return {
        start(text) {
            if (text) currentLabel = text
            frame = 0
            onOwnLine = false
            interval = setInterval(() => {
                const f = spinnerFrames[frame % spinnerFrames.length]
                if (!onOwnLine) {
                    process.stdout.write('\n')
                    onOwnLine = true
                }
                process.stdout.write(`\r\x1b[K  ${colors.red}${f}${colors.reset} ${colors.dim}${currentLabel}${colors.reset}`)
                frame++
            }, 80)
        },
        update(text) {
            currentLabel = text
        },
        stop() {
            if (interval) {
                clearInterval(interval)
                interval = null
                process.stdout.write('\r\x1b[K')
                if (onOwnLine) {
                    process.stdout.write('\x1b[A\x1b[999C') // move up to tool line, cursor to end
                    onOwnLine = false
                }
            }
        }
    }
}

// ── Input bar rendering ─────────────────────────────────────────────
function drawInputBar(inputText, cols) {
    const w = Math.min(cols, 120)
    const top = '  ╭' + '─'.repeat(w - 6) + '╮'
    const bottom = '  ╰' + '─'.repeat(w - 6) + '╯'
    const prefix = '  │ '
    const suffix = ' │'
    const innerW = w - prefix.length - suffix.length - 1

    // Word-wrap input text into lines
    const lines = []
    if (!inputText) {
        lines.push('')
    } else {
        const raw = inputText.split('\n')
        for (const r of raw) {
            if (r.length <= innerW) {
                lines.push(r)
            } else {
                for (let i = 0; i < r.length; i += innerW) {
                    lines.push(r.substring(i, i + innerW))
                }
            }
        }
    }

    process.stdout.write(colors.dim + top + colors.reset + '\n')
    for (const line of lines) {
        const pad = ' '.repeat(Math.max(0, innerW - line.length))
        process.stdout.write(colors.dim + prefix + colors.reset + line + pad + colors.dim + suffix + colors.reset + '\n')
    }
    process.stdout.write(colors.dim + bottom + colors.reset)

    // Move cursor back into the box (last content line, after text)
    const lastLine = lines[lines.length - 1]
    const upCount = 1 // move up past the bottom border
    process.stdout.write(`\x1b[${upCount}A`) // move up
    process.stdout.write(`\r\x1b[${prefix.length + lastLine.length}C`) // move to end of text
}

// ── Status bar ──────────────────────────────────────────────────────
function drawStatusBar(status, cols) {
    const w = Math.min(cols, 120)
    const left = `  ${status}`
    const pad = ' '.repeat(Math.max(0, w - left.length))
    console.log(colors.dim + left + pad + colors.reset)
}

async function terminalChat() {
    print('\nStarting Terminal Chat...\n', colors.red)

    // Use provider from config
    const selectedProvider = await getConfiguredProvider()
    print(`Using provider: ${selectedProvider}\n`, colors.cyan)

    print('Initializing agent with all MCP servers...', colors.dim)

    try {
        // Import required modules
        const { default: ClaudeAgent } = await import('./agent/claude-agent.js')
        const { default: config } = await import('./config.js')

        // Create agent with selected provider
        const agent = new ClaudeAgent({
            allowedTools: config.agent?.allowedTools || ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
            maxTurns: config.agent?.maxTurns || 50,
            provider: selectedProvider,
            opencode: config.agent?.opencode || {}
        })

        // Pre-initialize provider (connect/start server before user types)
        if (agent.provider.initialize) {
            try {
                await agent.provider.initialize()
                print('  ✅ Provider ready', colors.green)
            } catch (err) {
                print('  ⚠️  Provider: ' + err.message, colors.yellow)
            }
        }

        // Handle cron job executions in terminal
        agent.cronScheduler.on('execute', async ({ jobId, message, invokeAgent }) => {
            process.stdout.write('\n\n')
            console.log(colors.yellow + '⏰ [Scheduled] ' + colors.reset + colors.cyan + message + colors.reset)
            console.log(colors.dim + `   (job: ${jobId})${invokeAgent ? ' [invoking agent]' : ''}` + colors.reset)

            try {
                execSync('afplay /System/Library/Sounds/Glass.aiff &', { stdio: 'ignore' })
                const escapedMsg = message.replace(/"/g, '\\"').replace(/'/g, "'\"'\"'")
                execSync(`osascript -e 'display notification "${escapedMsg}" with title "M-Y-AI" sound name "Glass"'`, { stdio: 'ignore' })
            } catch (e) {
                process.stdout.write('\x07')
            }

            if (invokeAgent) {
                try {
                    let cronFirstText = true
                    for await (const chunk of agent.run({
                        message,
                        sessionKey,
                        platform: 'terminal',
                        mcpServers
                    })) {
                        if (chunk.type === 'text' && chunk.content) {
                            let text = chunk.content
                            if (cronFirstText) {
                                text = text.replace(/^[\s\n\r]+/, '')
                                if (!text) continue
                                process.stdout.write(colors.cyan + '\n  M-Y-AI: ' + colors.reset + text)
                                cronFirstText = false
                            } else {
                                process.stdout.write(text)
                            }
                        } else if (chunk.type === 'tool_use') {
                            process.stdout.write(colors.yellow + `\n  🔧 ${chunk.name}` + colors.reset)
                        } else if (chunk.type === 'tool_result') {
                            process.stdout.write(colors.dim + ' ✓' + colors.reset)
                        }
                    }
                    console.log('')
                } catch (err) {
                    console.log(colors.red + '\nError: ' + err.message + colors.reset)
                }
            }
        })

        print('\nChat started! Type "exit" or "quit" to end.\n', colors.red + colors.bold)
        const cols = process.stdout.columns || 80
        drawStatusBar(`[${selectedProvider}] Ready — /model to switch`, cols)
        print('', '')

        const sessionKey = `terminal:${Date.now()}`
        const spinner = createSpinner('Thinking...')

        // ── Pending approval resolver (set during canUseTool) ───────
        let pendingApprovalResolve = null

        /**
         * canUseTool callback for terminal — stops spinner, prints prompt,
         * waits for user input, then returns allow/deny.
         */
        const canUseTool = async (toolName, input, options) => {
            spinner.stop()

            // Handle AskUserQuestion — format as numbered options
            if (toolName === 'AskUserQuestion') {
                const questions = input.questions || []
                console.log('')
                for (const q of questions) {
                    console.log(colors.yellow + '  ? ' + colors.reset + q.question)
                    if (q.options) {
                        q.options.forEach((opt, i) => {
                            const desc = opt.description ? colors.dim + ' — ' + opt.description + colors.reset : ''
                            console.log(`    ${colors.cyan}${i + 1})${colors.reset} ${opt.label}${desc}`)
                        })
                    }
                }
                process.stdout.write('\n' + colors.dim + '  Your choice: ' + colors.reset)

                const reply = await new Promise(resolve => {
                    pendingApprovalResolve = resolve
                })
                pendingApprovalResolve = null

                const firstQuestion = questions[0]
                const num = parseInt(reply.trim())
                if (firstQuestion?.options && num >= 1 && num <= firstQuestion.options.length) {
                    const selected = firstQuestion.options[num - 1]
                    spinner.start('Thinking...')
                    return {
                        behavior: 'allow',
                        updatedInput: {
                            ...input,
                            questions: [{ ...firstQuestion, answer: selected.label }]
                        }
                    }
                }

                spinner.start('Thinking...')
                return {
                    behavior: 'allow',
                    updatedInput: {
                        ...input,
                        questions: [{ ...firstQuestion, answer: reply.trim() }]
                    }
                }
            }

            // Standard tool approval
            console.log('')
            console.log(colors.yellow + '  ⚠ Tool approval needed: ' + colors.reset + colors.bold + toolName + colors.reset)
            if (options.decisionReason) {
                console.log(colors.dim + '    ' + options.decisionReason + colors.reset)
            }
            const inputStr = JSON.stringify(input, null, 2)
            if (inputStr.length < 500) {
                const lines = inputStr.split('\n')
                for (const l of lines) {
                    console.log(colors.dim + '    ' + l + colors.reset)
                }
            }
            process.stdout.write('\n' + colors.dim + '  Allow? (y/n): ' + colors.reset)

            const reply = await new Promise(resolve => {
                pendingApprovalResolve = resolve
            })
            pendingApprovalResolve = null

            const answer = reply.trim().toLowerCase()
            if (answer === 'y' || answer === 'yes') {
                console.log(colors.green + '  ✓ Allowed' + colors.reset)
                spinner.start('Thinking...')
                return { behavior: 'allow', updatedInput: input }
            }

            console.log(colors.red + '  ✗ Denied' + colors.reset)
            spinner.start('Thinking...')
            return { behavior: 'deny', message: reply.trim() || 'User denied the action.' }
        }

        // ── Raw input mode ──────────────────────────────────────────
        rl.close() // Close readline, we'll handle input directly

        let inputBuffer = ''
        const stdin = process.stdin
        stdin.setRawMode(true)
        stdin.resume()
        stdin.setEncoding('utf8')

        let isRunning = false
        let wasInterrupted = false
        let pendingModelSelect = null // resolve function for model keypress
        let inputBarLineCount = 0
        let cursorInInputBar = false

        function countInputLines(text, innerW) {
            if (!text) return 1
            const width = Math.max(innerW, 1)
            let lines = 0
            const raw = text.split('\n')
            for (const r of raw) {
                lines += Math.max(1, Math.ceil(r.length / width))
            }
            return lines
        }

        function clearInputBar() {
            if (!cursorInInputBar || inputBarLineCount <= 0) return
            const up = Math.max(0, inputBarLineCount - 2) // from last content line to top border
            if (up > 0) process.stdout.write(`\x1b[${up}A`)
            for (let i = 0; i < inputBarLineCount; i++) {
                process.stdout.write('\x1b[2K')
                if (i < inputBarLineCount - 1) process.stdout.write('\x1b[B')
            }
            if (inputBarLineCount > 1) {
                process.stdout.write(`\x1b[${inputBarLineCount - 1}A`)
            }
            process.stdout.write('\r')
            cursorInInputBar = false
        }

        function redrawInput() {
            const c = process.stdout.columns || 80
            // Erase old box lines (only safe when cursor is still inside the box)
            if (cursorInInputBar && inputBarLineCount > 0) {
                clearInputBar()
            }
            drawInputBar(inputBuffer || '', c)
            // Count lines the box occupies (top + content lines + bottom)
            const innerW = Math.min(c, 120) - 7
            const contentLines = countInputLines(inputBuffer, innerW)
            inputBarLineCount = 2 + contentLines // top + content + bottom
            cursorInInputBar = true
        }

        // Initial draw
        const c0 = process.stdout.columns || 80
        drawInputBar('', c0)
        inputBarLineCount = 3
        cursorInInputBar = true

        async function handleSubmit(text) {
            if (!text.trim()) {
                redrawInput()
                return
            }

            if (['exit', 'quit', '/exit', '/quit'].includes(text.trim().toLowerCase())) {
                stdin.setRawMode(false)
                stdin.pause()
                print('\n\nGoodbye!\n', colors.red)
                agent.stopCron()
                process.exit(0)
            }

            // /model command
            if (text.trim().toLowerCase() === '/model') {
                cursorInInputBar = false
                inputBuffer = ''
                console.log('\n')
                const models = agent.provider.getAvailableModels()
                const current = agent.provider.getModel()
                print(`  Current model: ${current || '(default)'}`, colors.dim)
                print(`  Provider: ${agent.providerName}\n`, colors.dim)
                for (let i = 0; i < models.length; i++) {
                    const marker = models[i].id === current ? ' ←' : ''
                    print(`  ${i + 1}) ${models[i].label} (${models[i].id})${marker}`, colors.cyan)
                }
                process.stdout.write('\n' + colors.dim + '  Select model (1-' + models.length + '): ' + colors.reset)

                // Wait for a single keypress in raw mode
                const modelChoice = await new Promise(resolve => {
                    pendingModelSelect = resolve
                })
                pendingModelSelect = null

                const idx = parseInt(modelChoice) - 1
                if (idx >= 0 && idx < models.length) {
                    agent.provider.setModel(models[idx].id)
                    print(`\n\n  Model set to: ${models[idx].label}\n`, colors.green)
                } else {
                    print('\n\n  No change.\n', colors.dim)
                }

                const c = process.stdout.columns || 80
                drawStatusBar(`[${selectedProvider}] [${agent.provider.getModel() || 'default'}] Ready`, c)
                inputBarLineCount = 0
                redrawInput()
                return
            }

            cursorInInputBar = false
            isRunning = true
            wasInterrupted = false
            inputBuffer = ''

            // Print user message
            console.log('\n')
            console.log(colors.bold + '  You: ' + colors.reset + text)
            console.log('')

            // Start spinner
            spinner.start('Thinking...')

            try {
                let isFirstText = true
                let isFirstThinking = true
                let lastWasToolUse = false
                let curCol = 0

                for await (const chunk of agent.run({
                    message: text,
                    sessionKey,
                    platform: 'terminal',
                    mcpServers,
                    canUseTool
                })) {
                    if (chunk.type === 'tool_use') {
                        spinner.stop()
                        // Ensure fresh line before tool block
                        console.log('')
                        console.log(colors.dim + '  ┌─ ' + colors.yellow + chunk.name + colors.reset)
                        // Show args
                        if (chunk.input && Object.keys(chunk.input).length > 0) {
                            const args = JSON.stringify(chunk.input, null, 2)
                                .split('\n')
                                .map(l => colors.dim + '  │  ' + colors.reset + l)
                                .join('\n')
                            console.log(args)
                        }
                        spinner.start(`${chunk.name} (tool output)`)
                        lastWasToolUse = true
                        isFirstText = true
                        curCol = 0
                    } else if (chunk.type === 'tool_result' && lastWasToolUse) {
                        spinner.stop()
                        // Show result (truncated)
                        const result = typeof chunk.result === 'string' ? chunk.result : JSON.stringify(chunk.result, null, 2)
                        if (result) {
                            const lines = result.split('\n')
                            const maxLines = 4
                            const show = lines.length > maxLines ? lines.slice(0, maxLines) : lines
                            for (const l of show) {
                                console.log(colors.dim + '  │  ' + l.slice(0, 120) + colors.reset)
                            }
                            if (lines.length > maxLines) {
                                console.log(colors.dim + `  │  ... (${lines.length - maxLines} more lines)` + colors.reset)
                            }
                        }
                        console.log(colors.dim + '  └─ ' + colors.green + 'done' + colors.reset)
                        lastWasToolUse = false
                        spinner.start('Thinking...')
                    } else if (chunk.type === 'text' && chunk.content) {
                        spinner.stop()
                        const padStr = '  '
                        const padLen = 2
                        const termWidth = process.stdout.columns || 80
                        const maxCol = termWidth - 1

                        // Reasoning tokens (thinking) — show in red
                        if (chunk.isReasoning) {
                            if (isFirstThinking) {
                                console.log('')
                                console.log(colors.red + '  Thinking:' + colors.reset)
                                process.stdout.write(padStr)
                                curCol = padLen
                                isFirstThinking = false
                            }
                            for (const ch of chunk.content) {
                                if (ch === '\n') {
                                    process.stdout.write('\n' + padStr)
                                    curCol = padLen
                                } else {
                                    if (curCol >= maxCol) {
                                        process.stdout.write('\n' + padStr)
                                        curCol = padLen
                                    }
                                    process.stdout.write(colors.red + ch + colors.reset)
                                    curCol++
                                }
                            }
                            continue
                        }

                        let text = chunk.content
                        if (isFirstText) {
                            text = text.replace(/^[\s\n\r]+/, '')
                            if (!text) continue
                            console.log('')
                            console.log(colors.cyan + '  M-Y-AI:' + colors.reset)
                            process.stdout.write(padStr)
                            curCol = padLen
                            isFirstText = false
                            lastWasToolUse = false
                        }

                        // Write text char by char, wrapping at terminal width
                        for (const ch of text) {
                            if (ch === '\n') {
                                process.stdout.write('\n' + padStr)
                                curCol = padLen
                            } else {
                                if (curCol >= maxCol) {
                                    process.stdout.write('\n' + padStr)
                                    curCol = padLen
                                }
                                process.stdout.write(ch)
                                curCol++
                            }
                        }
                    }
                }

                spinner.stop()
                if (!wasInterrupted) console.log('\n')
            } catch (err) {
                spinner.stop()
                if (!wasInterrupted) {
                    print('\n  Error: ' + err.message, colors.red)
                    console.log('')
                }
            }

            // Skip redraw if Ctrl+C already handled it
            if (wasInterrupted) {
                isRunning = false
                return
            }

            isRunning = false

            // Redraw status + input bar
            const c = process.stdout.columns || 80
            const modelLabel = agent.provider.getModel() ? ` [${agent.provider.getModel()}]` : ''
            cursorInInputBar = false
            inputBuffer = ''
            drawStatusBar(`[${selectedProvider}]${modelLabel} Ready — /model to switch`, c)
            redrawInput()
        }

        // Handle raw keystrokes
        let ctrlCCount = 0
        let ctrlCTimer = null
        let approvalInputBuffer = ''

        stdin.on('data', (key) => {
            // Ctrl+C
            if (key === '\x03') {
                // Cancel pending approval
                if (pendingApprovalResolve) {
                    approvalInputBuffer = ''
                    pendingApprovalResolve('')
                    return
                }
                // Cancel model selection
                if (pendingModelSelect) {
                    pendingModelSelect('')
                    return
                }
                if (isRunning) {
                    // Abort the running agent
                    spinner.stop()
                    wasInterrupted = true
                    agent.abort(sessionKey)
                    process.stdout.write('\n' + colors.red + '  Interrupted.' + colors.reset + '\n\n')
                    isRunning = false
                    const c = process.stdout.columns || 80
                    const modelLabel = agent.provider.getModel() ? ` [${agent.provider.getModel()}]` : ''
                    cursorInInputBar = false
                    inputBuffer = ''
                    drawStatusBar(`[${selectedProvider}]${modelLabel} Ready — /model to switch`, c)
                    redrawInput()
                    ctrlCCount = 0
                    return
                }
                // Not running: double Ctrl+C to exit
                ctrlCCount++
                if (ctrlCCount >= 2) {
                    stdin.setRawMode(false)
                    stdin.pause()
                    print('\n\nGoodbye!\n', colors.red)
                    agent.stopCron()
                    process.exit(0)
                }
                clearInputBar()
                process.stdout.write('\n' + colors.dim + '  Press Ctrl+C again to exit' + colors.reset + '\n')
                redrawInput()
                clearTimeout(ctrlCTimer)
                ctrlCTimer = setTimeout(() => { ctrlCCount = 0 }, 1500)
                return
            }

            ctrlCCount = 0

            // Approval input mode — capture text and resolve on Enter
            if (pendingApprovalResolve) {
                if (key === '\r' || key === '\n') {
                    process.stdout.write('\n')
                    const text = approvalInputBuffer
                    approvalInputBuffer = ''
                    pendingApprovalResolve(text)
                } else if (key === '\x7f' || key === '\b') {
                    if (approvalInputBuffer.length > 0) {
                        approvalInputBuffer = approvalInputBuffer.slice(0, -1)
                        process.stdout.write('\b \b')
                    }
                } else if (!key.startsWith('\x1b')) {
                    approvalInputBuffer += key
                    process.stdout.write(key)
                }
                return
            }

            if (isRunning) return // Ignore other input while agent is running

            // Model selection mode — capture single digit keypress
            if (pendingModelSelect) {
                if (key >= '1' && key <= '9') {
                    process.stdout.write(key)
                    pendingModelSelect(key)
                } else if (key === '\x1b' || key === '\r' || key === '\n') {
                    // Escape or Enter without selection — cancel
                    pendingModelSelect('')
                }
                return
            }

            // Enter - submit
            if (key === '\r' || key === '\n') {
                clearInputBar()
                handleSubmit(inputBuffer)
                return
            }

            // Backspace
            if (key === '\x7f' || key === '\b') {
                if (inputBuffer.length > 0) {
                    inputBuffer = inputBuffer.slice(0, -1)
                    redrawInput()
                }
                return
            }

            // Escape sequences (arrow keys, etc.) — ignore
            if (key.startsWith('\x1b')) return

            // Regular character
            inputBuffer += key
            redrawInput()
        })

    } catch (err) {
        print('\nFailed to start chat: ' + err.message, colors.red)
        process.exit(1)
    }
}

function showConfig() {
    print('\n📋 Current Configuration:\n', colors.yellow)

    try {
        // Read and display config
        const configContent = readFileSync(CONFIG_PATH, 'utf-8')

        // Parse out the config object (simple extraction)
        const lines = configContent.split('\n')
        for (const line of lines) {
            if (line.includes('enabled:')) {
                const enabled = line.includes('true')
                const platform = getPlatformFromContext(lines, lines.indexOf(line))
                print(`  ${platform}: ${enabled ? '✅ Enabled' : '❌ Disabled'}`, enabled ? colors.green : colors.dim)
            }
        }
        console.log('')
    } catch (err) {
        print('Could not read config: ' + err.message, colors.red)
    }
}

function getPlatformFromContext(lines, index) {
    for (let i = index; i >= 0; i--) {
        if (lines[i].includes('whatsapp:')) return 'WhatsApp'
        if (lines[i].includes('telegram:')) return 'Telegram'
        if (lines[i].includes('signal:')) return 'Signal'
        if (lines[i].includes('imessage:')) return 'iMessage'
    }
    return 'Unknown'
}

async function setupWizard() {
    print('\n🔧 Adapter Setup Wizard\n', colors.blue)
    print('Which adapter would you like to configure?\n')
    print('  1) WhatsApp (scan QR code)')
    print('  2) Telegram (bot token)')
    print('  3) Signal (signal-cli)')
    print('  4) iMessage (macOS only)')
    print('  5) Back to main menu\n')

    const choice = await prompt('Enter choice (1-5): ')

    switch (choice.trim()) {
        case '1':
            await setupWhatsApp()
            break
        case '2':
            await setupTelegram()
            break
        case '3':
            await setupSignal()
            break
        case '4':
            await setupiMessage()
            break
        case '5':
            await mainMenu()
            return
        default:
            print('\nInvalid choice.\n', colors.red)
    }

    await setupWizard()
}

async function setupWhatsApp() {
    print('\n📱 WhatsApp Setup\n', colors.green)

    // Check if already authenticated
    const waAuthPath = path.join(__dirname, 'auth_whatsapp')
    if (existsSync(waAuthPath)) {
        print('✅ WhatsApp is already authenticated!\n', colors.green)
        const reauth = await prompt('Re-authenticate (scan new QR)? (y/n): ')
        if (reauth.toLowerCase() === 'y') {
            print('\nRemoving old session...', colors.dim)
            const fs = await import('fs')
            fs.rmSync(waAuthPath, { recursive: true, force: true })
        } else {
            await updateConfig('whatsapp', { enabled: true })
            print('\n✅ WhatsApp enabled!\n', colors.green)
            return
        }
    }

    const enable = await prompt('Enable and authenticate WhatsApp now? (y/n): ')

    if (enable.toLowerCase() !== 'y') {
        await updateConfig('whatsapp', { enabled: false })
        print('\n❌ WhatsApp disabled.\n', colors.dim)
        return
    }

    print('\n🔄 Starting WhatsApp authentication...\n', colors.cyan)
    print('A QR code will appear below. Scan it with:', colors.dim)
    print('  WhatsApp > Settings > Linked Devices > Link a Device\n', colors.dim)

    try {
        // Import and start WhatsApp adapter just for auth
        const { default: WhatsAppAdapter } = await import('./adapters/whatsapp.js')
        const adapter = new WhatsAppAdapter({ enabled: true, allowedDMs: ['*'], allowedGroups: [], respondToMentionsOnly: true })

        // Wait for connection
        await new Promise((resolve, reject) => {
            let connected = false
            let timeout = null

            // Monitor the socket for connection
            const checkConnection = setInterval(() => {
                if (adapter.sock?.user?.id) {
                    connected = true
                    clearInterval(checkConnection)
                    clearTimeout(timeout)
                    resolve()
                }
            }, 1000)

            // Start the adapter
            adapter.start().catch(reject)

            // Timeout after 2 minutes
            timeout = setTimeout(() => {
                clearInterval(checkConnection)
                if (!connected) {
                    adapter.stop().catch(() => { })
                    reject(new Error('Authentication timed out. Please try again.'))
                }
            }, 120000)
        })

        print('\n✅ WhatsApp authenticated successfully!\n', colors.green + colors.bold)

        // Stop the adapter (gateway will start fresh)
        await adapter.stop()

        print('Group Message Settings:\n', colors.cyan)
        print('  1) Respond in all groups (when @mentioned)', colors.green)
        print('  2) DMs only (ignore all groups)', colors.dim)
        print('  3) Specific groups only\n')

        const groupChoice = await prompt('Select group setting (1-3): ')

        let allowedGroups = []
        if (groupChoice.trim() === '1') {
            allowedGroups = ['*']
            print('\n✅ Will respond in all groups when @mentioned\n', colors.green)
        } else if (groupChoice.trim() === '3') {
            print('\nEnter group JIDs (comma-separated). Find these by sending a message in the group.\n', colors.dim)
            const groups = await prompt('Group JIDs: ')
            allowedGroups = groups.split(',').map(g => g.trim()).filter(Boolean)
            print(`\n✅ Will respond in ${allowedGroups.length} specific group(s)\n`, colors.green)
        } else {
            print('\n✅ DMs only - groups disabled\n', colors.dim)
        }

        await updateConfigFull('whatsapp', { enabled: true, allowedGroups })

    } catch (err) {
        print('\n❌ WhatsApp authentication failed: ' + err.message, colors.red)
        print('You can try again or authenticate when starting the gateway.\n', colors.dim)
    }
}

async function setupTelegram() {
    print('\n🤖 Telegram Setup\n', colors.blue)
    print('To create a Telegram bot:')
    print('  1. Open Telegram and message @BotFather')
    print('  2. Send /newbot and follow the prompts')
    print('  3. Copy the bot token\n')

    const enable = await prompt('Enable Telegram adapter? (y/n): ')

    if (enable.toLowerCase() === 'y') {
        const token = await prompt('Enter your bot token: ')

        if (token.trim()) {
            await updateConfig('telegram', { enabled: true, token: token.trim() })
            print('\n✅ Telegram configured!\n', colors.green)
        } else {
            print('\n⚠️  No token provided, Telegram not enabled.\n', colors.yellow)
        }
    } else {
        await updateConfig('telegram', { enabled: false })
        print('\n❌ Telegram disabled.\n', colors.dim)
    }
}

async function setupSignal() {
    print('\n🔒 Signal Setup\n', colors.cyan)
    print('Signal requires signal-cli to be installed and configured.')
    print('Install: https://github.com/AsamK/signal-cli')
    print('')
    print('After installing, register your number:')
    print('  signal-cli -u +1234567890 register')
    print('  signal-cli -u +1234567890 verify CODE\n')

    const enable = await prompt('Enable Signal adapter? (y/n): ')

    if (enable.toLowerCase() === 'y') {
        const phone = await prompt('Enter your Signal phone number (e.g., +1234567890): ')
        const cliPath = await prompt('Path to signal-cli (press Enter for default): ')

        if (phone.trim()) {
            await updateConfig('signal', {
                enabled: true,
                phoneNumber: phone.trim(),
                signalCliPath: cliPath.trim() || 'signal-cli'
            })
            print('\n✅ Signal configured!\n', colors.green)
        } else {
            print('\n⚠️  No phone number provided, Signal not enabled.\n', colors.yellow)
        }
    } else {
        await updateConfig('signal', { enabled: false })
        print('\n❌ Signal disabled.\n', colors.dim)
    }
}

async function setupiMessage() {
    print('\n💬 iMessage Setup\n', colors.yellow)
    print('iMessage adapter works on macOS only.')
    print('It requires the "imsg" CLI tool.')
    print('')
    print('Install from: https://github.com/steipete/imsg')
    print('Or: brew install steipete/formulae/imsg\n')

    const enable = await prompt('Enable iMessage adapter? (y/n): ')

    if (enable.toLowerCase() === 'y') {
        await updateConfig('imessage', { enabled: true })
        print('\n✅ iMessage enabled!\n', colors.green)
    } else {
        await updateConfig('imessage', { enabled: false })
        print('\n❌ iMessage disabled.\n', colors.dim)
    }
}

async function updateConfig(platform, updates) {
    try {
        let content = readFileSync(CONFIG_PATH, 'utf-8')

        for (const [key, value] of Object.entries(updates)) {
            const valueStr = typeof value === 'string' ? `'${value}'` : value

            // Find the platform block and update the key
            const platformRegex = new RegExp(`(${platform}:\\s*\\{[^}]*${key}:\\s*)([^,\\n}]+)`, 's')
            if (platformRegex.test(content)) {
                content = content.replace(platformRegex, `$1${valueStr}`)
            }
        }

        writeFileSync(CONFIG_PATH, content)
    } catch (err) {
        print('Failed to update config: ' + err.message, colors.red)
    }
}

async function updateConfigFull(platform, updates) {
    try {
        let content = readFileSync(CONFIG_PATH, 'utf-8')

        for (const [key, value] of Object.entries(updates)) {
            let valueStr
            if (Array.isArray(value)) {
                // Format array properly
                valueStr = JSON.stringify(value).replace(/"/g, "'")
            } else if (typeof value === 'string') {
                valueStr = `'${value}'`
            } else {
                valueStr = value
            }

            // Find the platform block and update the key
            const platformRegex = new RegExp(`(${platform}:\\s*\\{[^}]*${key}:\\s*)(\\[[^\\]]*\\]|[^,\\n}]+)`, 's')
            if (platformRegex.test(content)) {
                content = content.replace(platformRegex, `$1${valueStr}`)
            }
        }

        writeFileSync(CONFIG_PATH, content)
    } catch (err) {
        print('Failed to update config: ' + err.message, colors.red)
    }
}

async function testConnection() {
    print('\n🔍 Testing Connections...\n', colors.cyan)

    // Check WhatsApp auth
    const waAuthPath = path.join(__dirname, 'auth_whatsapp')
    if (existsSync(waAuthPath)) {
        print('  WhatsApp: ✅ Auth folder exists', colors.green)
    } else {
        print('  WhatsApp: ⚠️  Not authenticated yet', colors.yellow)
    }

    // Check Telegram
    try {
        const config = await import('./config.js')
        if (config.default.telegram?.token) {
            print('  Telegram: ✅ Token configured', colors.green)
        } else {
            print('  Telegram: ⚠️  No token configured', colors.yellow)
        }

        if (config.default.signal?.phoneNumber) {
            print('  Signal: ✅ Phone number configured', colors.green)
        } else {
            print('  Signal: ⚠️  No phone number configured', colors.yellow)
        }
    } catch (err) {
        print('  Could not load config: ' + err.message, colors.red)
    }

    console.log('')
    await prompt('Press Enter to continue...')
    await mainMenu()
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
    // Interactive mode
    mainMenu().catch(err => {
        console.error('Error:', err)
        process.exit(1)
    })
} else {
    // Command mode
    const command = args[0]

    switch (command) {
        case 'chat':
            terminalChat().catch(err => {
                console.error('Error:', err)
                process.exit(1)
            })
            break

        case 'start':
            print('\n🚀 Starting M-Y-AI Gateway...\n', colors.green)
            import('./gateway.js')
            break

        case 'setup':
            setupWizard().then(() => {
                rl.close()
                process.exit(0)
            })
            break

        case 'config':
            showConfig()
            rl.close()
            break

        case 'help':
        case '--help':
        case '-h':
            await printHeader()
            print('Usage: m-y-ai [command]\n', colors.bold)
            print('Commands:')
            print('  chat     Terminal chat', colors.red)
            print('  start    Start the gateway')
            print('  setup    Interactive setup wizard')
            print('  config   Show current configuration')
            print('  help     Show this help message')
            print('')
            print('Run without arguments for interactive mode.')
            console.log('')
            rl.close()
            break

        default:
            print(`Unknown command: ${command}`, colors.red)
            print('Run "m-y-ai help" for usage.')
            rl.close()
            process.exit(1)
    }
}
