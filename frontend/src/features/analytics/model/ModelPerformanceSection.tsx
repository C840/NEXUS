import { motion } from 'framer-motion'
import { Crosshair, FlaskConical, Gauge, ScanSearch, Sigma } from 'lucide-react'
import { Badge, MetricCard, Panel } from '@/components/ui'
import type { ModelPerformance } from '@/types'
import { ApproachComparison } from './ApproachComparison'
import { ConfusionMatrix } from './ConfusionMatrix'
import { RocCurve } from './RocCurve'

const pct = (n: number) => n.toFixed(1)

/** Explains, from the data, why combining the two detection families helps. */
function WhyHybrid({ model }: { model: ModelPerformance }) {
  const [traditional, anomaly, hybrid] = model.comparison
  if (!traditional || !anomaly || !hybrid) return null
  const cards = [
    { title: traditional.approach, tone: 'text-muted', body: `Precise on known attacks (${pct(traditional.precision)}% precision) but misses novel ones — recall drops to ${pct(traditional.recall)}%.` },
    { title: anomaly.approach, tone: 'text-blue', body: `Flags unfamiliar behavior (${pct(anomaly.recall)}% recall) at the cost of more false alarms — precision falls to ${pct(anomaly.precision)}%.` },
    { title: hybrid.approach, tone: 'text-cyan', body: `Uses the classifier for known classes and the anomaly detector for the unknown: ${pct(hybrid.precision)}% precision with ${pct(hybrid.recall)}% recall (F1 ${pct(hybrid.f1)}).` },
  ]
  return (
    <Panel className="flex flex-col gap-3">
      <p className="eyebrow">Why a hybrid detector</p>
      {cards.map((c) => (
        <div key={c.title} className="rounded-lg border border-line bg-surface-2/50 px-3.5 py-3">
          <p className={`text-[13px] font-medium ${c.tone}`}>{c.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{c.body}</p>
        </div>
      ))}
      <p className="mt-auto text-[11px] leading-relaxed text-faint">These numbers illustrate the expected trade-off in a simulated evaluation — they are not experimental results.</p>
    </Panel>
  )
}

/** AI MODEL PERFORMANCE — research section, explicitly labelled as simulated. */
export function ModelPerformanceSection({ model }: { model: ModelPerformance }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="mt-10 border-t border-line pt-8"
      aria-labelledby="model-performance-title"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2 text-violet-soft">AI model performance · research</p>
          <h2 id="model-performance-title" className="font-display text-2xl font-medium tracking-tight text-ink">
            Detection model evaluation
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">How the hybrid NEXUS detector compares with signature-only and anomaly-only detection.</p>
        </div>
        {model.isSimulated && (
          <Badge tone="violet" variant="outline" size="md" icon={FlaskConical}>
            Prototype metrics · simulated evaluation
          </Badge>
        )}
      </div>

      {model.isSimulated && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-violet/25 bg-violet/[0.06] px-4 py-3">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-violet-soft" aria-hidden />
          <p className="text-[13px] leading-relaxed text-ink-2">{model.disclaimer}</p>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Accuracy" value={model.metrics.accuracy} format={pct} unit="%" icon={Gauge} tone="cyan" caption="correct over all classes" />
        <MetricCard label="Precision" value={model.metrics.precision} format={pct} unit="%" icon={Crosshair} tone="cyan" caption="flagged that were real · macro" />
        <MetricCard label="Recall" value={model.metrics.recall} format={pct} unit="%" icon={ScanSearch} tone="cyan" caption="real attacks caught · macro" />
        <MetricCard label="F1 score" value={model.metrics.f1} format={pct} unit="%" icon={Sigma} tone="violet" caption="harmonic mean of P and R" />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ApproachComparison approaches={model.comparison} />
        <WhyHybrid model={model} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <ConfusionMatrix labels={model.confusionLabels} matrix={model.confusionMatrix} />
        <RocCurve points={model.rocCurve} auc={model.auc} />
      </div>
    </motion.section>
  )
}
