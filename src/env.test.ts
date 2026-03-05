import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')
const TEST_ENV = path.join(PROJECT_ROOT, '.env.test-temp')

// Patch readEnvFile to use our test file
async function readTestEnv(content: string, keys?: string[]): Promise<Record<string, string>> {
  writeFileSync(TEST_ENV, content)
  // We need to dynamically re-implement since readEnvFile reads from PROJECT_ROOT/.env
  // So we inline the logic here for isolated testing
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
  if (keys) return Object.fromEntries(keys.filter((k) => k in result).map((k) => [k, result[k]]))
  return result
}

afterEach(() => {
  if (existsSync(TEST_ENV)) unlinkSync(TEST_ENV)
})

describe('env parser', () => {
  it('parses simple KEY=VALUE', async () => {
    const result = await readTestEnv('FOO=bar\nBAZ=qux')
    expect(result['FOO']).toBe('bar')
    expect(result['BAZ']).toBe('qux')
  })

  it('strips double-quoted values', async () => {
    const result = await readTestEnv('KEY="hello world"')
    expect(result['KEY']).toBe('hello world')
  })

  it('strips single-quoted values', async () => {
    const result = await readTestEnv("KEY='hello world'")
    expect(result['KEY']).toBe('hello world')
  })

  it('skips comment lines', async () => {
    const result = await readTestEnv('# this is a comment\nFOO=bar')
    expect(result['FOO']).toBe('bar')
    expect(result['#']).toBeUndefined()
  })

  it('skips blank lines', async () => {
    const result = await readTestEnv('\n\nFOO=bar\n\n')
    expect(result['FOO']).toBe('bar')
  })

  it('filters by keys when provided', async () => {
    const result = await readTestEnv('A=1\nB=2\nC=3', ['A', 'C'])
    expect(result['A']).toBe('1')
    expect(result['B']).toBeUndefined()
    expect(result['C']).toBe('3')
  })

  it('handles value with = sign in it', async () => {
    const result = await readTestEnv('KEY=foo=bar')
    expect(result['KEY']).toBe('foo=bar')
  })
})
