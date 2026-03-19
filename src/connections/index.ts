import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { PROJECT_ROOT, JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN, LOCAL_REPO_PATH, GITHUB_REPO } from '../config.js'

export interface Connection {
  id: string
  instructions: string
}

function loadInstructions(id: string): string {
  const filePath = path.join(PROJECT_ROOT, 'connections', id, 'instructions.md')
  if (!existsSync(filePath)) return ''
  return readFileSync(filePath, 'utf-8').trim()
}

export function getActiveConnections(): Connection[] {
  const active: Connection[] = []

  if (JIRA_HOST && JIRA_EMAIL && JIRA_API_TOKEN) {
    active.push({ id: 'jira', instructions: loadInstructions('jira') })
  }

  if (GITHUB_REPO) {
    active.push({ id: 'github', instructions: loadInstructions('github') })
  }

  if (LOCAL_REPO_PATH) {
    active.push({ id: 'local-repo', instructions: loadInstructions('local-repo') })
  }

  return active
}

export function buildConnectionsContext(): string {
  const connections = getActiveConnections()
  if (connections.length === 0) return ''
  return connections
    .map(c => c.instructions)
    .filter(Boolean)
    .join('\n\n')
}
