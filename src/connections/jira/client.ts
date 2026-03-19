import axios, { type AxiosInstance } from 'axios'
import { JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN } from '../../config.js'

export interface JiraIssue {
  key: string
  summary: string
  description: string
  status: string
  assignee: string | null
  reporter: string
  priority: string
  type: string
  created: string
  updated: string
  url: string
}

export interface JiraTransition {
  id: string
  name: string
}

function extractText(adf: unknown): string {
  if (!adf || typeof adf !== 'object') return ''
  const node = adf as Record<string, unknown>

  if (node['type'] === 'text') return (node['text'] as string) ?? ''

  if (Array.isArray(node['content'])) {
    return (node['content'] as unknown[]).map(extractText).join('')
  }
  return ''
}

export class JiraClient {
  private http: AxiosInstance

  constructor() {
    if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) {
      throw new Error('Jira credentials not configured. Set JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN in .env')
    }

    this.http = axios.create({
      baseURL: `https://${JIRA_HOST}/rest/api/3`,
      auth: { username: JIRA_EMAIL, password: JIRA_API_TOKEN },
      headers: { 'Content-Type': 'application/json' },
    })
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    const { data } = await this.http.get(`/issue/${issueKey}`, {
      params: {
        fields: 'summary,description,status,assignee,reporter,priority,issuetype,created,updated',
      },
    })

    const f = data.fields
    return {
      key: data.key,
      summary: f.summary ?? '',
      description: f.description ? extractText(f.description) : '',
      status: f.status?.name ?? '',
      assignee: f.assignee?.displayName ?? null,
      reporter: f.reporter?.displayName ?? '',
      priority: f.priority?.name ?? '',
      type: f.issuetype?.name ?? '',
      created: f.created ?? '',
      updated: f.updated ?? '',
      url: `https://${JIRA_HOST}/browse/${data.key}`,
    }
  }

  async searchIssues(jql: string, maxResults = 20): Promise<JiraIssue[]> {
    const { data } = await this.http.post('/search/jql', {
      jql,
      maxResults,
      fields: ['summary', 'status', 'assignee', 'priority', 'issuetype', 'updated'],
    })

    return (data.issues as unknown[]).map((issue: unknown) => {
      const i = issue as Record<string, unknown>
      const f = i['fields'] as Record<string, unknown>
      return {
        key: i['key'] as string,
        summary: (f['summary'] as string) ?? '',
        description: '',
        status: (f['status'] as Record<string, unknown>)?.['name'] as string ?? '',
        assignee: (f['assignee'] as Record<string, unknown>)?.['displayName'] as string ?? null,
        reporter: '',
        priority: (f['priority'] as Record<string, unknown>)?.['name'] as string ?? '',
        type: (f['issuetype'] as Record<string, unknown>)?.['name'] as string ?? '',
        created: '',
        updated: (f['updated'] as string) ?? '',
        url: `https://${JIRA_HOST}/browse/${i['key']}`,
      }
    })
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    await this.http.post(`/issue/${issueKey}/comment`, {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: comment }],
          },
        ],
      },
    })
  }

  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const { data } = await this.http.get(`/issue/${issueKey}/transitions`)
    return (data.transitions as unknown[]).map((t: unknown) => {
      const tr = t as Record<string, unknown>
      return { id: tr['id'] as string, name: tr['name'] as string }
    })
  }

  async transitionByName(issueKey: string, statusName: string): Promise<void> {
    const transitions = await this.getTransitions(issueKey)
    const match = transitions.find(
      (t) => t.name.toLowerCase() === statusName.toLowerCase()
    )
    if (!match) {
      const available = transitions.map((t) => t.name).join(', ')
      throw new Error(`Transition "${statusName}" not found. Available: ${available}`)
    }
    await this.http.post(`/issue/${issueKey}/transitions`, {
      transition: { id: match.id },
    })
  }
}
