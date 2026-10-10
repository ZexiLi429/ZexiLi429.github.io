import { useEffect, useState } from 'react'

export const DAILY_URL = 'https://aihot.news/daily'
const API = `${import.meta.env.BASE_URL}data/ai-desk.json`
const CACHE = 'zexi-ai-desk-v1'
const INTERVAL = 30 * 60 * 1000
export type NewsItem = { rank: number; title: string; sources: number; latestAt: string; links?: { aihot?: string; original?: string; story?: string } }
export type DeskState = { items: NewsItem[]; fetchedAt: number; status: 'loading' | 'live' | 'cached' | 'unavailable'; day: string }
export const shanghaiDay = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const phrases = [
  '把方向交给远方，把今天交给行动。', '让好奇心开路，让耐心走完。',
  '不必等待笃定，先把第一步走好。', '把复杂留给思考，把清晰交给作品。',
  '真正的进步，是让想法经得起现实。', '保持锋芒，也保持重新学习的勇气。',
  '把眼光放远，把功夫落在眼前。', '每天多走一步，时间会替你作证。',
  '愿你的热爱，长出解决问题的能力。', '选择值得投入的事，然后认真到底。',
  '向未知提问，向细节要答案。', '让今天的行动，配得上明天的期待。',
  '作品会说话，耐心会留下痕迹。', '在变化中找方向，在行动中长出力量。',
]
export const dailyPhrase = (day: string) => phrases[Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000) % phrases.length] ?? phrases[0]
export function parseHotTopics(value: unknown): NewsItem[] {
  const items = (value as { items?: unknown[] })?.items
  if (!Array.isArray(items)) throw new Error('Invalid AIHOT response')
  const result = items.map(item => {
    const v = item as { rank?: number; title?: string; sourceCount?: number; latestAt?: string; links?: NewsItem['links'] }
    if (!Number.isInteger(v.rank) || v.rank! < 1 || typeof v.title !== 'string' || !v.title.trim() || typeof v.latestAt !== 'string' || !Number.isFinite(Date.parse(v.latestAt))) throw new Error('Invalid headline')
    return { rank: v.rank!, title: v.title.slice(0, 240), sources: Number.isFinite(v.sourceCount) ? v.sourceCount! : 0, latestAt: v.latestAt, links: v.links }
  }).sort((a, b) => a.rank - b.rank).slice(0, 3)
  if (result.length !== 3 || new Set(result.map(item => item.rank)).size !== 3) throw new Error('Incomplete rankings')
  return result
}
const initial = (): DeskState => {
  const empty: DeskState = { items: [], fetchedAt: 0, status: 'loading', day: shanghaiDay() }
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE) ?? 'null')
    if (cache && Number.isFinite(cache.fetchedAt) && cache.fetchedAt <= Date.now() && Date.now() - cache.fetchedAt < 7 * 86400000) {
      return { ...empty, items: parseHotTopics({ items: cache.items.map((item: NewsItem) => ({ ...item, sourceCount: item.sources })) }), fetchedAt: cache.fetchedAt, status: 'cached' }
    }
  } catch { /* Storage can be disabled; the live feed still works. */ }
  return empty
}
export function useDailyDesk() {
  const [state, setState] = useState<DeskState>(initial)
  useEffect(() => {
    let disposed = false, busy = false, nextTry = 0
    let controller: AbortController | undefined
    const update = async () => {
      setState(value => value.day === shanghaiDay() ? value : { ...value, day: shanghaiDay() })
      if (document.hidden || busy || Date.now() < nextTry) return
      busy = true; nextTry = Date.now() + INTERVAL
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 12000)
      try {
        const response = await fetch(API, { signal: controller.signal, cache: 'no-cache' })
        if (response.status === 429 || response.status === 503) {
          const raw = response.headers.get('Retry-After')
          const seconds = Number(raw)
          const retry = raw && Number.isFinite(seconds) ? seconds * 1000 : raw ? Date.parse(raw) - Date.now() : 0
          if (Number.isFinite(retry)) nextTry = Date.now() + Math.max(INTERVAL, retry)
        }
        if (!response.ok) throw new Error(`AIHOT ${response.status}`)
        const payload = await response.json()
        const items = parseHotTopics(payload), fetchedAt = payload.fetchedAt
        if (!Number.isFinite(fetchedAt) || fetchedAt > Date.now() + 60000) throw new Error('Invalid source timestamp')
        if (!disposed) {
          setState({ items, fetchedAt, status: !payload.stale && Date.now() - fetchedAt < 2 * 60 * 60 * 1000 ? 'live' : 'cached', day: shanghaiDay() })
          try { localStorage.setItem(CACHE, JSON.stringify({ items, fetchedAt })) } catch { /* Optional offline cache. */ }
        }
      } catch {
        if (!disposed) setState(value => ({ ...value, status: value.items.length ? 'cached' : 'unavailable' }))
      } finally { clearTimeout(timeout); busy = false }
    }
    void update()
    const interval = setInterval(() => { void update() }, 60000)
    const visible = () => { void update() }
    document.addEventListener('visibilitychange', visible)
    return () => { disposed = true; controller?.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', visible) }
  }, [])
  return state
}
export const deskTime = (time: number) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(time)

export function drawDailyDesk(canvas: HTMLCanvasElement, state: DeskState) {
  const c = canvas.getContext('2d')!
  c.setTransform(1, 0, 0, 1, 0, 0); c.scale(canvas.width / 1200, canvas.height / 760)
  c.fillStyle = '#08192b'; c.fillRect(0, 0, 1200, 760)
  const gradient = c.createLinearGradient(0, 0, 1200, 760)
  gradient.addColorStop(0, '#193a55'); gradient.addColorStop(1, '#0b2035')
  c.fillStyle = gradient; c.fillRect(0, 0, 1200, 100)
  c.font = '600 29px sans-serif'; c.fillStyle = '#edf5fa'; c.fillText('ZEXI / DAILY DESK', 38, 60)
  c.font = '22px monospace'; c.fillStyle = '#a1c7de'; c.fillText(state.day.replace(/-/g, '.'), 963, 60)
  c.fillStyle = '#73c8d0'; c.font = '600 22px sans-serif'; c.fillText('AIHOT · 热榜前三 / 近48小时', 38, 144)
  c.fillStyle = '#7796ac'; c.font = '18px sans-serif'
  c.fillText(state.status === 'live' ? `已同步 ${deskTime(state.fetchedAt)}` : state.items.length ? `缓存 ${deskTime(state.fetchedAt)} · 等待同步` : state.status === 'loading' ? '正在同步公开热榜…' : '暂时离线 · 点击电脑查看日报', 38, 175)
  const wrap = (text: string, x: number, y: number, maxWidth: number, maxLines = 2) => {
    let line = '', row = 0
    const tokens = text.match(/[A-Za-z0-9.]+|\s+|./gu) ?? []
    for (const token of tokens) {
      if (c.measureText(line + token).width > maxWidth) {
        if (row === maxLines - 1) { c.fillText(line.slice(0, -1) + '…', x, y + row * 37); return }
        c.fillText(line, x, y + row++ * 37); line = ''
      }
      line += token
    }
    c.fillText(line, x, y + row * 37)
  }
  for (let i = 0; i < 3; i++) {
    const y = 220 + i * 128, item = state.items[i]
    c.fillStyle = i === 0 ? '#e3bf85' : '#719ebc'; c.font = '24px monospace'; c.fillText(`0${i + 1}`, 38, y + 14)
    c.fillStyle = '#e7f1f7'; c.font = '500 29px sans-serif'; wrap(item?.title ?? (state.status === 'loading' ? '正在加载热点' : '热点暂不可用'), 95, y + 14, 625)
    c.fillStyle = '#7799b2'; c.font = '18px sans-serif'; c.fillText(item ? `${item.sources} 个来源 · ${deskTime(Date.parse(item.latestAt))}` : 'AIHOT 公开热榜', 95, y + 94)
    c.fillStyle = '#244057'; c.fillRect(95, y + 111, 625, 1)
  }
  c.fillStyle = '#0b1c2d'; c.fillRect(770, 124, 402, 470)
  c.strokeStyle = '#294357'; c.strokeRect(770, 124, 402, 470)
  c.fillStyle = '#accbdd'; c.font = '21px monospace'; c.fillText('brief.ts', 796, 161)
  c.fillStyle = '#66899f'; c.font = '16px sans-serif'; c.fillText('代码摘录 / 数据读取', 796, 193)
  const lines = ['const endpoint =', "  'https://aihot.news' +", "  '/api/v1/hot-topics';", '', 'const res = await fetch(endpoint);', 'const feed = await res.json();', 'const top3 = feed.items', '  .sort((a,b) => a.rank-b.rank)', '  .slice(0, 3);', '', '// Stay curious.', '// Build with purpose.']
  c.font = '16px monospace'
  lines.forEach((line, i) => { c.fillStyle = '#41657e'; c.fillText(String(i + 1).padStart(2, '0'), 790, 237 + i * 27); c.fillStyle = line.startsWith('//') ? '#78979e' : i < 4 ? '#89c4d9' : '#c6b8e6'; c.fillText(line, 831, 237 + i * 27) })
  c.fillStyle = '#172c3f'; c.fillRect(0, 622, 1200, 138)
  c.fillStyle = '#ba9b70'; c.font = '18px sans-serif'; c.fillText('DAILY NOTE / 每日一句 · 原创', 38, 655)
  c.fillStyle = '#efdec1'; c.font = '500 29px sans-serif'; c.fillText(dailyPhrase(state.day), 38, 702)
  c.fillStyle = '#9dbacd'; c.font = '18px sans-serif'; c.fillText('点击电脑 · 打开 AIHOT 日报 ↗', 866, 719)
}
