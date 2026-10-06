import { useId, useState } from 'react'
import { Bot, ShieldCheck, UserCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { threatStatusMeta } from '@/lib/severity'
import { Badge, Panel, PanelHeader, Skeleton } from '@/components/ui'
import { nexusActions, useSettings } from '@/store'
import type { DefenseSettings } from '@/types'
import { DefenseStatusStrip } from './DefenseStatusStrip'
import { ModeCard, type ModeCardProps } from './ModeCard'

type ModeCopy = Pick<ModeCardProps, 'title' | 'summary' | 'message' | 'messageTone' | 'icon' | 'tone' | 'points'>

function modeCopy(s: DefenseSettings): { autonomous: ModeCopy; manual: ModeCopy } {
  return {
    autonomous: {
      title: 'Autonomous mode',
      summary: 'NEXUS detects, decides and responds on its own, within the response policy.',
      message: 'Threat detected. Mitigation automatically executed.',
      messageTone: 'safe',
      icon: Bot,
      tone: 'cyan',
      points: [
        `Threats with risk ≥ ${s.autoResponseThreshold} are contained without waiting for a human`,
        `Internal devices are quarantined at risk ≥ ${s.quarantineThreshold}`,
        'Every executed action is recorded on the threat, next to the explanation behind it',
      ],
    },
    manual: {
      title: 'Manual mode',
      summary: 'NEXUS detects and recommends; an administrator approves every containment action.',
      message: 'Threat detected. Waiting for administrator approval.',
      messageTone: 'high',
      icon: UserCheck,
      tone: 'high',
      points: [
        'Detection, risk scoring and explanations keep running continuously',
        'Responses are recommended, never executed, until an administrator approves them',
        `Threats with risk ≥ ${s.autoResponseThreshold} wait in “${threatStatusMeta.awaiting_approval.label}” for a decision`,
      ],
    },
  }
}

/** AUTONOMOUS MODE vs MANUAL MODE — shares state with the sidebar toggle via the store. */
export function AutonomousDefensePanel({ className }: { className?: string }) {
  const settings = useSettings()
  const layoutId = useId()
  const [switchingTo, setSwitchingTo] = useState<boolean | null>(null)

  const select = async (autonomousMode: boolean) => {
    if (!settings || settings.autonomousMode === autonomousMode || switchingTo !== null) return
    setSwitchingTo(autonomousMode)
    try {
      await nexusActions.setAutonomousMode(autonomousMode)
    } catch (err) {
      nexusActions.notify({
        tone: 'critical',
        title: "Couldn't switch defense mode",
        message: err instanceof Error ? err.message : 'The NEXUS backend rejected the change.',
      })
    } finally {
      setSwitchingTo(null)
    }
  }

  const autonomous = settings?.autonomousMode ?? true
  const copy = settings ? modeCopy(settings) : null

  return (
    <Panel className={cn('@container', className)}>
      <PanelHeader
        eyebrow="Autonomous defense"
        title="Defense mode"
        description="Choose whether NEXUS executes containment itself or waits for an administrator. Kept in sync with the sidebar toggle."
        icon={ShieldCheck}
        actions={
          settings && (
            <Badge tone={autonomous ? 'cyan' : 'high'} size="md" dot pulse={autonomous}>
              {autonomous ? 'Autonomous · On' : 'Manual · Off'}
            </Badge>
          )
        }
      />

      {copy ? (
        <>
          <div role="group" aria-label="Defense mode" className="grid gap-4 @xl:grid-cols-2">
            {([true, false] as const).map((isAutonomous) => (
              <ModeCard
                key={String(isAutonomous)}
                {...(isAutonomous ? copy.autonomous : copy.manual)}
                selected={autonomous === isAutonomous}
                busy={switchingTo === isAutonomous}
                disabled={switchingTo !== null && switchingTo !== isAutonomous}
                layoutId={layoutId}
                onSelect={() => void select(isAutonomous)}
              />
            ))}
          </div>
          {settings && <DefenseStatusStrip settings={settings} />}
        </>
      ) : (
        <div className="grid gap-4 @xl:grid-cols-2" aria-busy>
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      )}
    </Panel>
  )
}
