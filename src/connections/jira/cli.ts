/**
 * Jira CLI — called by the agent via bash.
 *
 * Usage:
 *   node dist/connections/jira/cli.js get <ISSUE-KEY>
 *   node dist/connections/jira/cli.js search "<JQL>"
 *   node dist/connections/jira/cli.js comment <ISSUE-KEY> "<text>"
 *   node dist/connections/jira/cli.js transitions <ISSUE-KEY>
 *   node dist/connections/jira/cli.js transition <ISSUE-KEY> "<status-name>"
 */

import '../../config.js' // load env vars
import { JiraClient } from './client.js'

const [, , command, ...args] = process.argv

if (!command) {
  console.error('Usage: jira-cli <command> [args...]')
  console.error('Commands: get, search, comment, transitions, transition')
  process.exit(1)
}

const jira = new JiraClient()

try {
  switch (command) {
    case 'get': {
      const key = args[0]
      if (!key) { console.error('Usage: jira-cli get <ISSUE-KEY>'); process.exit(1) }
      const issue = await jira.getIssue(key)
      console.log(JSON.stringify(issue, null, 2))
      break
    }

    case 'search': {
      const jql = args[0]
      if (!jql) { console.error('Usage: jira-cli search "<JQL>"'); process.exit(1) }
      const issues = await jira.searchIssues(jql)
      console.log(JSON.stringify(issues, null, 2))
      break
    }

    case 'comment': {
      const [key, ...commentParts] = args
      const comment = commentParts.join(' ')
      if (!key || !comment) { console.error('Usage: jira-cli comment <ISSUE-KEY> "<text>"'); process.exit(1) }
      await jira.addComment(key, comment)
      console.log(JSON.stringify({ success: true, issue: key }))
      break
    }

    case 'transitions': {
      const key = args[0]
      if (!key) { console.error('Usage: jira-cli transitions <ISSUE-KEY>'); process.exit(1) }
      const transitions = await jira.getTransitions(key)
      console.log(JSON.stringify(transitions, null, 2))
      break
    }

    case 'transition': {
      const [key, ...nameParts] = args
      const name = nameParts.join(' ')
      if (!key || !name) { console.error('Usage: jira-cli transition <ISSUE-KEY> "<status-name>"'); process.exit(1) }
      await jira.transitionByName(key, name)
      console.log(JSON.stringify({ success: true, issue: key, newStatus: name }))
      break
    }

    default:
      console.error(`Unknown command: ${command}`)
      console.error('Commands: get, search, comment, transitions, transition')
      process.exit(1)
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(JSON.stringify({ error: message }))
  process.exit(1)
}
