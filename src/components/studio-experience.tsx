import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Github, Mail, Music2 } from 'lucide-react'
import { exhibits as fields } from '../lib/exhibits'
import { ExhibitView } from './exhibit-map'
import { useDailyDesk } from '../lib/daily-desk'
import { DailyBrief } from './daily-brief'

const Scene = lazy(() => import('./cinematic-studio').then(module => ({ default: module.StudioScene })))
const ids = ['home', 'about', 'projects', 'music', 'resume']
const exhibitFromUrl=()=>{const i=fields.findIndex(field=>field.id===new URL(location.href).searchParams.get('exhibit'));return i<0?null:i}

export function StudioExperience({ lang, onToggleLanguage }: { lang: 'zh' | 'en'; onToggleLanguage: () => void }) {
  const zh = lang === 'zh'
  const dailyDesk = useDailyDesk()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadProgress,setLoadProgress]=useState(0)
  const reportProgress=useCallback((value:number)=>setLoadProgress(value),[])
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [active, setActive] = useState('home')
  const [entered, setEntered] = useState(false)
  const [selection, setSelection] = useState<number | null>(exhibitFromUrl)
  const historyOwned=useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const reportStatus = useCallback((value: 'loading' | 'ready' | 'error') => {
    setStatus(value)
    if(value!=='loading')dispatchEvent(new Event('studio-model-complete'))
  }, [])
  const openExhibit=useCallback((index:number)=>{
    const url=new URL(location.href),alreadyOpen=url.searchParams.has('exhibit');url.searchParams.set('exhibit',fields[index].id)
    if(alreadyOpen)history.replaceState(history.state,'',url)
    else{history.pushState({...history.state,studioExhibit:true},'',url);historyOwned.current=true}
    setSelection(index)
    if(dialog.current?.open)dialog.current.scrollTop=0
  },[])
  const closeExhibit=useCallback(()=>{
    if(historyOwned.current){historyOwned.current=false;history.back()}
    else{const url=new URL(location.href);url.searchParams.delete('exhibit');history.replaceState(history.state,'',url);setSelection(null);dialog.current?.close()}
  },[])
  useEffect(()=>{
    const sync=()=>{const value=exhibitFromUrl();historyOwned.current=value!==null&&history.state?.studioExhibit===true;setSelection(value);if(value===null)dialog.current?.close()}
    addEventListener('popstate',sync);return()=>removeEventListener('popstate',sync)
  },[])

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    document.documentElement.lang = zh ? 'zh-CN' : 'en'
  }, [zh])
  useEffect(() => {
    const video = document.querySelector('video')
    if (reduced || entered) video?.pause()
    else void video?.play().catch(() => {})
  }, [reduced, entered])
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const p = Math.min(1, Math.max(0, scrollY / (innerHeight * .65)))
      document.documentElement.style.setProperty('--studio-progress', String(p))
      const opening = scrollY / innerHeight
      const sceneOpacity = Math.min(1, opening / .22)
      document.documentElement.style.setProperty('--scene-opacity', String(sceneOpacity))
      const fadeOut = Math.min(1, opening / .2)
      const fadeIn = Math.max(0, Math.min(1, (opening - .6) / .2))
      document.documentElement.style.setProperty('--intro-opacity', String(1 - fadeOut + fadeIn))
      document.documentElement.style.setProperty('--greeting-opacity', String(Math.max(0, Math.min(1, (opening - .54) / .2))))
      document.body.classList.toggle('studio-entered', p > .5)
      setEntered(p > .5)
      let chapter = 'home'
      for (const id of ids.slice(1)) {
        const section = document.getElementById(id)
        if (section && section.getBoundingClientRect().top < innerHeight * .5) chapter = id
      }
      setActive(chapter)
    }
    const scroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update(); addEventListener('scroll', scroll, { passive: true }); addEventListener('resize', scroll)
    return () => { cancelAnimationFrame(raf); removeEventListener('scroll', scroll); removeEventListener('resize', scroll); document.body.classList.remove('studio-entered') }
  }, [])
  useEffect(() => {
    if (selection !== null && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [selection])

  const labels = zh ? ['首页', '关于', '机器人与AI', '音乐', '简历'] : ['Home', 'About', 'Robotics & AI', 'Music', 'Resume']
  return <>
    <a className="skip-link" href="#about">{zh ? '跳到正文' : 'Skip to content'}</a>
    <div className={`studio-layer ${status === 'error' ? 'studio-fallback' : ''}`} data-model-status={status}>
      <Suspense fallback={null}><Scene onStatus={reportStatus} onProgress={reportProgress} reduced={reduced} selectedFocus={selection} lang={lang} onOpenExhibit={openExhibit} dailyDesk={dailyDesk} /></Suspense>
      <div className="studio-vignette" />
    </div>
    {entered && <header className="studio-nav">
      <a className="studio-brand" href="#home">Zexi<sup>®</sup></a>
      <nav aria-label={zh ? '章节导航' : 'Chapter navigation'}>{ids.map((id, i) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>{labels[i]}</a>)}</nav>
      <button className="studio-language" onClick={onToggleLanguage} aria-label={zh ? 'Switch to English' : '切换为中文'}>{zh ? 'EN' : '中文'}</button>
      <a className="nav-contact" href="mailto:76321278@qq.com"><Mail size={16} /><span>{zh ? '联系我' : 'Contact'}</span></a>
    </header>}
    <div className="studio-status" role="status">{entered && status !== 'ready' ? status === 'loading' ? (zh ? `人物准备中 ${loadProgress>0?`${loadProgress}%`:''} · 内容可以先看` : `Preparing your host ${loadProgress>0?`${loadProgress}%`:''} · Keep exploring.`) : (zh ? '3D 暂时未能加载，仍可阅读全部内容' : '3D unavailable. All content remains accessible.') : null}</div>
    <main className="studio-story">
      <section className="story-section align-left" id="about" tabIndex={-1} aria-labelledby="about-title">
        <div className="story-card">
          <div className="eyebrow"><span>01 / ABOUT</span><span className="small-star">✳</span></div>
          <h2 id="about-title">{zh ? <>用代码构建智能，<br /><em>用音乐记录生活。</em></> : <>Building intelligence.<br /><em>Capturing life.</em></>}</h2>
          <p>{zh ? '你好，我是李泽曦。专注于 LLM 智能体、机器视觉与全栈开发，也在音乐里寻找表达。' : 'I am Li Zexi. Focused on AI Agents, Computer Vision, and Full-Stack development. Music is another way I express myself.'}</p>
          <div className="education-pair"><span><small>{zh ? '天津大学' : 'Tianjin University'}</small>{zh ? '软件工程' : 'Software Engineering'}</span><span><small>{zh ? '布里斯托大学' : 'University of Bristol'}</small>{zh ? '机器人学硕士' : 'MSc Robotics'}</span></div>
          <a className="text-link" href="https://github.com/ZexiLi429" target="_blank" rel="noreferrer"><Github size={17} /> GitHub <ArrowUpRight size={16} /></a>
          <DailyBrief state={dailyDesk} lang={lang}/>
          <a className="next-chapter" href="#projects">{zh ? '下一站 · 机器人与 AI' : 'Next · Robotics & AI'}<ArrowDown size={16} /></a>
        </div>
      </section>
      <section className="story-section align-right" id="projects" tabIndex={-1} aria-labelledby="projects-title">
        <div className="story-card project-card">
          <div className="eyebrow"><span>02 / EXPLORATIONS</span><span className="small-star">↗</span></div>
          <h2 id="projects-title">{zh ? <>好奇心，<br /><em>变成代码。</em></> : <>Curiosity,<br /><em>in code.</em></>}</h2>
          <p>{zh ? '墙上的三幅展板，是三个探索方向。点击展板或下方入口，进入对应展区。' : 'Three pictures on the wall, three directions to explore. Open a picture or an entry below to enter its exhibit.'}</p>
          <div className="project-list">{fields.map((field, i) => <button key={field.number} onClick={() => openExhibit(i)} aria-haspopup="dialog"><span className={`project-icon project-icon-${i}`}>{field.kind}</span><span><small>{field.number} / EXHIBIT</small><strong>{zh ? field.name : field.en}</strong></span><ArrowUpRight size={20} /></button>)}</div>
          <a className="text-link" href="https://github.com/ZexiLi429" target="_blank" rel="noreferrer">{zh ? '前往我的 GitHub' : 'Explore my GitHub'}<ArrowUpRight size={16} /></a>
        </div>
      </section>
      <section className="story-section align-left" id="music" tabIndex={-1} aria-labelledby="music-title">
        <div className="story-card music-card">
          <div className="eyebrow"><span>03 / MUSIC</span><Music2 size={20} /></div>
          <h2 id="music-title">{zh ? <>在喧嚣中，<br /><em>留下自己的旋律。</em></> : <>Amid the noise,<br /><em>find a melody.</em></>}</h2>
          <div className="music-staff" aria-hidden="true"><span>♪</span><span>♫</span><span>♩</span></div>
          <p>{zh ? '用音乐记录生活。代码之外，音乐也是我的创作语言。' : 'Capturing life through music. Beyond code, music is another creative language.'}</p>
          <a className="text-link" href="mailto:76321278@qq.com">{zh ? '聊聊音乐与创作' : 'Let’s talk music'}<ArrowUpRight size={16} /></a>
          <a className="next-chapter" href="#resume">{zh ? '下一站 · 简历与联系' : 'Next · Resume & contact'}<ArrowDown size={16} /></a>
        </div>
      </section>
      <section className="story-section align-right last-section" id="resume" tabIndex={-1} aria-labelledby="resume-title">
        <div className="story-card">
          <div className="eyebrow"><span>04 / CONNECT</span><span className="small-star">✳</span></div>
          <h2 id="resume-title">{zh ? <>下一段故事，<br /><em>一起写。</em></> : <>The next chapter,<br /><em>together.</em></>}</h2>
          <dl className="resume-list"><div><dt>{zh ? '教育背景' : 'Education'}</dt><dd>{zh ? '天津大学 · 软件工程' : 'Tianjin University · Software Engineering'}<br />{zh ? '布里斯托大学 · 机器人学硕士' : 'University of Bristol · MSc Robotics'}</dd></div><div><dt>{zh ? '专注方向' : 'Focus'}</dt><dd>{zh ? 'LLM 智能体 / 机器视觉 / 全栈开发' : 'AI Agents / Computer Vision / Full-Stack'}</dd></div></dl>
          <a className="contact-primary" href="mailto:76321278@qq.com"><Mail size={18} />{zh ? '给我发邮件' : 'Let’s connect'}<ArrowUpRight size={18} /></a>
          <a className="text-link" href="https://github.com/ZexiLi429" target="_blank" rel="noreferrer"><Github size={17} /> github.com/ZexiLi429 <ArrowUpRight size={16} /></a>
        </div>
        <footer><span>ZEXI · CODE & MUSIC</span><a href="#home">{zh ? '回到首页 ↑' : 'Back to top ↑'}</a></footer>
      </section>
    </main>
    <dialog ref={dialog} className="exhibit-dialog" onClose={() => setSelection(null)} onCancel={event=>{event.preventDefault();closeExhibit()}} aria-labelledby="detail-title">
      {selection!==null&&<ExhibitView index={selection} lang={lang} onSelect={openExhibit} onClose={closeExhibit}/>}
    </dialog>
  </>
}
