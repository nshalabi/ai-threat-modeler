/**
 * CSV report — flat findings export, one row per finding.
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

  // Attribution header (kept short so spreadsheet still parses cleanly)
  lines.push(`# ${data.appName} v${data.appVersion} — Findings Export`)
  lines.push(`# Project: ${data.project.name}`)
  lines.push(`# Generated: ${data.generatedAt}`)
  lines.push(`# Author: ${data.author}`)
  lines.push('')

  lines.push(
    row([
      'Rule ID',
      'Severity',
      'Category',
      'Title',
      'Description',
      'Rationale',
      'Affected Components',
      'Affected Flows',
      'Frameworks',
      'Mitigations',
      'Recommendation'
    ])
  )

  for (const f of data.findings) {
    lines.push(
      row([
        f.ruleId,
        f.severity.toUpperCase(),
        f.category,
        f.title,
        f.description,
        f.rationale,
        f.affectedComponents.join('; '),
        f.affectedFlows.join('; '),
        f.frameworks.join('; '),
        f.mitigations.join('; '),
        f.recommendation
      ])
    )
  }

  return lines.join('\r\n')
}
