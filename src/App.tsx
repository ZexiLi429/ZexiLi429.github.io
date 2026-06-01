import { Globe2, Mail } from 'lucide-react'
import { useState } from 'react'

import { Button } from './components/ui/button'
import { cn } from './lib/utils'

type Language = 'zh' | 'en'

const content = {
  zh: {
    nav: ['首页', '关于', '机器人与AI项目', '音乐创作', '简历'],
    headingStart: '你好呀，我是',
    name: '李泽曦',
    headingEnd: '。',
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
    headingEnd: '.',
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

export default function App() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh')
  const isZh = lang === 'zh'
  const t = content[lang]

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover"
        src={videoUrl}
      />

      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(103,188,255,0.14),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.72))]" />
      <div className="absolute inset-x-0 top-[-20%] z-0 mx-auto h-[30rem] w-[30rem] rounded-full bg-[rgba(125,211,252,0.10)] blur-3xl animate-drift" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-6">
          <a
            href="https://github.com/ZexiLi429"
            target="_blank"
            rel="noreferrer"
            className={cn(
              'text-3xl tracking-tight text-foreground',
              isZh ? 'font-displayZh' : 'font-displayEn',
            )}
          >
            Zexi<sup className="text-xs">®</sup>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {t.nav.map((item) => (
              <a
                key={item}
                href="https://github.com/ZexiLi429"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setLang((current) => (current === 'zh' ? 'en' : 'zh'))}
              aria-label="Toggle language"
            >
              <Globe2 className="mr-2 h-4 w-4" />
              {t.toggle}
            </Button>

            <Button variant="glass" asChild>
              <a href="mailto:76321278@qq.com">{content.zh.contact}</a>
            </Button>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-40 pt-32 py-[90px] text-center">
          <div className="liquid-glass animate-rise rounded-full px-5 py-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {t.badge}
          </div>

          <h1
            className={cn(
              'mt-10 max-w-7xl text-5xl font-normal leading-[0.95] tracking-tight text-foreground sm:text-7xl md:text-8xl animate-rise [animation-delay:120ms]',
              isZh ? 'font-displayZh' : 'font-displayEn',
            )}
          >
            {t.headingStart}{' '}
            <em className="not-italic text-muted-foreground">{t.name}</em>
            {t.headingEnd}
          </h1>

          <p className="mt-8 max-w-2xl animate-rise text-base leading-relaxed text-muted-foreground [animation-delay:240ms] sm:text-lg">
            {t.subtext}
          </p>

          <div className="mt-12 flex animate-rise flex-col items-center gap-4 [animation-delay:360ms] sm:flex-row">
            <Button variant="glass" size="lg" asChild>
              <a href="mailto:76321278@qq.com">
                <Mail className="mr-2 h-4 w-4" />
                {t.heroCta}
              </a>
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}