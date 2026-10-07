import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Activity, AlertTriangle, BrainCircuit, Cpu, FlaskConical, Play, Radio, RefreshCw, ShieldCheck, Square, Wifi, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  KeyValueList,
  Meter,
  MetricCard,
  Panel,
  PanelHeader,
  RiskBadge,
  Select,
  ThreatStatusBadge,
  type Column,
} from '@/components/ui'
import { useApiQuery } from '@/hooks/useApiQuery'
import { formatBytes, formatCompact, formatRelative, humanize } from '@/lib/format'
import type { Tone } from '@/lib/theme'
import { api } from '@/services'
import { nexusActions } from '@/store/nexusStore'
import { useThreats } from '@/store/hooks'
import type { LiveHost, LivePhase, LiveStatus } from '@/types'

const POLL_MS = 2000

const PHASE_META: Record<LivePhase, { label: string; tone: Tone; detail: string }> = {
  stopped: { label: 'Stopped', tone: 'neutral', detail: 'Capture is off. Dashboard traffic falls back to the simulation engine.' },
  training: { label: 'Training', tone: 'violet', detail: 'Fitting the Isolation Forest and XGBoost models…' },
  warming_up: {
    label: 'Learning baseline',
    tone: 'cyan',
    detail: 'Recording how this network normally behaves. Alerts start once the baseline is complete and the models are retrained on it.',
  },
  detecting: { label: 'Detecting', tone: 'safe', detail: 'Every 5 s host window is scored by the anomaly detector and classifier; detections are explained with SHAP.' },
}

const LABEL_TONE: Record<string, Tone> = { benign: 'safe', port_scan: 'high', brute_force: 'high', dns_anomaly: 'medium', ddos: 'critical' }

const HOST_COLUMNS: Column<LiveHost>[] = [
  {
    key: 'ip',
    header: 'Host',
    render: (h) => (
      <span className="flex items-center gap-2 font-mono text-xs text-ink">
        {h.ip}
        <Badge tone={h.local ? 'blue' : 'neutral'} variant="outline">
          {h.local ? 'LAN' : 'WAN'}
        </Badge>
      </span>
    ),
    sortValue: (h) => h.ip,
  },
  { key: 'out', header: 'Out pkt/s', align: 'right', render: (h) => <span className="font-mono text-xs">{h.outPps.toFixed(1)}</span>, sortValue: (h) => h.outPps },
  { key: 'in', header: 'In pkt/s', align: 'right', render: (h) => <span className="font-mono text-xs">{h.inPps.toFixed(1)}</span>, sortValue: (h) => h.inPps },
  { key: 'ports', header: 'Dst ports', align: 'right', render: (h) => <span className="font-mono text-xs">{h.uniqDstPorts}</span>, sortValue: (h) => h.uniqDstPorts, visibility: 'hidden md:table-cell' },
  { key: 'peers', header: 'Dst hosts', align: 'right', render: (h) => <span className="font-mono text-xs">{h.uniqDstIps}</span>, sortValue: (h) => h.uniqDstIps, visibility: 'hidden md:table-cell' },
  { key: 'dns', header: 'DNS/s', align: 'right', render: (h) => <span className="font-mono text-xs">{h.dnsRate.toFixed(2)}</span>, sortValue: (h) => h.dnsRate, visibility: 'hidden lg:table-cell' },
  {
    key: 'anomaly',
    header: 'Anomaly',
    width: 'w-40',
    render: (h) => (
      <span className="flex items-center gap-2">
        <Meter value={h.anomaly * 100} size="xs" tone={h.anomaly >= 0.72 ? 'high' : h.anomaly >= 0.45 ? 'medium' : 'cyan'} className="w-20" />
        <span className="font-mono text-xs text-muted">{h.anomaly.toFixed(2)}</span>
      </span>
    ),
    sortValue: (h) => h.anomaly,
  },
  {
    key: 'label',
    header: 'Classifier',
    render: (h) => <Badge tone={LABEL_TONE[h.label] ?? 'neutral'}>{humanize(h.label)}</Badge>,
    sortValue: (h) => h.label,
  },
]

/** Live Capture — real packets from this machine's network interface, scored by trained models. */
export default function LiveCapturePage() {
  const query = useApiQuery(() => api.getLiveStatus(), [])
  const [status, setStatus] = useState<LiveStatus>()
  const [busy, setBusy] = useState<'start' | 'stop' | 'train' | 'test' | null>(null)
  const navigate = useNavigate()
  const allowlist = useApiQuery(() => api.getAllowlist(), [])
  const [iface, setIface] = useState<string>('')
  const threats = useThreats()

  useEffect(() => {
    if (query.data) setStatus(query.data)
  }, [query.data])

  useEffect(() => {
    const id = window.setInterval(() => {
      api.getLiveStatus().then(setStatus).catch(() => {})
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [])

  const detections = useMemo(() => {
    if (!status) return []
    const byId = new Map(threats.map((t) => [t.id, t]))
    return status.detections.map((id) => byId.get(id)).filter((t) => t !== undefined)
  }, [status, threats])

  if (!status && query.loading) return <PageSkeleton />
  if (!status) return <ErrorState message={query.error?.message} onRetry={query.refetch} />

  const phase = PHASE_META[status.phase]
  const selected = iface || status.interface
  const run = async (kind: 'start' | 'stop' | 'train') => {
    setBusy(kind)
    try {
      const next = kind === 'start' ? await api.startLive(selected) : kind === 'stop' ? await api.stopLive() : await api.retrainLive()
      setStatus(next)
      if (kind === 'train') nexusActions.notify({ tone: 'success', title: 'Models retrained', message: `Holdout accuracy ${next.model.holdoutAccuracy.toFixed(1)}%` })
    } catch (err) {
      nexusActions.notify({ tone: 'critical', title: `Could not ${kind === 'train' ? 'retrain' : kind} capture`, message: err instanceof Error ? err.message : String(err) })
      query.refetch()
    } finally {
      setBusy(null)
    }
  }

  const runTest = async () => {
    setBusy('test')
    try {
      const { threatId } = await api.runLiveTest('port_scan')
      nexusActions.notify({ tone: 'success', title: 'Test detection raised', message: `${threatId} — opening the investigation.` })
      navigate(`/threats/${threatId}`)
    } catch (err) {
      nexusActions.notify({ tone: 'critical', title: 'Test did not raise a detection', message: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(null)
    }
  }

  const unallow = async (ip: string) => {
    try {
      await api.removeFromAllowlist(ip)
      allowlist.refetch()
    } catch (err) {
      nexusActions.notify({ tone: 'critical', title: 'Could not remove host', message: err instanceof Error ? err.message : String(err) })
    }
  }

  const baselinePct = Math.min(100, (status.baselineWindows / status.requiredWindows) * 100)
  const uptime = status.startedAt ? formatRelative(status.startedAt).replace(' ago', '') : '—'

  return (
    <>
      <PageHeader
        eyebrow="Real detection"
        title="Live Capture"
        description="Packet headers captured on this machine are grouped into 5-second host windows, scored by an Isolation Forest and an XGBoost classifier, and explained with SHAP."
        meta={
          <>
            <Badge tone={phase.tone} dot pulse={status.running} size="md">
              {phase.label}
            </Badge>
            <Badge tone="neutral" variant="outline" size="md" icon={Wifi}>
              {status.interface}
            </Badge>
            <Badge tone="neutral" variant="outline" size="md">
              Headers only · payloads never stored
            </Badge>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {status.interfaces.length > 0 && !status.running && (
              <Select
                aria-label="Capture interface"
                value={selected}
                options={[...new Set([status.interface, ...status.interfaces])].map((i) => ({ value: i, label: i }))}
                onChange={setIface}
              />
            )}
            {status.running ? (
              <Button variant="danger" icon={Square} loading={busy === 'stop'} onClick={() => void run('stop')}>
                Stop capture
              </Button>
            ) : (
              <Button variant="primary" icon={Play} loading={busy === 'start'} disabled={!status.available} onClick={() => void run('start')}>
                Start capture
              </Button>
            )}
            <Button variant="outline" icon={RefreshCw} loading={busy === 'train' || status.phase === 'training'} onClick={() => void run('train')}>
              Retrain
            </Button>
            <Button
              variant="secondary"
              icon={FlaskConical}
              loading={busy === 'test'}
              disabled={!status.model.ready && !status.available}
              title="Feeds a recorded port-scan pattern to the live models. No packets are sent on your network."
              onClick={() => void runTest()}
            >
              Test detection
            </Button>
          </div>
        }
      />

      {!status.available && (
        <Panel tone="medium" className="mb-5">
          <PanelHeader
            icon={AlertTriangle}
            iconTone="medium"
            eyebrow="Capture driver required"
            title="Packet capture is not available on this machine yet"
            description={status.reason ?? 'No capture driver found.'}
          />
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ink-2">
            <li>
              Download and run the Npcap installer from <span className="font-mono text-cyan">npcap.com</span>.
            </li>
            <li>
              Tick <span className="text-ink">“Install Npcap in WinPcap API-compatible mode”</span>. Leave “Restrict driver access to Administrators” unticked.
            </li>
            <li>
              Restart the backend (<span className="font-mono">npm run dev</span>). Capture starts automatically on <span className="font-mono">{status.interface}</span>.
            </li>
          </ol>
          <p className="mt-3 text-xs text-faint">Until then every other page keeps running on the simulation engine.</p>
        </Panel>
      )}
      {status.available && status.reason && !status.running && (
        <Panel tone="high" className="mb-5">
          <PanelHeader icon={AlertTriangle} iconTone="high" eyebrow="Capture error" title="The last capture attempt failed" description={status.reason} />
        </Panel>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Packets captured" value={status.packets} format={formatCompact} icon={Radio} tone="cyan" caption={`${formatBytes(status.bytes)} of headers analysed`} />
        <MetricCard label="Current rate" value={status.pps} format={(n) => n.toFixed(0)} unit="pkt/s" icon={Activity} tone="blue" caption={status.running ? `running for ${uptime}` : 'capture stopped'} />
        <MetricCard label="Hosts in window" value={status.hosts.length} icon={Cpu} tone="violet" caption={`${status.windows} windows scored`} />
        <MetricCard
          label="Live detections"
          value={detections.length}
          icon={AlertTriangle}
          tone={detections.length ? 'high' : 'safe'}
          emphasize={detections.length > 0}
          caption="raised from real traffic this session"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel>
          <PanelHeader eyebrow="Pipeline" title={phase.label} description={phase.detail} icon={Activity} iconTone={phase.tone} />
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between text-xs">
              <span className="eyebrow">Network baseline</span>
              <span className="font-mono text-muted">
                {Math.min(status.baselineWindows, status.requiredWindows)} / {status.requiredWindows} host-windows
              </span>
            </div>
            <Meter value={baselinePct} tone={baselinePct >= 100 ? 'safe' : 'cyan'} size="sm" />
            <p className="mt-2 text-xs text-faint">
              {status.model.benignSource === 'live'
                ? 'Models are trained on this network’s own benign traffic.'
                : 'Until the baseline completes, models use a generic benign profile and alerts are held back to avoid false positives.'}
            </p>
          </div>
          <ol className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {['Scapy capture', '5 s host features', 'Isolation Forest + XGBoost', 'SHAP + response'].map((step, i) => (
              <li key={step} className="rounded-lg border border-line bg-surface-2/50 px-3 py-2 text-ink-2">
                <span className="mr-1.5 font-mono text-faint">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Detection models" title="Trained on this machine" icon={BrainCircuit} iconTone="violet" />
          <KeyValueList
            className="mt-4"
            items={[
              { label: 'Status', value: status.model.ready ? 'Ready' : 'Not trained' },
              { label: 'Benign baseline', value: status.model.benignSource === 'live' ? `This network · ${status.model.benignRows} windows` : `Generic profile · ${status.model.benignRows} windows` },
              { label: 'Holdout accuracy', value: `${status.model.holdoutAccuracy.toFixed(1)}%`, mono: true },
              { label: 'Macro F1', value: `${status.model.holdoutMacroF1.toFixed(1)}%`, mono: true },
              { label: 'Classes', value: status.model.classes.map(humanize).join(' · ') },
              { label: 'Trained', value: status.model.trainedAt ? formatRelative(status.model.trainedAt) : '—' },
            ]}
          />
          <p className="mt-4 rounded-lg border border-line bg-surface-2/40 px-3 py-2 text-[11px] leading-relaxed text-faint">
            Research prototype: benign traffic is real, attack classes are learned from synthetic attack profiles injected on top of it, and holdout
            scores are measured on that mix — not a benchmark. Enforcement (blocking) is simulated.
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel flush>
          <div className="p-5 pb-3">
            <PanelHeader eyebrow="Last window" title="Active hosts" description="Busiest hosts in the most recent 5 s window, with their anomaly score and predicted class." icon={Cpu} />
          </div>
          <DataTable
            columns={HOST_COLUMNS}
            rows={status.hosts}
            rowKey={(h) => h.ip}
            initialSort={{ key: 'anomaly', dir: 'desc' }}
            itemLabel="hosts"
            rowClassName={(h) => (h.anomaly >= 0.72 ? 'bg-high/5' : undefined)}
            empty={<EmptyState icon={Radio} title={status.running ? 'Waiting for the first window…' : 'No capture running'} description="Hosts appear here every 5 seconds while capture is on." />}
          />
        </Panel>

        <Panel>
          <PanelHeader eyebrow="From real traffic" title="Live detections" description="Threats raised by the trained models. Open one to see its SHAP explanation." icon={AlertTriangle} iconTone="high" />
          <ul className="mt-4 space-y-2">
            {detections.length === 0 && (
              <EmptyState icon={BrainCircuit} title="No live detections" description="Normal traffic stays quiet. Detections need ≥ 90% classifier confidence and an anomalous window." />
            )}
            {detections.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/threats/${t.id}`}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface-2/40 px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{t.name}</span>
                    <span className="block truncate font-mono text-[11px] text-faint">
                      {t.id} · {t.sourceLabel} · {formatRelative(t.timestamp)}
                    </span>
                  </span>
                  <RiskBadge score={t.riskScore} />
                  <ThreatStatusBadge status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelHeader
          title="Allowlisted hosts"
          description="Hosts you marked as false positives. They are still scored and shown, but never raise alerts."
          icon={ShieldCheck}
          iconTone="safe"
        />
        {allowlist.data && allowlist.data.length > 0 ? (
          <ul className="divide-y divide-line">
            {allowlist.data.map((a) => (
              <li key={a.ip} className="flex items-center gap-3 py-2.5">
                <span className="font-mono text-xs text-ink">{a.ip}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{a.reason}</span>
                <span className="hidden text-xs text-faint sm:inline">{formatRelative(a.added * 1000)}</span>
                <Button variant="ghost" size="xs" icon={X} onClick={() => void unallow(a.ip)} aria-label={`Remove ${a.ip} from the allowlist`}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No hosts yet. Use “False positive” on a live detection to add one.</p>
        )}
      </Panel>
    </>
  )
}
