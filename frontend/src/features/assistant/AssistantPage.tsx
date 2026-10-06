import { ListChecks, MessageSquarePlus, Radio, ScanSearch } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button } from '@/components/ui'
import { CompactContext, ContextRail } from './ContextRail'
import { ConversationPanel } from './ConversationPanel'
import { useAssistantConversation } from './useAssistantConversation'
import { useDeepLinkQuestion } from './useDeepLinkQuestion'

function CapabilityChips() {
  return (
    <>
      <Badge tone="cyan" variant="outline" icon={Radio}>
        Grounded in live telemetry
      </Badge>
      <Badge tone="blue" variant="outline" icon={ScanSearch}>
        Explains detections
      </Badge>
      <Badge tone="violet" variant="outline" icon={ListChecks}>
        Recommends actions
      </Badge>
    </>
  )
}

/**
 * AI Security Assistant — an analyst console that answers questions about the
 * NEXUS environment with structured, evidence-backed reports.
 */
export default function AssistantPage() {
  const conversation = useAssistantConversation()
  const busy = conversation.pending !== null
  const hasConversation = conversation.messages.length > 0 || busy || conversation.error !== null

  useDeepLinkQuestion(conversation.ask, busy)

  return (
    <>
      <PageHeader
        eyebrow="AI Security Analyst"
        title="NEXUS Security Assistant"
        description="AI-powered security investigation"
        meta={<CapabilityChips />}
        actions={
          <Button variant="outline" size="sm" icon={MessageSquarePlus} onClick={conversation.reset} disabled={!hasConversation}>
            New conversation
          </Button>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-4">
          <CompactContext className="xl:hidden" />
          <ConversationPanel conversation={conversation} />
        </div>
        <ContextRail className="hidden xl:block" />
      </div>
    </>
  )
}
