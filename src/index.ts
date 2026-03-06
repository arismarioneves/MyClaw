import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import path from 'path'
import { STORE_DIR, TELEGRAM_BOT_TOKEN } from './config.js'
import { initDatabase } from './db.js'
import { runDecaySweep } from './memory.js'
import { cleanupOldUploads, UPLOADS_DIR } from './media.js'
import { createBot } from './bot.js'
import { initScheduler } from './scheduler.js'
import { logger } from './logger.js'

const BANNER = `
███╗   ███╗██╗   ██╗     ██████╗██╗      █████╗ ██╗    ██╗
████╗ ████║╚██╗ ██╔╝    ██╔════╝██║     ██╔══██╗██║    ██║
██╔████╔██║ ╚████╔╝     ██║     ██║     ███████║██║ █╗ ██║
██║╚██╔╝██║  ╚██╔╝      ██║     ██║     ██╔══██║██║███╗██║
██║ ╚═╝ ██║   ██║       ╚██████╗███████╗██║  ██║╚███╔███╔╝
╚═╝     ╚═╝   ╚═╝        ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ (by Mario)
`.trim()

const PID_FILE = path.join(STORE_DIR, 'myclaw.pid')

function acquireLock(): void {
  mkdirSync(STORE_DIR, { recursive: true })

  if (existsSync(PID_FILE)) {
    const raw = readFileSync(PID_FILE, 'utf-8').trim()
    const oldPid = parseInt(raw, 10)
    if (!isNaN(oldPid) && oldPid !== process.pid) {
      try {
        process.kill(oldPid, 0) // throws if not alive
        process.kill(oldPid, 'SIGTERM')
        logger.info({ oldPid }, 'Killed stale MyClaw process')
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

  if (!TELEGRAM_BOT_TOKEN) {
    logger.error('TELEGRAM_BOT_TOKEN is not set. Run: npm run setup')
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

  const bot = createBot()

  // Scheduler sends messages via bot.api
  initScheduler(async (chatId, text) => {
    await bot.api.sendMessage(chatId, text)
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down')
    releaseLock()
    await bot.stop()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  try {
    logger.info('MyClaw starting...')
    await bot.start()
  } catch (err) {
    logger.error({ err }, 'Failed to start bot — check TELEGRAM_BOT_TOKEN in .env')
    releaseLock()
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
