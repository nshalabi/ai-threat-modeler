import { useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import type { Finding, ConditionTrace } from '@shared/types/analysis'
import type { Severity } from '@shared/types/knowledge'

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

export function FindingsPanel(): JSX.Element {
  const findings = useProjectStore((s) => s.findings)
  const project = useProjectStore((s) => s.project)
  const selectedFindingId = useProjectStore((s) => s.selectedFindingId)
  const selectFinding = useProjectStore((s) => s.selectFinding)
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')

  const filtered = severityFilter === 'all'
    ? findings
    : findings.filter((f) => f.severity === severityFilter)

  const countBySeverity = (sev: Severity) => findings.filter((f) => f.severity === sev).length

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
      {/* Summary bar */}
      <div className="px-3 py-2.5 border-b border-[#2e2e3a]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-[#e2e8f0] uppercase tracking-wider">
            Findings
          </h3>
          <span className="text-[10px] text-[#64748b]">{findings.length} total</span>
        </div>
        <div className="flex gap-1.5">
          {(['critical', 'high', 'medium', 'low', 'informational'] as Severity[]).map((sev) => {
            const count = countBySeverity(sev)
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
      </div>

      {/* Filter */}
      <div className="px-3 py-2 border-b border-[#2e2e3a]">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')}
          className="w-full px-2 py-1 text-xs bg-[#0a0a0f] border border-[#2e2e3a] rounded
                     text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="informational">Informational</option>
        </select>
      </div>

      {/* Findings list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            expanded={selectedFindingId === finding.id}
            onToggle={() =>
              selectFinding(selectedFindingId === finding.id ? null : finding.id)
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

function FindingCard({
  finding,
  expanded,
  onToggle,
  nodeLabels
}: {
  finding: Finding
  expanded: boolean
  onToggle: () => void
  nodeLabels: string[]
}): JSX.Element {
  return (
    <div className="border-b border-[#2e2e3a]">
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 hover:bg-[#1a1a24] transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-2">
          <span
            className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_COLORS[finding.severity]}`}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-[#e2e8f0] leading-tight">
              {finding.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-medium ${SEVERITY_TEXT[finding.severity]}`}>
                {finding.severity.toUpperCase()}
              </span>
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
        </div>
      )}
    </div>
  )
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <span className="text-[10px] font-medium text-[#64748b] uppercase tracking-wider">{label}</span>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}
