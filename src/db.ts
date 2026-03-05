import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { mkdirSync } from 'fs'
import { STORE_DIR } from './config.js'
import { logger } from './logger.js'

mkdirSync(STORE_DIR, { recursive: true })

const DB_PATH = process.env['TEST_DB_PATH'] ?? path.join(STORE_DIR, 'myclaw.db')
export const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      chat_id    TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id     TEXT NOT NULL,
      topic_key   TEXT,
      content     TEXT NOT NULL,
      sector      TEXT NOT NULL CHECK(sector IN ('semantic','episodic')),
      salience    REAL NOT NULL DEFAULT 1.0,
      created_at  INTEGER NOT NULL,
      accessed_at INTEGER NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      content,
      content='memories',
      content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
      INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
    END;

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id          TEXT PRIMARY KEY,
      chat_id     TEXT NOT NULL,
      prompt      TEXT NOT NULL,
      schedule    TEXT NOT NULL,
      next_run    INTEGER NOT NULL,
      last_run    INTEGER,
      last_result TEXT,
      status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused')),
      created_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status_next_run
      ON scheduled_tasks(status, next_run);
  `)
  logger.info({ path: DB_PATH }, 'Database initialized')
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function getSession(chatId: string): string | undefined {
  const row = db
    .prepare('SELECT session_id FROM sessions WHERE chat_id = ?')
    .get(chatId) as { session_id: string } | undefined
  return row?.session_id
}

export function setSession(chatId: string, sessionId: string): void {
  db.prepare(`
    INSERT INTO sessions (chat_id, session_id, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      session_id = excluded.session_id,
      updated_at = excluded.updated_at
  `).run(chatId, sessionId, Date.now())
}

export function clearSession(chatId: string): void {
  db.prepare('DELETE FROM sessions WHERE chat_id = ?').run(chatId)
}

// ─── Memories ────────────────────────────────────────────────────────────────

export interface Memory {
  id: number
  chat_id: string
  topic_key: string | null
  content: string
  sector: 'semantic' | 'episodic'
  salience: number
  created_at: number
  accessed_at: number
}

export function insertMemory(
  chatId: string,
  content: string,
  sector: 'semantic' | 'episodic',
  topicKey?: string
): void {
  const now = Date.now()
  db.prepare(`
    INSERT INTO memories (chat_id, topic_key, content, sector, salience, created_at, accessed_at)
    VALUES (?, ?, ?, ?, 1.0, ?, ?)
  `).run(chatId, topicKey ?? null, content, sector, now, now)
}

export function insertHighSalienceMemory(chatId: string, content: string): void {
  const now = Date.now()
  db.prepare(`
    INSERT INTO memories (chat_id, topic_key, content, sector, salience, created_at, accessed_at)
    VALUES (?, NULL, ?, 'semantic', 5.0, ?, ?)
  `).run(chatId, content, now, now)
}

export function searchMemoriesFts(chatId: string, query: string, limit = 3): Memory[] {
  return db
    .prepare(`
      SELECT m.* FROM memories m
      JOIN memories_fts fts ON fts.rowid = m.id
      WHERE memories_fts MATCH ? AND m.chat_id = ?
      ORDER BY rank
      LIMIT ?
    `)
    .all(query, chatId, limit) as unknown as Memory[]
}

export function getRecentMemories(chatId: string, limit = 5): Memory[] {
  return db
    .prepare(`
      SELECT * FROM memories WHERE chat_id = ?
      ORDER BY accessed_at DESC LIMIT ?
    `)
    .all(chatId, limit) as unknown as Memory[]
}

export function touchMemory(id: number): void {
  db.prepare(`
    UPDATE memories
    SET accessed_at = ?, salience = MIN(salience + 0.1, 5.0)
    WHERE id = ?
  `).run(Date.now(), id)
}

export function decayMemories(): void {
  const oneDayAgo = Date.now() - 86_400_000
  db.prepare(`
    UPDATE memories SET salience = salience * 0.98
    WHERE created_at < ?
  `).run(oneDayAgo)
  db.prepare(`DELETE FROM memories WHERE salience < 0.1`).run()
}

export function getMemoryCount(chatId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM memories WHERE chat_id = ?')
    .get(chatId) as { count: number }
  return row.count
}

// ─── Scheduled tasks ─────────────────────────────────────────────────────────

export interface ScheduledTask {
  id: string
  chat_id: string
  prompt: string
  schedule: string
  next_run: number
  last_run: number | null
  last_result: string | null
  status: 'active' | 'paused'
  created_at: number
}

export function createTask(task: Omit<ScheduledTask, 'last_run' | 'last_result'>): void {
  db.prepare(`
    INSERT INTO scheduled_tasks (id, chat_id, prompt, schedule, next_run, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(task.id, task.chat_id, task.prompt, task.schedule, task.next_run, task.status, task.created_at)
}

export function getDueTasks(): ScheduledTask[] {
  return db
    .prepare(`
      SELECT * FROM scheduled_tasks
      WHERE status = 'active' AND next_run <= ?
    `)
    .all(Math.floor(Date.now() / 1000)) as unknown as ScheduledTask[]
}

export function updateTaskAfterRun(id: string, lastResult: string, nextRun: number): void {
  db.prepare(`
    UPDATE scheduled_tasks
    SET last_run = ?, last_result = ?, next_run = ?
    WHERE id = ?
  `).run(Math.floor(Date.now() / 1000), lastResult, nextRun, id)
}

export function listTasks(): ScheduledTask[] {
  return db
    .prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC')
    .all() as unknown as ScheduledTask[]
}

export function getTask(id: string): ScheduledTask | undefined {
  return db
    .prepare('SELECT * FROM scheduled_tasks WHERE id = ?')
    .get(id) as unknown as ScheduledTask | undefined
}

export function deleteTask(id: string): boolean {
  const result = db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id)
  return (result as { changes: number }).changes > 0
}

export function pauseTask(id: string): boolean {
  const result = db
    .prepare("UPDATE scheduled_tasks SET status = 'paused' WHERE id = ?")
    .run(id)
  return (result as { changes: number }).changes > 0
}

export function resumeTask(id: string): boolean {
  const result = db
    .prepare("UPDATE scheduled_tasks SET status = 'active' WHERE id = ?")
    .run(id)
  return (result as { changes: number }).changes > 0
}
