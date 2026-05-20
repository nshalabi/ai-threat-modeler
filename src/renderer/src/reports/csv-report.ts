/**
 * CSV report — flat findings export with attack-path + disposition columns
 * (#10). Two sections: the current-state findings list, then the full
 * disposition audit log (one row per recorded action).
 */
import type { ReportData } from './report-data'

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function row(fields: unknown[]): string {
  return fields.map(csvEscape).join(',')
}

export function generateCsvReport(data: ReportData): string {
  const lines: string[] = []

  // Attribution header
  lines.push(`# ${data.appName} v${data.appVersion} — Findings Export`)
  lines.push(`# Project: ${data.project.name}`)
  lines.push(`# Generated: ${data.generatedAt}`)
  lines.push(`# Author: ${data.author}`)
  lines.push('')

  // === Section 1: Findings (current state) ===
  lines.push('# FINDINGS (current state)')
  lines.push(
    row([
      'Rule ID',
      'Engine Severity',
      'Effective Severity',
      'Override From',
      'Override To',
      'Status',
      'Disposition By',
      'Disposition At',
      'Disposition Justification',
      'Disposition History Count',
      'Category',
      'Title',
      'Description',
      'Rationale',
      'Affected Components',
      'Affected Flows',
      'Frameworks',
      'Mitigations',
      'Recommendation',
      'Attack Path',
      'Missing Control',
      'Vulnerable Target Count'
    ])
  )

  for (const f of data.findings) {
    lines.push(
      row([
        f.ruleId,
        f.engineSeverity.toUpperCase(),
        f.effectiveSeverity.toUpperCase(),
        f.override?.from.toUpperCase() ?? '',
        f.override?.to.toUpperCase() ?? '',
        f.status.toUpperCase(),
        f.latestDisposition?.name ?? '',
        f.latestDisposition?.at ?? '',
        f.latestDisposition?.justification ?? '',
        String(f.dispositionHistory.length),
        f.category,
        f.title,
        f.description,
        f.rationale,
        f.affectedComponents.join('; '),
        f.affectedFlows.join('; '),
        f.frameworks.join('; '),
        f.mitigations.join('; '),
        f.recommendation,
        f.attackPath?.chain.join(' -> ') ?? '',
        f.attackPath?.missingControl ?? '',
        f.attackPath ? String(f.attackPath.vulnerableTargetCount) : ''
      ])
    )
  }

  // === Section 2: Disposition audit log ===
  const logRows = data.findings.flatMap((f) =>
    f.dispositionHistory.map((e) => ({ ruleId: f.ruleId, title: f.title, entry: e }))
  )
  if (logRows.length > 0) {
    lines.push('')
    lines.push('# DISPOSITION LOG (full audit trail)')
    lines.push(
      row([
        'Rule ID',
        'Finding Title',
        'Action Status',
        'Override From',
        'Override To',
        'Name',
        'At',
        'Justification'
      ])
    )
    for (const r of logRows) {
      lines.push(
        row([
          r.ruleId,
          r.title,
          r.entry.status.toUpperCase(),
          r.entry.override?.from.toUpperCase() ?? '',
          r.entry.override?.to.toUpperCase() ?? '',
          r.entry.name,
          r.entry.at,
          r.entry.justification
        ])
      )
    }
  }

  return lines.join('\r\n')
}
