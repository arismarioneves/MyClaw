import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import path from 'path'
import { STORE_DIR, TELEGRAM_BOT_TOKEN, SLACK_BOT_TOKEN, SLACK_APP_TOKEN } from './config.js'
import { initDatabase } from './db.js'
import { runDecaySweep } from './memory.js'
import { cleanupOldUploads, UPLOADS_DIR } from './media.js'
import { createBot } from './bot.js'
import { createSlackApp } from './slack-bot.js'
import { initScheduler, type Sender } from './scheduler.js'
import { formatForSlack, splitMessage } from './format.js'
import { logger } from './logger.js'

const BANNER = [
  '\x1b[31m  ██  ██  \x1b[0m',
  '\x1b[31m  ██  ██  \x1b[0m  \x1b[1;97mLizz\x1b[0m',
  '\x1b[31m  ██  ██  \x1b[0m',
  '\x1b[31m██  ██  ██\x1b[0m',
  '\x1b[31m██████████\x1b[0m',
].join('\n')

const PID_FILE = path.join(STORE_DIR, 'lizz.pid')

function acquireLock(): void {
  mkdirSync(STORE_DIR, { recursive: true })

  if (existsSync(PID_FILE)) {
    const raw = readFileSync(PID_FILE, 'utf-8').trim()
    const oldPid = parseInt(raw, 10)
    if (!isNaN(oldPid) && oldPid !== process.pid) {
      try {
        process.kill(oldPid, 0) // throws if not alive
        process.kill(oldPid, 'SIGTERM')
        logger.info({ oldPid }, 'Killed stale Lizz process')
      } catch {
        // Process not running — stale pid file, safe to overwrite
      }
    }
  }

  writeFileSync(PID_FILE, String(process.pid))
}

function releaseLock(): void {
  try {
    unlinkSync(PID_FILE)
  } catch {
    // already gone
  }
}

async function main(): Promise<void> {
  console.log(BANNER)
  console.log()

  const hasSlack = !!(SLACK_BOT_TOKEN && SLACK_APP_TOKEN)
  const hasTelegram = !!TELEGRAM_BOT_TOKEN

  if (!hasTelegram && !hasSlack) {
    logger.error('No messenger configured. Set TELEGRAM_BOT_TOKEN or SLACK_BOT_TOKEN + SLACK_APP_TOKEN')
    process.exit(1)
  }

  acquireLock()

  // Ensure upload dir exists
  mkdirSync(UPLOADS_DIR, { recursive: true })

  initDatabase()

  // Memory decay
  runDecaySweep()
  setInterval(runDecaySweep, 24 * 60 * 60 * 1000)

  // Cleanup stale uploads
  cleanupOldUploads()

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down')
    releaseLock()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  logger.info('Lizz starting...')

  const telegramBot = hasTelegram ? createBot() : undefined
  const slackApp = hasSlack ? createSlackApp() : undefined

  // ── Scheduler (routes by chat_id format) ────────────────────────────────────
  const sender: Sender = async (chatId, text) => {
    if (/^\d+$/.test(chatId)) {
      if (!telegramBot) throw new Error(`No Telegram bot configured for chat ID ${chatId}`)
      await telegramBot.api.sendMessage(chatId, text)
    } else {
      if (!slackApp) throw new Error(`No Slack app configured for channel ${chatId}`)
      const formatted = formatForSlack(text)
      const chunks = splitMessage(formatted)
      for (const chunk of chunks) {
        await slackApp.client.chat.postMessage({ channel: chatId, text: chunk })
      }
    }
  }

  initScheduler(sender)

  // ── Telegram ────────────────────────────────────────────────────────────────
  if (telegramBot) {
    try {
      await telegramBot.start()
    } catch (err) {
      logger.error({ err }, 'Failed to start Telegram bot — check TELEGRAM_BOT_TOKEN in .env')
      releaseLock()
      process.exit(1)
    }
  }

  // ── Slack ───────────────────────────────────────────────────────────────────
  if (slackApp) {
    try {
      await slackApp.start()
      logger.info('Slack bot started')
    } catch (err) {
      logger.error({ err }, 'Failed to start Slack bot — check SLACK_BOT_TOKEN and SLACK_APP_TOKEN in .env')
      releaseLock()
      process.exit(1)
    }
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
