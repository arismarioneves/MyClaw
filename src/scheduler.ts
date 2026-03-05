import cronParser from 'cron-parser'
const { parseExpression } = cronParser
import { getDueTasks, updateTaskAfterRun } from './db.js'
import { runAgent } from './agent.js'
import { logger } from './logger.js'

export type Sender = (chatId: string, text: string) => Promise<void>

const POLL_INTERVAL_MS = 60_000

export function computeNextRun(cronExpression: string): number {
  const interval = parseExpression(cronExpression)
  return Math.floor(interval.next().getTime() / 1000)
}

export async function runDueTasks(send: Sender): Promise<void> {
  const tasks = getDueTasks()
  for (const task of tasks) {
    logger.info({ taskId: task.id, prompt: task.prompt }, 'Running scheduled task')
    try {
      await send(task.chat_id, `Running scheduled task: "${task.prompt}"...`)
      const { text } = await runAgent(task.prompt)
      const result = text ?? '(no response)'
      const nextRun = computeNextRun(task.schedule)
      updateTaskAfterRun(task.id, result, nextRun)
      await send(task.chat_id, `Scheduled task result:\n\n${result}`)
    } catch (err) {
      logger.error({ err, taskId: task.id }, 'Scheduled task failed')
      const nextRun = computeNextRun(task.schedule)
      updateTaskAfterRun(task.id, `Error: ${String(err)}`, nextRun)
      await send(task.chat_id, `Scheduled task failed: ${String(err)}`)
    }
  }
}

export function initScheduler(send: Sender): void {
  logger.info('Scheduler initialized, polling every 60s')
  setInterval(() => {
    runDueTasks(send).catch((err: unknown) => logger.error({ err }, 'Scheduler poll error'))
  }, POLL_INTERVAL_MS)
}
