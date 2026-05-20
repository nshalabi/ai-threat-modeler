import { useMemo, useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import type { Finding, ConditionTrace } from '@shared/types/analysis'
import type { Severity } from '@shared/types/knowledge'
import type { DispositionStatus } from '@shared/types/model'
import {
  findingKeyOf,
  resolveDisposition,
  type ResolvedDisposition
} from '../../../../analysis/disposition'

const OPERATOR_LABEL: Record<ConditionTrace['operator'], string> = {
  equals: 'is',
  'not-equals': 'is not',
  contains: 'contains',
  'not-contains': 'does not contain',
  exists: 'is set',
  'not-exists': 'is not set',
  in: 'is one of',
  'not-in': 'is not one of'
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'string') return v === '' ? '(empty)' : `"${v}"`
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (Array.isArray(v)) return `[${v.map(formatValue).join(', ')}]`
  return String(v)
}

function conditionText(c: ConditionTrace): string {
  const subject = `${c.target}.${c.field}`
  if (c.operator === 'exists' || c.operator === 'not-exists') {
    return `${subject} ${OPERATOR_LABEL[c.operator]}`
  }
  return `${subject} ${OPERATOR_LABEL[c.operator]} ${formatValue(c.expected)}`
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  informational: 'bg-gray-500'
}

const SEVERITY_TEXT: Record<Severity, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
  informational: 'text-gray-400'
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  informational: 4
}

const STATUS_ORDER: Record<DispositionStatus, number> = {
  open: 0,
  accepted: 1,
  'false-positive': 2
}

const STATUS_LABEL: Record<DispositionStatus, string> = {
  open: 'OPEN',
  accepted: 'ACCEPTED',
  'false-positive': 'FALSE POSITIVE'
}

const STATUS_BADGE: Record<DispositionStatus, string> = {
  open: '',
  accepted: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40',
  'false-positive': 'bg-slate-800 text-slate-300 border border-slate-600/40'
}

const ALL_SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'informational']

export function FindingsPanel(): JSX.Element {
  const findings = useProjectStore((s) => s.findings)
  const project = useProjectStore((s) => s.project)
  const selectedFindingId = useProjectStore((s) => s.selectedFindingId)
  const selectFinding = useProjectStore((s) => s.selectFinding)
  const applyDisposition = useProjectStore((s) => s.applyDisposition)
  const [sevFilter, setSevFilter] = useState<Severity | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DispositionStatus | 'all'>('all')

  // Resolve disposition for every finding once per (findings, dispositions).
  const resolvedById = useMemo(() => {
    const m = new Map<string, ResolvedDisposition>()
    for (const f of findings) m.set(f.id, resolveDisposition(project, f))
    return m
  }, [findings, project.dispositions])

  const visible = useMemo(() => {
    const list = findings.filter((f) => {
      const r = resolvedById.get(f.id)!
      if (sevFilter !== 'all' && r.effectiveSeverity !== sevFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      return true
    })
    list.sort((a, b) => {
      const ra = resolvedById.get(a.id)!
      const rb = resolvedById.get(b.id)!
      const sev = SEVERITY_ORDER[ra.effectiveSeverity] - SEVERITY_ORDER[rb.effectiveSeverity]
      if (sev !== 0) return sev
      const st = STATUS_ORDER[ra.status] - STATUS_ORDER[rb.status]
      if (st !== 0) return st
      return a.ruleId.localeCompare(b.ruleId)
    })
    return list
  }, [findings, resolvedById, sevFilter, statusFilter])

  const sevCount = (sev: Severity) =>
    findings.reduce(
      (n, f) => n + (resolvedById.get(f.id)!.effectiveSeverity === sev ? 1 : 0),
      0
    )
  const acceptedCount = findings.reduce(
    (n, f) => n + (resolvedById.get(f.id)!.status === 'accepted' ? 1 : 0),
    0
  )
  const fpCount = findings.reduce(
    (n, f) => n + (resolvedById.get(f.id)!.status === 'false-positive' ? 1 : 0),
    0
  )

  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="text-2xl mb-2">🔍</div>
        <p className="text-xs text-[#94a3b8] mb-1">No findings yet</p>
        <p className="text-[10px] text-[#64748b]">
          Run analysis to identify threats and vulnerabilities in your model
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-[#2e2e3a]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-[#e2e8f0] uppercase tracking-wider">
            Findings
          </h3>
          <span className="text-[10px] text-[#64748b]">{findings.length} total</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_SEVERITIES.map((sev) => {
            const count = sevCount(sev)
            if (count === 0) return null
            return (
              <span
                key={sev}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${SEVERITY_TEXT[sev]} bg-[#1a1a24]`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_COLORS[sev]}`} />
                {count}
              </span>
            )
          })}
        </div>
        {(acceptedCount > 0 || fpCount > 0) && (
          <div className="text-[10px] text-[#64748b] mt-1.5">
            {acceptedCount > 0 && <>Accepted: <span className="text-emerald-400">{acceptedCount}</span></>}
            {acceptedCount > 0 && fpCount > 0 && ' · '}
            {fpCount > 0 && <>False positives: <span className="text-slate-300">{fpCount}</span></>}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-b border-[#2e2e3a] grid grid-cols-2 gap-1.5">
        <select
          value={sevFilter}
          onChange={(e) => setSevFilter(e.target.value as Severity | 'all')}
          className="px-2 py-1 text-xs bg-[#0a0a0f] border border-[#2e2e3a] rounded text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="informational">Informational</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DispositionStatus | 'all')}
          className="px-2 py-1 text-xs bg-[#0a0a0f] border border-[#2e2e3a] rounded text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="accepted">Accepted</option>
          <option value="false-positive">False positive</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            resolved={resolvedById.get(finding.id)!}
            expanded={selectedFindingId === finding.id}
            onToggle={() =>
              selectFinding(selectedFindingId === finding.id ? null : finding.id)
            }
            onApply={(input) =>
              applyDisposition({ key: findingKeyOf(finding), ...input })
            }
            nodeLabels={finding.affectedNodeIds
              .map((id) => project.nodes.find((n) => n.id === id)?.label)
              .filter((l): l is string => !!l)}
          />
        ))}
      </div>
    </div>
  )
}

type Action = 'accept' | 'false-positive' | 'adjust' | 'reopen'

interface ApplyInput {
  status: DispositionStatus
  severityOverride: { from: Severity; to: Severity } | null
  name: string
  justification: string
}

function FindingCard({
  finding,
  resolved,
  expanded,
  onToggle,
  onApply,
  nodeLabels
}: {
  finding: Finding
  resolved: ResolvedDisposition
  expanded: boolean
  onToggle: () => void
  onApply: (input: ApplyInput) => void
  nodeLabels: string[]
}): JSX.Element {
  const [pendingAction, setPendingAction] = useState<Action | null>(null)

  const effective = resolved.effectiveSeverity
  const engine = finding.severity
  const hasOverride = !!resolved.override
  const isClosed = resolved.status !== 'open'

  return (
    <div
      className={`border-b border-[#2e2e3a] transition-opacity ${isClosed ? 'opacity-60' : ''}`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 hover:bg-[#1a1a24] transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-2">
          <span
            className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_COLORS[effective]}`}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-[#e2e8f0] leading-tight">
              {finding.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-[10px] font-medium ${SEVERITY_TEXT[effective]}`}>
                {effective.toUpperCase()}
              </span>
              {hasOverride && (
                <span className="text-[9px] text-[#64748b]">
                  (engine: <span className={SEVERITY_TEXT[engine]}>{engine}</span>)
                </span>
              )}
              {isClosed && (
                <span
                  className={`text-[9px] font-medium px-1 py-px rounded ${STATUS_BADGE[resolved.status]}`}
                >
                  {STATUS_LABEL[resolved.status]}
                </span>
              )}
              <span className="text-[10px] text-[#64748b]">{finding.ruleId}</span>
            </div>
          </div>
          <span className="text-[10px] text-[#64748b] flex-shrink-0">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5">
          <DetailSection label="Description">
            <p className="text-xs text-[#94a3b8] leading-relaxed">{finding.description}</p>
          </DetailSection>

          <DetailSection label="Rationale">
            <p className="text-xs text-[#94a3b8] leading-relaxed">{finding.rationale}</p>
          </DetailSection>

          {finding.derivation.path && (
            <DetailSection
              label={`Attack Path (${finding.derivation.path.vulnerableTargetCount} vulnerable target${
                finding.derivation.path.vulnerableTargetCount === 1 ? '' : 's'
              })`}
            >
              <div className="text-[11px] text-[#cbd5e1] leading-relaxed break-words">
                {nodeLabels.join('  →  ')}
              </div>
              <div className="text-[10px] text-[#64748b] mt-1">
                No control on this path:{' '}
                <code className="text-[#94a3b8]">{finding.derivation.path.missingControl}</code>
              </div>
            </DetailSection>
          )}

          {finding.derivation.conditions.length > 0 && (
            <DetailSection
              label={`Why this fired (${
                finding.derivation.logicOperator === 'and'
                  ? 'all conditions met'
                  : 'any condition met'
              })`}
            >
              <ul className="space-y-1">
                {finding.derivation.conditions.map((c, i) => (
                  <li key={i} className="text-[10px] leading-relaxed flex items-start gap-1.5">
                    <span
                      className={`mt-px flex-shrink-0 ${
                        c.passed ? 'text-emerald-400' : 'text-[#64748b]'
                      }`}
                    >
                      {c.passed ? '✓' : '✕'}
                    </span>
                    <span className="text-[#94a3b8]">
                      <code className="text-[#cbd5e1]">{conditionText(c)}</code>
                      {c.operator !== 'exists' && c.operator !== 'not-exists' && (
                        <span className="text-[#64748b]">
                          {' '}
                          — actual: <code className="text-[#cbd5e1]">{formatValue(c.actual)}</code>
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {nodeLabels.length > 0 && (
            <DetailSection label="Affected Components">
              <div className="flex flex-wrap gap-1">
                {nodeLabels.map((label) => (
                  <span
                    key={label}
                    className="px-1.5 py-0.5 text-[10px] bg-[#22222e] rounded text-[#94a3b8]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {finding.frameworkRefs.length > 0 && (
            <DetailSection label="Framework References">
              <div className="space-y-0.5">
                {finding.frameworkRefs.map((ref, i) => (
                  <div key={i} className="text-[10px] text-[#94a3b8]">
                    <span className="text-[#6366f1]">{ref.framework}</span>
                    {' '}{ref.id} — {ref.name}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {finding.mitigations.length > 0 && (
            <DetailSection label="Recommended Mitigations">
              <ul className="space-y-0.5">
                {finding.mitigations.map((mit, i) => (
                  <li key={i} className="text-[10px] text-[#94a3b8] flex items-start gap-1">
                    <span className="text-[#6366f1] mt-px">•</span>
                    {mit}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          <DetailSection label="Recommendation">
            <p className="text-xs text-[#94a3b8] leading-relaxed">{finding.recommendation}</p>
          </DetailSection>

          <RiskTreatment
            finding={finding}
            resolved={resolved}
            pendingAction={pendingAction}
            setPendingAction={setPendingAction}
            onApply={(input) => {
              onApply(input)
              setPendingAction(null)
            }}
          />
        </div>
      )}
    </div>
  )
}

function RiskTreatment({
  finding,
  resolved,
  pendingAction,
  setPendingAction,
  onApply
}: {
  finding: Finding
  resolved: ResolvedDisposition
  pendingAction: Action | null
  setPendingAction: (a: Action | null) => void
  onApply: (input: ApplyInput) => void
}): JSX.Element {
  return (
    <DetailSection label="Risk treatment">
      {/* Current state */}
      <div className="text-[10px] text-[#94a3b8] leading-relaxed">
        Status:{' '}
        <span
          className={`font-medium px-1 py-px rounded text-[9px] ${
            resolved.status === 'open'
              ? 'text-[#94a3b8]'
              : STATUS_BADGE[resolved.status]
          }`}
        >
          {STATUS_LABEL[resolved.status]}
        </span>
        {resolved.override && (
          <span className="ml-2 text-[#64748b]">
            Severity adjusted: <span className={SEVERITY_TEXT[resolved.override.from]}>{resolved.override.from}</span> →{' '}
            <span className={SEVERITY_TEXT[resolved.override.to]}>{resolved.override.to}</span>
          </span>
        )}
        {resolved.latest && (
          <div className="text-[#64748b] mt-0.5">
            by <span className="text-[#cbd5e1]">{resolved.latest.name}</span> ·{' '}
            {new Date(resolved.latest.at).toLocaleString()}
            <div className="italic text-[#94a3b8] mt-0.5">"{resolved.latest.justification}"</div>
          </div>
        )}
      </div>

      {/* Actions or form */}
      {!pendingAction ? (
        <div className="flex flex-wrap gap-1 mt-2">
          {resolved.status === 'open' && !resolved.override && (
            <>
              <ActionBtn label="Accept risk" onClick={() => setPendingAction('accept')} />
              <ActionBtn label="Mark false positive" onClick={() => setPendingAction('false-positive')} />
              <ActionBtn label="Adjust severity" onClick={() => setPendingAction('adjust')} />
            </>
          )}
          {(resolved.status !== 'open' || resolved.override) && (
            <>
              <ActionBtn label="Reopen" onClick={() => setPendingAction('reopen')} />
              <ActionBtn label="Adjust severity" onClick={() => setPendingAction('adjust')} />
              {resolved.status === 'open' && (
                <ActionBtn label="Accept risk" onClick={() => setPendingAction('accept')} />
              )}
              {resolved.status === 'open' && (
                <ActionBtn label="Mark false positive" onClick={() => setPendingAction('false-positive')} />
              )}
            </>
          )}
        </div>
      ) : (
        <DispositionForm
          action={pendingAction}
          finding={finding}
          resolved={resolved}
          onCancel={() => setPendingAction(null)}
          onApply={onApply}
        />
      )}

      {/* History */}
      {resolved.history.length > 0 && (
        <details className="mt-2">
          <summary className="text-[10px] text-[#64748b] cursor-pointer hover:text-[#94a3b8]">
            History ({resolved.history.length})
          </summary>
          <ul className="mt-1 space-y-1">
            {resolved.history.map((e) => (
              <li
                key={e.id}
                className="text-[10px] text-[#94a3b8] border-l-2 border-[#2e2e3a] pl-2 py-0.5"
              >
                <div>
                  <span className={`font-medium ${
                    e.status === 'open'
                      ? 'text-[#94a3b8]'
                      : e.status === 'accepted'
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                  }`}>
                    {STATUS_LABEL[e.status]}
                  </span>
                  {e.severityOverride && (
                    <span className="text-[#64748b]">
                      {' '}— severity{' '}
                      <span className={SEVERITY_TEXT[e.severityOverride.from]}>{e.severityOverride.from}</span> →{' '}
                      <span className={SEVERITY_TEXT[e.severityOverride.to]}>{e.severityOverride.to}</span>
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-[#64748b]">
                  by <span className="text-[#cbd5e1]">{e.name}</span> ·{' '}
                  {new Date(e.at).toLocaleString()}
                </div>
                <div className="italic">"{e.justification}"</div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </DetailSection>
  )
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-[10px] bg-[#1a1a24] border border-[#2e2e3a] rounded text-[#cbd5e1] hover:border-[#6366f1] cursor-pointer"
    >
      {label}
    </button>
  )
}

function DispositionForm({
  action,
  finding,
  resolved,
  onCancel,
  onApply
}: {
  action: Action
  finding: Finding
  resolved: ResolvedDisposition
  onCancel: () => void
  onApply: (input: ApplyInput) => void
}): JSX.Element {
  const [name, setName] = useState('')
  const [justification, setJustification] = useState('')
  const [newSev, setNewSev] = useState<Severity>(resolved.effectiveSeverity)
  const canApply = name.trim().length > 0 && justification.trim().length > 0

  const handleApply = (): void => {
    if (!canApply) return
    const trimmedName = name.trim()
    const trimmedJust = justification.trim()
    if (action === 'accept') {
      onApply({
        status: 'accepted',
        severityOverride: resolved.override,
        name: trimmedName,
        justification: trimmedJust
      })
    } else if (action === 'false-positive') {
      onApply({
        status: 'false-positive',
        severityOverride: resolved.override,
        name: trimmedName,
        justification: trimmedJust
      })
    } else if (action === 'reopen') {
      onApply({
        status: 'open',
        severityOverride: null,
        name: trimmedName,
        justification: trimmedJust
      })
    } else {
      // adjust severity — relative to engine baseline
      const override =
        newSev === finding.severity
          ? null
          : { from: finding.severity, to: newSev }
      onApply({
        status: resolved.status,
        severityOverride: override,
        name: trimmedName,
        justification: trimmedJust
      })
    }
  }

  const label =
    action === 'accept'
      ? 'Accept risk'
      : action === 'false-positive'
        ? 'Mark as false positive'
        : action === 'reopen'
          ? 'Reopen finding'
          : 'Adjust severity'

  return (
    <div className="mt-2 p-2 bg-[#0a0a0f] border border-[#2e2e3a] rounded space-y-1.5">
      <div className="text-[10px] font-medium text-[#cbd5e1]">{label}</div>
      <div className="text-[9px] text-[#64748b]">
        Name and justification are required. Name is self-declared (the app has
        no identity system) — this is an attributable change record by
        convention.
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (required)"
        className="w-full px-2 py-1 text-[11px] bg-[#12121a] border border-[#2e2e3a] rounded text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
      />
      <textarea
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        placeholder="Justification (required) — why this risk-treatment decision?"
        rows={2}
        className="w-full px-2 py-1 text-[11px] bg-[#12121a] border border-[#2e2e3a] rounded text-[#e2e8f0] placeholder-[#64748b] resize-y focus:outline-none focus:border-[#6366f1]"
      />
      {action === 'adjust' && (
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-[#94a3b8]">New severity:</label>
          <select
            value={newSev}
            onChange={(e) => setNewSev(e.target.value as Severity)}
            className="px-2 py-1 text-[11px] bg-[#12121a] border border-[#2e2e3a] rounded text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
          >
            {ALL_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
                {s === finding.severity ? ' (engine default)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-1.5 pt-1">
        <button
          onClick={handleApply}
          disabled={!canApply}
          className={`px-2 py-1 text-[10px] rounded font-medium ${
            canApply
              ? 'bg-[#6366f1] text-white hover:bg-[#818cf8] cursor-pointer'
              : 'bg-[#1a1a24] text-[#475569] cursor-not-allowed'
          }`}
        >
          Apply
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 text-[10px] text-[#94a3b8] hover:text-[#e2e8f0] cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function DetailSection({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div>
      <span className="text-[10px] font-medium text-[#64748b] uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}
