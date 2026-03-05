import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

export function readEnvFile(keys?: string[]): Record<string, string> {
  try {
    const envPath = path.join(PROJECT_ROOT, '.env')
    const content = readFileSync(envPath, 'utf-8')
    const result: Record<string, string> = {}

    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue

      const key = trimmed.slice(0, eqIdx).trim()
      let value = trimmed.slice(eqIdx + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      result[key] = value
    }

    if (keys) {
      return Object.fromEntries(
        keys.filter((k) => k in result).map((k) => [k, result[k]])
      )
    }

    return result
  } catch {
    return {}
  }
}
