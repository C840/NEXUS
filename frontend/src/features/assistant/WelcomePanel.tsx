import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { NetworkMesh } from '@/components/layout/NetworkMesh'
import { Panel } from '@/components/ui'
import { AnalystMark } from './AnalystMark'
import { SUGGESTED_QUESTIONS } from './suggestions'

interface WelcomePanelProps {
  onAsk: (question: string) => void
  disabled: boolean
}

/** Empty conversation: what the analyst does + the spec's starter questions. */
export function WelcomePanel({ onAsk, disabled }: WelcomePanelProps) {
  const reduced = useReducedMotion()
  return (
    <Panel className="overflow-hidden p-0">
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-fade opacity-50">
          <NetworkMesh density={0.4} intensity={0.55} />
        </div>
        <div className="relative px-6 pt-8 pb-7 sm:px-8">
          <AnalystMark size="lg" />
          <p className="eyebrow mt-5 text-cyan/80">Analyst ready</p>
          <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">Ask NEXUS about your network</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            The analyst answers from the same threat records, device inventory and event stream shown across NEXUS. Every
            answer lists the evidence behind it, the actions already taken and what to do next — with links to the
            underlying records.
          </p>
        </div>
      </div>

      <div className="border-t border-line px-6 py-5 sm:px-8">
        <p className="eyebrow mb-3">Suggested investigations</p>
        <ul className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
          {SUGGESTED_QUESTIONS.map(({ question, topic, icon: Icon }, i) => (
            <motion.li
              key={question}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAsk(question)}
                className="group flex h-full w-full items-start gap-3 rounded-xl border border-line bg-surface-2/50 p-3.5 text-left transition-colors hover:border-cyan/30 hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-cyan/20 bg-cyan/10">
                  <Icon className="size-4 text-cyan" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="eyebrow block text-[9.5px]">{topic}</span>
                  <span className="mt-1.5 block text-[13.5px] leading-snug text-ink-2 transition-colors group-hover:text-ink">
                    {question}
                  </span>
                </span>
                <ArrowUpRight
                  className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-cyan"
                  strokeWidth={1.9}
                  aria-hidden
                />
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}
