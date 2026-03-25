import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'
import type { AgentEvent } from './models.js'

/**
 * 프로젝트 경로로 Claude Code 세션 디렉토리를 찾습니다.
 */
export function findClaudeProjectDir(projectAbsPath: string): string | null {
  const claudeBase = path.join(os.homedir(), '.claude', 'projects')
  if (!fs.existsSync(claudeBase)) return null

  try {
    const hashDirs = fs.readdirSync(claudeBase)
    for (const hashDir of hashDirs) {
      const indexPath = path.join(claudeBase, hashDir, 'sessions-index.json')
      if (!fs.existsSync(indexPath)) continue
      
      try {
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
        const entries = Array.isArray(index) ? index : Object.values(index)
        const match = entries.some((e: any) =>
          e?.cwd === projectAbsPath || e?.projectPath === projectAbsPath
        )
        if (match) return path.join(claudeBase, hashDir)
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  
  return null
}

/**
 * Claude Code JSONL 파일을 파싱하여 AgentEvent 목록을 반환합니다.
 */
export async function parseClaudeSessionJsonl(filePath: string): Promise<AgentEvent[]> {
  const events: AgentEvent[] = []
  const toolUseMap = new Map<string, any>()

  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let idCounter = 0
  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      const rawEvent = JSON.parse(line)
      const timestamp = rawEvent.timestamp || new Date().toISOString()
      
      if (rawEvent.type === 'tool_use') {
        toolUseMap.set(rawEvent.id, rawEvent)
        events.push({
          id: ++idCounter,
          event_type: 'tool_use',
          tool_name: rawEvent.name,
          event_timestamp: timestamp,
          source: 'jsonl',
          created_at: new Date().toISOString()
        })
      } else if (rawEvent.type === 'tool_result') {
        const use = toolUseMap.get(rawEvent.tool_use_id)
        if (use) {
          const duration = new Date(timestamp).getTime() - new Date(use.timestamp).getTime()
          const idx = events.findIndex(e => e.tool_name === use.name && e.event_timestamp === use.timestamp)
          if (idx >= 0) {
            events[idx].duration_ms = duration
          }
        }
        events.push({
          id: ++idCounter,
          event_type: 'tool_result',
          tool_name: use?.name,
          event_timestamp: timestamp,
          source: 'jsonl',
          created_at: new Date().toISOString()
        })
      } else if (rawEvent.type === 'thinking') {
        events.push({
          id: ++idCounter,
          event_type: 'thinking',
          thinking_tokens: rawEvent.thinking_tokens,
          event_timestamp: timestamp,
          source: 'jsonl',
          created_at: new Date().toISOString()
        })
      }
    } catch { /* skip */ }
  }

  return events
}

/**
 * Gemini CLI 세션 디렉토리를 찾습니다.
 */
export function findGeminiProjectDir(projectAbsPath: string): string | null {
  // Gemini CLI uses a hash of the project path for the directory name
  // For simplicity, we search in ~/.gemini/tmp/
  const geminiBase = path.join(os.homedir(), '.gemini', 'tmp')
  if (!fs.existsSync(geminiBase)) return null

  try {
    const projectDirs = fs.readdirSync(geminiBase)
    // Here we might need a more robust way to match the project path to the hash
    // For now, we'll look for a directory that contains a 'chats' folder
    for (const dir of projectDirs) {
      const chatDir = path.join(geminiBase, dir, 'chats')
      if (fs.existsSync(chatDir)) {
        // In a real scenario, we'd check if this hash belongs to projectAbsPath
        // For this implementation, we assume the user is in the correct project context
        // or we'd need to know how the hash is generated.
        return chatDir
      }
    }
  } catch { /* skip */ }

  return null
}

/**
 * Gemini CLI 세션 JSON 파일을 파싱합니다.
 */
export function parseGeminiSession(filePath: string): AgentEvent[] {
  try {
    const session = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const events: AgentEvent[] = []
    let idCounter = 0

    for (const msg of session.messages ?? []) {
      if (msg.role !== 'model') continue

      const tokens = msg.usageMetadata ?? {}
      const timestamp = msg.timestamp || new Date().toISOString()

      for (const part of msg.parts ?? []) {
        if (part.functionCall) {
          events.push({
            id: ++idCounter,
            event_type: 'tool_use',
            tool_name: part.functionCall.name,
            input_tokens: tokens.promptTokenCount,
            output_tokens: tokens.candidatesTokenCount,
            event_timestamp: timestamp,
            source: 'jsonl', // reusing jsonl source type for file-based
            created_at: new Date().toISOString()
          })
        }
      }
    }
    return events
  } catch {
    return []
  }
}

/**
 * 실시간 파일 감시 (Polling 방식)
 */
export function watchLogFile(filePath: string, onEvent: (event: any) => void, intervalMs = 2000) {
  let fileOffset = 0
  if (fs.existsSync(filePath)) {
    fileOffset = fs.statSync(filePath).size
  }

  return setInterval(() => {
    try {
      if (!fs.existsSync(filePath)) return
      const stat = fs.statSync(filePath)
      if (stat.size <= fileOffset) return

      const buf = Buffer.alloc(stat.size - fileOffset)
      const fd = fs.openSync(filePath, 'r')
      fs.readSync(fd, buf, 0, buf.length, fileOffset)
      fs.closeSync(fd)
      fileOffset = stat.size

      buf.toString('utf8').split('\n').forEach(line => {
        if (!line.trim()) return
        try {
          onEvent(JSON.parse(line))
        } catch { /* skip */ }
      })
    } catch { /* skip */ }
  }, intervalMs)
}
