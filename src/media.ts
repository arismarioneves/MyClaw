import { fileURLToPath } from 'url'
import path from 'path'
import { createWriteStream, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import https from 'https'
import { PROJECT_ROOT } from './config.js'
import { logger } from './logger.js'

const __filename = fileURLToPath(import.meta.url)
void __filename // used for PROJECT_ROOT derivation via config

export const UPLOADS_DIR = path.join(PROJECT_ROOT, 'workspace', 'uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-')
}

export async function downloadMedia(
  botToken: string,
  fileId: string,
  originalFilename?: string
): Promise<string> {
  const filePath = await new Promise<string>((resolve, reject) => {
    const url = `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
    https
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => (data += chunk.toString()))
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as { ok: boolean; result?: { file_path: string }; description?: string }
            if (!parsed.ok) reject(new Error(`getFile failed: ${parsed.description ?? 'unknown'}`))
            else resolve(parsed.result!.file_path)
          } catch (e) {
            reject(e)
          }
        })
        res.on('error', reject)
      })
      .on('error', reject)
  })

  const ext = path.extname(filePath) || path.extname(originalFilename ?? '') || '.bin'
  const baseName = originalFilename
    ? sanitizeFilename(path.basename(originalFilename, path.extname(originalFilename)))
    : 'file'
  const localName = `${Date.now()}_${baseName}${ext}`
  const localPath = path.join(UPLOADS_DIR, localName)

  await new Promise<void>((resolve, reject) => {
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`
    https
      .get(downloadUrl, (res) => {
        const writer = createWriteStream(localPath)
        res.pipe(writer)
        writer.on('finish', resolve)
        writer.on('error', reject)
        res.on('error', reject)
      })
      .on('error', reject)
  })

  logger.debug({ localPath }, 'Media downloaded')
  return localPath
}

export function buildPhotoMessage(localPath: string, caption?: string): string {
  const parts = [`I'm sending you a photo at: ${localPath}`]
  if (caption) parts.push(`Caption: ${caption}`)
  parts.push('Please analyze it.')
  return parts.join('\n')
}

export function buildDocumentMessage(localPath: string, filename: string, caption?: string): string {
  const parts = [`I'm sending you a document "${filename}" at: ${localPath}`]
  if (caption) parts.push(`Caption: ${caption}`)
  parts.push('Please read and process it.')
  return parts.join('\n')
}

function downloadWithRedirects(
  url: string,
  localPath: string,
  headers: Record<string, string> = {},
  redirectsLeft = 5
): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers,
    }
    https
      .get(options, (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          if (redirectsLeft <= 0) return reject(new Error('Too many redirects'))
          return resolve(downloadWithRedirects(res.headers.location, localPath, headers, redirectsLeft - 1))
        }
        if (status < 200 || status >= 300) {
          res.resume()
          return reject(new Error(`Slack file download failed: HTTP ${status}`))
        }
        const contentType = res.headers['content-type'] ?? ''
        if (contentType.startsWith('text/html') || contentType.startsWith('application/json')) {
          res.resume()
          return reject(new Error(`Slack file download returned unexpected content-type: ${contentType} — bot token may lack files:read scope`))
        }
        const writer = createWriteStream(localPath)
        res.pipe(writer)
        writer.on('finish', resolve)
        writer.on('error', reject)
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

export async function downloadSlackFile(
  botToken: string,
  url: string,
  originalFilename?: string
): Promise<string> {
  const ext = path.extname(originalFilename ?? '') || '.bin'
  const baseName = originalFilename
    ? sanitizeFilename(path.basename(originalFilename, path.extname(originalFilename)))
    : 'file'
  const localName = `${Date.now()}_${baseName}${ext}`
  const localPath = path.join(UPLOADS_DIR, localName)

  await downloadWithRedirects(url, localPath, { Authorization: `Bearer ${botToken}` })
  logger.debug({ localPath }, 'Slack file downloaded')
  return localPath
}

export function cleanupOldUploads(maxAgeMs = 24 * 60 * 60 * 1000): void {
  try {
    const now = Date.now()
    const files = readdirSync(UPLOADS_DIR)
    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file)
      const stat = statSync(filePath)
      if (now - stat.mtimeMs > maxAgeMs) {
        unlinkSync(filePath)
        logger.debug({ file }, 'Cleaned up old upload')
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Upload cleanup failed')
  }
}
