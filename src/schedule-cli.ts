import { randomUUID } from 'crypto'
import {
  initDatabase,
  createTask,
  listTasks,
  deleteTask,
  pauseTask,
  resumeTask,
} from './db.js'
import { computeNextRun } from './scheduler.js'

initDatabase()

const [, , cmd, ...args] = process.argv

switch (cmd) {
  case 'create': {
    const [prompt, schedule, chatId] = args
    if (!prompt || !schedule || !chatId) {
      console.error('Usage: schedule-cli create "<prompt>" "<cron>" <chat_id>')
      process.exit(1)
    }
    try {
      const nextRun = computeNextRun(schedule)
      const id = randomUUID()
      createTask({
        id,
        chat_id: chatId,
        prompt,
        schedule,
        next_run: nextRun,
        status: 'active',
        created_at: Math.floor(Date.now() / 1000),
      })
      console.log(`Task created: ${id}`)
    } catch (err) {
      console.error(`Invalid cron expression or error: ${String(err)}`)
      process.exit(1)
    }
    break
  }

  case 'list': {
    const tasks = listTasks()
    if (tasks.length === 0) {
      console.log('No scheduled tasks.')
      break
    }
    console.log('\nScheduled Tasks:')
    console.log('─'.repeat(80))
    for (const t of tasks) {
      console.log(`ID:       ${t.id}`)
      console.log(`  Prompt:   ${t.prompt}`)
      console.log(`  Schedule: ${t.schedule}`)
      console.log(`  Status:   ${t.status}`)
      console.log(`  Next run: ${new Date(t.next_run * 1000).toISOString()}`)
      if (t.last_run) {
        console.log(`  Last run: ${new Date(t.last_run * 1000).toISOString()}`)
      }
      console.log()
    }
    break
  }

  case 'delete': {
    const [id] = args
    if (!id) {
      console.error('Usage: schedule-cli delete <id>')
      process.exit(1)
    }
    if (deleteTask(id)) console.log(`Task ${id} deleted.`)
    else console.error(`Task ${id} not found.`)
    break
  }

  case 'pause': {
    const [id] = args
    if (!id) {
      console.error('Usage: schedule-cli pause <id>')
      process.exit(1)
    }
    if (pauseTask(id)) console.log(`Task ${id} paused.`)
    else console.error(`Task ${id} not found.`)
    break
  }

  case 'resume': {
    const [id] = args
    if (!id) {
      console.error('Usage: schedule-cli resume <id>')
      process.exit(1)
    }
    if (resumeTask(id)) console.log(`Task ${id} resumed.`)
    else console.error(`Task ${id} not found.`)
    break
  }

  default:
    console.log(`
Lizz Schedule CLI

Commands:
  create "<prompt>" "<cron>" <chat_id>  Create a new scheduled task
  list                                   List all tasks
  delete <id>                            Delete a task
  pause <id>                             Pause a task
  resume <id>                            Resume a paused task

Cron examples:
  "0 9 * * *"    — daily at 9am
  "0 9 * * 1"    — every Monday at 9am
  "0 */4 * * *"  — every 4 hours
    `.trim())
    process.exit(cmd ? 1 : 0)
}
