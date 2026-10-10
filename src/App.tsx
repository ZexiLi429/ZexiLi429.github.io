import { Globe2, Mail } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import { Button } from './components/ui/button'
import { cn } from './lib/utils'
import { StudioExperience } from './components/studio-experience'

const StarfieldBackground = lazy(() =>
  import('./components/starfield-background').then((module) => ({
    default: module.StarfieldBackground,
  })),
)

type Language = 'zh' | 'en'

const content = {
  zh: {
    nav: ['首页', '关于', '机器人与AI项目', '音乐创作', '简历'],
    headingStart: '你好呀，我是',
    name: '李泽曦',
    headingEnd: '',
    subtext:
      '24岁 | 天津大学软件工程 & 布里斯托大学机器人学硕士。专注于 LLM 智能体、机器视觉与全栈开发。在喧嚣中，用代码构建智能，用音乐记录生活。',
    contact: '联系我 / Contact',
    heroCta: 'Let\'s Connect / 给我发邮件',
    toggle: 'EN / 中文',
    badge: 'LLM 智能体 / 机器视觉 / 全栈',
  },
  en: {
    nav: ['Home', 'About', 'Robotics & AI', 'Music', 'Resume'],
    headingStart: 'Hello there, I am',
    name: 'Li Zexi',
    headingEnd: '',
    subtext:
      '24 y/o | Software Engineering @ TJU & MSc Robotics @ Bristol. Focused on AI Agents, Computer Vision, and Full-Stack dev. Building intelligence through code, capturing life through music.',
    contact: 'Contact',
    heroCta: "Let's Connect / 给我发邮件",
    toggle: 'EN / 中文',
    badge: 'AI Agents / Computer Vision / Full-Stack',
  },
} as const

const videoUrl =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4'
const wechatPosterUrl = '/hero-wechat-poster-v2.jpg?v=20260602'

export default function App() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh')
  const [usePosterFallback, setUsePosterFallback] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isZh = lang === 'zh'
  const t = content[lang]

  useEffect(() => {
    const isWeChat = /MicroMessenger/i.test(window.navigator.userAgent)
    if (isWeChat) {
      setUsePosterFallback(true)
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    video.setAttribute('x5-playsinline', 'true')
    video.setAttribute('x5-video-player-type', 'h5-page')
    video.setAttribute('x5-video-player-fullscreen', 'false')
    video.setAttribute('x5-video-orientation', 'portrait')

    const tryPlay = () => {
      void video.play().catch(() => {
        // WeChat may delay autoplay permission until bridge events fire.
      })
    }

    tryPlay()
    video.addEventListener('loadeddata', tryPlay)
    document.addEventListener('WeixinJSBridgeReady', tryPlay as EventListener)
    document.addEventListener('YixinJSBridgeReady', tryPlay as EventListener)

    return () => {
      video.removeEventListener('loadeddata', tryPlay)
      document.removeEventListener('WeixinJSBridgeReady', tryPlay as EventListener)
      document.removeEventListener('YixinJSBridgeReady', tryPlay as EventListener)
    }
  }, [])

  return (
    <>
    <div id="home" className="hero-stage relative min-h-[100svh] bg-background text-foreground">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={wechatPosterUrl}
        className="absolute inset-0 z-0 h-full w-full object-cover object-[center_78%] sm:object-center"
        src={videoUrl}
        onError={() => setUsePosterFallback(true)}
        style={{ opacity: usePosterFallback ? 0 : 1 }}
      />
      {usePosterFallback ? (
        <img
          src={wechatPosterUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full object-cover object-[center_78%] sm:object-center"
        />
      ) : null}
      <Suspense fallback={null}>
        <StarfieldBackground />
      </Suspense>

      <div className="absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_50%_-8%,rgba(196,232,255,0.14),transparent_34%),radial-gradient(ellipse_at_18%_10%,rgba(84,209,214,0.12),transparent_26%),radial-gradient(ellipse_at_82%_16%,rgba(160,214,255,0.1),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.14),rgba(2,6,23,0.54)_58%,rgba(2,6,23,0.36))]" />

      <div className="hero-sticky relative z-10 flex min-h-[100svh] flex-col">
        <header className="relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 pb-4 pt-5 sm:px-6 md:flex-nowrap md:px-8 md:py-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <a
              href="https://github.com/ZexiLi429"
              target="_blank"
              rel="noreferrer"
              className={cn(
                'text-2xl tracking-tight text-foreground sm:text-3xl',
                isZh ? 'font-displayZh' : 'font-displayEn',
              )}
            >
              Zexi<sup className="text-xs">®</sup>
            </a>

            <nav className="flex min-w-0 items-center gap-3 overflow-x-auto whitespace-nowrap md:hidden [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {t.nav.map((item, index) => (
                <a
                  key={`${item}-mobile-inline`}
                  href={`#${['home', 'about', 'projects', 'music', 'resume'][index]}`}
                  className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {t.nav.map((item, index) => (
              <a
                key={item}
                href={`#${['home', 'about', 'projects', 'music', 'resume'][index]}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3 md:order-none">
            <Button
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setLang((current) => (current === 'zh' ? 'en' : 'zh'))}
              aria-label="Toggle language"
              className="shrink-0 px-3 py-1.5 text-xs text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_10px_28px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:px-4 sm:py-1.5 sm:text-sm"
            >
              <Globe2 className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
              {t.toggle}
            </Button>

            <Button variant="glass" asChild className="min-w-0 px-3.5 py-1.5 text-xs text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_10px_28px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:px-6 sm:py-2.5 sm:text-sm">
              <a href="mailto:76321278@qq.com">{t.contact}</a>
            </Button>
          </div>
        </header>

        <main className="original-intro relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-start px-4 pb-14 pt-14 text-center sm:justify-center sm:px-6 sm:pb-20 sm:pt-14 md:px-8 md:pb-24 md:pt-16">
          <div className="liquid-glass animate-rise rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:px-5 sm:text-xs sm:tracking-[0.24em]">
            {t.badge}
          </div>

          <h1
            className={cn(
              'mt-7 max-w-[13ch] text-[clamp(2.6rem,9vw,7rem)] font-normal leading-[0.92] tracking-[-0.04em] text-foreground animate-rise [animation-delay:120ms] sm:mt-10 md:max-w-[14ch]',
              isZh ? 'font-displayZh' : 'font-displayEn',
            )}
          >
            <span className="block">{t.headingStart}</span>
            <em className="mt-2 block not-italic text-muted-foreground sm:mt-3">{t.name}</em>
            <span className="block">{t.headingEnd}</span>
          </h1>

          <p className="mt-6 max-w-[42rem] animate-rise text-sm leading-7 text-muted-foreground [animation-delay:240ms] sm:mt-8 sm:text-base md:text-lg">
            {t.subtext}
          </p>

          <div className="mt-10 flex w-full animate-rise flex-col items-center gap-4 [animation-delay:360ms] sm:mt-12 sm:w-auto sm:flex-row">
            <Button variant="glass" size="lg" asChild className="w-full max-w-sm px-8 py-4 text-sm sm:w-auto sm:max-w-none sm:px-14 sm:py-5 sm:text-base">
              <a href="mailto:76321278@qq.com" className="justify-center">
                <Mail className="mr-2 h-4 w-4" />
                {t.heroCta}
              </a>
            </Button>
          </div>
        </main>
        <div className="hello-bubble" aria-hidden="true">{isZh ? '大家好呀' : 'Hi there!'}<span>✦</span></div>
        <a className="scroll-invitation" href="#about"><span>{isZh ? '向下滚动，来我的工作室坐坐' : 'Scroll into my studio'}</span><span aria-hidden="true">↓</span></a>
      </div>
    </div>
    <StudioExperience lang={lang} onToggleLanguage={() => setLang(current => current === 'zh' ? 'en' : 'zh')} />
    </>
  )
}
