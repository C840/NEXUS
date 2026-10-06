import { motion, type Variants } from 'framer-motion'
import { Bot, FileSearch, Lightbulb, ListChecks, Link2, MessageSquareText } from 'lucide-react'
import { Panel } from '@/components/ui'
import { formatTime } from '@/lib/format'
import type { AssistantReply } from '@/types'
import { AnalystMark } from './AnalystMark'
import {
  ActionChecklist,
  EvidenceGrid,
  FollowUpChips,
  RecommendationList,
  ReferenceChips,
  RichText,
  SectionLabel,
} from './ReportSections'
import { splitParagraphs } from './utils'

const EASE = [0.22, 1, 0.36, 1] as const

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
}

interface AnalystReportProps {
  reply: AssistantReply
  /** Progressive section reveal — only for answers produced in this session. */
  reveal: boolean
  /** Follow-up suggestions are shown on the latest report only. */
  showFollowUps: boolean
  /** Disables follow-ups while another question is being analyzed. */
  busy: boolean
  onAsk: (question: string) => void
}

/** An assistant turn rendered as a structured analyst report. */
export function AnalystReport({ reply, reveal, showFollowUps, busy, onAsk }: AnalystReportProps) {
  const paragraphs = splitParagraphs(reply.content)
  const { evidence, actionsTaken, recommendations, references, followUps } = reply
  const hasResponse = actionsTaken.length > 0 || recommendations.length > 0

  return (
    <motion.article
      variants={container}
      initial={reveal ? 'hidden' : 'show'}
      animate="show"
      aria-label="Analyst report"
      className="flex gap-3.5"
    >
      <AnalystMark className="mt-0.5 hidden sm:grid" />
      <Panel as="div" className="min-w-0 flex-1 p-0">
        <div className="space-y-5 px-5 pt-4 pb-5">
          <motion.div variants={item} className="flex items-center gap-2.5">
            <AnalystMark size="sm" className="sm:hidden" />
            <p className="eyebrow text-cyan/80">Analyst report</p>
          </motion.div>

          <motion.div variants={item} className="max-w-3xl space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className={i === 0 ? 'text-[15px] leading-relaxed text-ink' : 'text-sm leading-relaxed text-ink-2'}>
                <RichText text={p} />
              </p>
            ))}
          </motion.div>

          {evidence.length > 0 && (
            <motion.section variants={item}>
              <SectionLabel icon={FileSearch} count={evidence.length}>
                Evidence
              </SectionLabel>
              <EvidenceGrid items={evidence} />
            </motion.section>
          )}

          {hasResponse && (
            <motion.div variants={item} className="grid gap-5 rounded-lg border border-line bg-base/40 p-4 md:grid-cols-2">
              {actionsTaken.length > 0 && (
                <section>
                  <SectionLabel icon={ListChecks}>Actions taken</SectionLabel>
                  <ActionChecklist items={actionsTaken} />
                </section>
              )}
              {recommendations.length > 0 && (
                <section>
                  <SectionLabel icon={Lightbulb}>Recommendations</SectionLabel>
                  <RecommendationList items={recommendations} />
                </section>
              )}
            </motion.div>
          )}

          {references.length > 0 && (
            <motion.section variants={item}>
              <SectionLabel icon={Link2} count={references.length}>
                References
              </SectionLabel>
              <ReferenceChips refs={references} />
            </motion.section>
          )}

          {showFollowUps && followUps.length > 0 && (
            <motion.section variants={item}>
              <SectionLabel icon={MessageSquareText}>Ask next</SectionLabel>
              <FollowUpChips items={followUps} onAsk={onAsk} disabled={busy} />
            </motion.section>
          )}
        </div>

        <motion.footer
          variants={item}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-5 py-2.5 font-mono text-[10.5px] text-faint"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Bot className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{reply.generatedBy}</span>
          </span>
          <time className="nums" dateTime={reply.timestamp}>
            {formatTime(reply.timestamp)}
          </time>
        </motion.footer>
      </Panel>
    </motion.article>
  )
}
