import {
  insertMemory,
  searchMemories,
  getRecentMemories,
  touchMemory,
  decayMemories as dbDecayMemories,
} from './db.js'
import { logger } from './logger.js'

const SEMANTIC_SIGNALS = /\b(my|i am|i'm|i prefer|remember|always|never)\b/i

export async function buildMemoryContext(chatId: string, userMessage: string): Promise<string> {
  const memories: { id: number; content: string; sector: string }[] = []
  const seenIds = new Set<number>()

  // Keyword search
  const sanitized = userMessage
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()

  if (sanitized.length > 2) {
    try {
      const results = searchMemories(chatId, sanitized, 3)
      for (const m of results) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id)
          memories.push(m)
          touchMemory(m.id)
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Memory search failed')
    }
  }

  // Recent fetch
  const recent = getRecentMemories(chatId, 5)
  for (const m of recent) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id)
      memories.push(m)
      touchMemory(m.id)
    }
  }

  if (memories.length === 0) return ''

  const lines = memories.map((m) => `- ${m.content} (${m.sector})`).join('\n')
  return `[Memory context]\n${lines}`
}

export async function saveConversationTurn(
  chatId: string,
  userMsg: string,
  assistantMsg: string
): Promise<void> {
  if (userMsg.length <= 20 || userMsg.startsWith('/')) return

  const isSemantic = SEMANTIC_SIGNALS.test(userMsg)
  const sector = isSemantic ? 'semantic' : 'episodic'
  const content = `User: ${userMsg.slice(0, 200)}\nAssistant: ${assistantMsg.slice(0, 200)}`
  insertMemory(chatId, content, sector)
}

export function runDecaySweep(): void {
  dbDecayMemories()
  logger.debug('Memory decay sweep completed')
}
