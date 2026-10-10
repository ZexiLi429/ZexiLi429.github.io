import { readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const output = new URL('../public/data/ai-desk.json', import.meta.url)
const source = 'https://aihot.news/api/v1/hot-topics'
const interval = 30 * 60 * 1000
let cached, pending, retryAt = 0
export async function readDeskSnapshot() {
  try { return JSON.parse(await readFile(output, 'utf8')) } catch { return null }
}
export async function loadDeskFeed(force = false) {
  if (pending) return pending
  if (!force && cached && Date.now() - cached.fetchedAt < interval) return cached
  if (Date.now() < retryAt) {
    if (cached) return { ...cached, stale: true }
    throw new Error('AIHOT requested a retry delay')
  }
  pending = (async () => {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } })
      if (!response.ok) {
        const raw = response.headers.get('Retry-After')
        const delay = raw && /^\d+$/.test(raw) ? Number(raw) * 1000 : raw ? Date.parse(raw) - Date.now() : interval
        retryAt = Date.now() + Math.max(interval, Number.isFinite(delay) ? delay : interval)
        throw new Error(`AIHOT returned ${response.status}`)
      }
      const value = await response.json()
      const items = value.items?.filter(item => Number.isInteger(item.rank) && item.rank > 0 && typeof item.title === 'string' && item.title.trim() && Number.isFinite(Date.parse(item.latestAt)))
        .sort((a, b) => a.rank - b.rank).slice(0, 3)
        .map(({ rank, title, sourceCount, latestAt, links, attribution, source }) => ({ rank, title, sourceCount, latestAt, links, attribution, source }))
      if (items?.length !== 3 || new Set(items.map(item => item.rank)).size !== 3) throw new Error('AIHOT returned incomplete rankings')
      cached = { schemaVersion: 1, fetchedAt: Date.now(), attribution: { name: 'AIHOT', url: 'https://aihot.news/daily' }, items }
      return cached
    } catch (error) {
      retryAt = Math.max(retryAt, Date.now() + interval)
      cached ??= await readDeskSnapshot()
      if (cached) return { ...cached, stale: true }
      throw error
    } finally { pending = undefined }
  })()
  return pending
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const snapshot = await loadDeskFeed(true)
  await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
  await writeFile(`${fileURLToPath(output)}.tmp`, JSON.stringify(snapshot, null, 2) + '\n')
  await rename(`${fileURLToPath(output)}.tmp`, output)
  console.log(`AIHOT: ${snapshot.items.length} headlines, source fetched ${new Date(snapshot.fetchedAt).toISOString()}`)
}
