import { DAILY_URL, dailyPhrase, deskTime, type DeskState } from '../lib/daily-desk'

export function DailyBrief({ state, lang }: { state: DeskState; lang: 'zh' | 'en' }) {
  const zh = lang === 'zh'
  return <details className="daily-brief" data-feed-status={state.status}>
    <summary><span className="desk-beacon" /><span>{zh ? '电脑里的今日简报' : 'Today’s desk briefing'}<small>{state.day.replace(/-/g, '.')} / AIHOT</small></span><span className="brief-toggle">+</span></summary>
    <div className="brief-reading">
      <div className="brief-meta">{state.status === 'live' ? `${zh ? '热榜同步于' : 'Synced'} ${deskTime(state.fetchedAt)}` : state.items.length ? `${zh ? '离线缓存' : 'Offline cache'} · ${deskTime(state.fetchedAt)}` : zh ? '正在连接热榜，暂时也可直接阅读日报' : 'Connect to the feed, or open the daily directly'}<span>{zh ? '近48小时 · 按热度排序' : 'Past 48h · Ranked by AIHOT'}</span></div>
      {state.items.length ? <ol>{state.items.map(item => <li key={item.rank}><span>{String(item.rank).padStart(2, '0')}</span><div><strong>{item.title}</strong><small>{item.sources} {zh ? '个来源' : 'sources'} · {deskTime(Date.parse(item.latestAt))}</small></div></li>)}</ol> : <p className="brief-empty">{zh ? '热点暂未加载完成。联网后自动同步，不使用虚构新闻。' : 'Headlines will appear when the live feed is available.'}</p>}
      <blockquote>{dailyPhrase(state.day)}<cite>{zh ? '每日一句 · 原创 / 按北京时间每日更换' : 'Original daily note / Asia–Shanghai'}</cite></blockquote>
      <a className="brief-open" href={DAILY_URL} target="_blank" rel="noopener noreferrer">{zh ? '打开 AIHOT 日报' : 'Open AIHOT daily'}<span>↗</span></a>
      <p className="brief-footnote">{zh ? 'AIHOT 聚合热榜 · 显示最近同步时间。来源不可用时保留有日期的缓存；阅读全文请前往 AIHOT。' : 'AIHOT aggregated rankings. Shows the last source sync. Dated cache remains available offline; read the full edition on AIHOT.'}</p>
    </div>
  </details>
}
