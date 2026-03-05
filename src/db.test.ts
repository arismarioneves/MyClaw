import { describe, it, expect, beforeAll } from 'vitest'
import { tmpdir } from 'os'
import path from 'path'

// Set TEST_DB_PATH before the module is imported so db.ts uses a temp file
const TEST_DB = path.join(tmpdir(), `myclaw-test-${process.pid}.db`)
process.env['TEST_DB_PATH'] = TEST_DB

// Dynamic import so the env var is read at module init time
const dbModule = await import('./db.js')
const { initDatabase, getSession, setSession, clearSession, insertMemory, getRecentMemories } = dbModule

beforeAll(() => {
  initDatabase()
})

describe('sessions', () => {
  it('returns undefined for unknown chat', () => {
    expect(getSession('unknown-chat')).toBeUndefined()
  })

  it('sets and retrieves a session', () => {
    setSession('chat-s1', 'sess-abc')
    expect(getSession('chat-s1')).toBe('sess-abc')
  })

  it('overwrites existing session', () => {
    setSession('chat-s2', 'sess-abc')
    setSession('chat-s2', 'sess-xyz')
    expect(getSession('chat-s2')).toBe('sess-xyz')
  })

  it('clears a session', () => {
    setSession('chat-s3', 'sess-del')
    clearSession('chat-s3')
    expect(getSession('chat-s3')).toBeUndefined()
  })
})

describe('memories', () => {
  it('inserts and retrieves a memory', () => {
    insertMemory('chat-m1', 'I prefer dark mode', 'semantic')
    const mems = getRecentMemories('chat-m1', 5)
    expect(mems.length).toBe(1)
    expect(mems[0]?.content).toBe('I prefer dark mode')
    expect(mems[0]?.sector).toBe('semantic')
  })

  it('returns memories newest first', () => {
    insertMemory('chat-m2', 'first', 'episodic')
    insertMemory('chat-m2', 'second', 'episodic')
    const mems = getRecentMemories('chat-m2', 5)
    expect(mems[0]?.content).toBe('second')
  })

  it('respects limit', () => {
    for (let i = 0; i < 10; i++) insertMemory('chat-m3', `mem-${i}`, 'episodic')
    expect(getRecentMemories('chat-m3', 3).length).toBe(3)
  })

  it('isolates memories by chat_id', () => {
    insertMemory('chat-iso-1', 'for iso-1', 'semantic')
    insertMemory('chat-iso-2', 'for iso-2', 'episodic')
    expect(getRecentMemories('chat-iso-1', 10).length).toBe(1)
    expect(getRecentMemories('chat-iso-2', 10).length).toBe(1)
  })
})
