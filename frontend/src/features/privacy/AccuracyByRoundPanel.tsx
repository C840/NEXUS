import { useReducedMotion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { Panel, PanelHeader } from '@/components/ui'
import { chartTheme, palette } from '@/lib/theme'
import type { PrivacyStatus } from '@/types'
import { accuracyDomain, clientKindMeta, clientKinds, clientName, crossoverRound } from './utils'

/** Global vs local-only accuracy per training round. */
export function AccuracyByRoundPanel({ privacy }: { privacy: PrivacyStatus }) {
  const reduced = useReducedMotion()
  const rows = privacy.accuracyByRound
  const kinds = clientKinds(privacy.clients)
  const crossover = crossoverRound(rows, kinds)
  const last = rows.at(-1)

  return (
    <Panel>
      <PanelHeader
        eyebrow="Learning curve"
        title="Global model vs local-only models"
        description={
          crossover && last
            ? `From round ${crossover}, the shared global model outperforms every organization's local-only model — ${last.global.toFixed(1)}% after round ${last.round}.`
            : 'Accuracy of the global model and of each local-only model per round.'
        }
        icon={TrendingUp}
        iconTone="cyan"
      />
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} {...chartTheme.grid} />
          <XAxis dataKey="round" tickFormatter={(r: number) => `R${r}`} {...chartTheme.axis} />
          <YAxis domain={accuracyDomain(rows, kinds)} tickFormatter={(v: number) => `${v}%`} width={48} {...chartTheme.axis} />
          <Tooltip cursor={chartTheme.cursor} content={<ChartTooltip labelFormatter={(l) => `Round ${l}`} valueFormatter={(v) => `${v.toFixed(1)}%`} />} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono Variable, monospace', color: palette.muted }} />
          {crossover && <ReferenceLine x={crossover} stroke={palette.faint} strokeDasharray="3 5" label={{ value: 'global leads', fill: palette.muted, fontSize: 10, position: 'insideTopRight' }} />}
          {kinds.map((k) => (
            <Line
              key={k}
              dataKey={k}
              name={`${clientName(privacy.clients, k)} (local only)`}
              stroke={clientKindMeta[k].color}
              strokeWidth={1.25}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={!reduced}
            />
          ))}
          <Line dataKey="global" name="Global model (federated)" stroke={palette.cyan} strokeWidth={2.5} dot={false} isAnimationActive={!reduced} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  )
}
