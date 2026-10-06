import { Grid3x3 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { palette, withAlpha } from '@/lib/theme'
import { Panel, PanelHeader } from '@/components/ui'

interface ConfusionMatrixProps {
  labels: string[]
  matrix: number[][]
}

/** Rows = actual class, columns = predicted. Diagonal = correct; shading is row-normalized. */
export function ConfusionMatrix({ labels, matrix }: ConfusionMatrixProps) {
  const rowTotals = matrix.map((row) => row.reduce((a, b) => a + b, 0))
  return (
    <Panel>
      <PanelHeader
        eyebrow="Per-class results"
        title="Confusion matrix"
        description="Rows are the true class, columns the predicted class. Cyan cells are correct; red cells are errors."
        icon={Grid3x3}
        iconTone="cyan"
      />
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-center">
          <thead>
            <tr>
              <th className="w-24 text-left text-[9.5px] font-normal text-faint font-medium">Actual ↓ / Pred →</th>
              {labels.map((l) => (
                <th key={l} className="px-1 pb-1 font-mono text-[10px] font-normal tracking-wide text-muted">
                  {l}
                </th>
              ))}
              <th className="pb-1 font-mono text-[10px] font-normal tracking-wide text-muted">Recall</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={labels[i]}>
                <th scope="row" className="pr-2 text-left text-[12px] font-normal text-ink-2">
                  {labels[i]}
                </th>
                {row.map((value, j) => {
                  const share = rowTotals[i] ? value / rowTotals[i] : 0
                  const diagonal = i === j
                  const alpha = diagonal ? 0.12 + share * 0.5 : value === 0 ? 0 : Math.min(0.55, 0.08 + Math.sqrt(share) * 0.9)
                  return (
                    <td
                      key={j}
                      title={`${labels[i]} predicted as ${labels[j]}: ${value.toLocaleString('en-US')} (${(share * 100).toFixed(1)}%)`}
                      className={cn('nums h-10 rounded-md font-mono text-[11.5px]', diagonal ? 'font-medium text-ink' : value === 0 ? 'text-faint/60' : 'text-ink-2')}
                      style={{ background: diagonal ? withAlpha(palette.cyan, alpha) : value === 0 ? withAlpha(palette.surface3, 0.6) : withAlpha(palette.critical, alpha) }}
                    >
                      {value.toLocaleString('en-US')}
                    </td>
                  )
                })}
                <td className="nums font-mono text-[11.5px] text-cyan">{rowTotals[i] ? ((row[i] / rowTotals[i]) * 100).toFixed(1) : '—'}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
