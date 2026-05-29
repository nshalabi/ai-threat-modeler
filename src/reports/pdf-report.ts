/**
 * PDF report — full threat model report using jsPDF + autotable.
 * Same content as the DOCX report.
 *
 * #10: findings are split into Open / Accepted Risks / False Positives;
 * severity overrides are disclosed (Engine X -> Adjusted Y); a dedicated
 * Attack Paths section lists every multi-hop finding's chain.
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReportData, ReportFinding } from './report-data'
import type { Severity } from '@shared/types/knowledge'

const SEVERITY_COLOR: Record<Severity, [number, number, number]> = {
  critical: [220, 38, 38],
  high: [234, 88, 12],
  medium: [202, 138, 4],
  low: [37, 99, 235],
  informational: [100, 116, 139]
}

const TEXT = [30, 30, 35] as [number, number, number]
const MUTED = [100, 116, 139] as [number, number, number]
const ACCENT = [99, 102, 241] as [number, number, number]
const ACCEPTED_COLOR = [16, 122, 87] as [number, number, number]
const FP_COLOR = [71, 85, 105] as [number, number, number]

export async function generatePdfReport(data: ReportData): Promise<ArrayBuffer> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 48

  // === Cover ===
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...TEXT)
  doc.text('AI Threat Model Report', margin, 100)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...MUTED)
  doc.text(data.project.name, margin, 124)

  doc.setFontSize(9)
  doc.text(`Generated: ${formatDate(data.generatedAt)}`, margin, 144)
  doc.text(`Tool: ${data.appName} v${data.appVersion}`, margin, 158)

  if (data.project.description) {
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    const descLines = doc.splitTextToSize(data.project.description, pageWidth - margin * 2)
    doc.text(descLines, margin, 200)
  }

  // === Executive summary ===
  let cursorY = 260
  cursorY = sectionHeader(doc, 'Executive Summary', margin, cursorY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...TEXT)
  doc.text(
    [
      `Components modeled:  ${data.project.componentCount}`,
      `Data flows modeled:  ${data.project.flowCount}`,
      `Trust boundaries:    ${data.project.boundaryCount}`,
      `Total findings:      ${data.summary.total}`
    ],
    margin,
    cursorY
  )
  cursorY += 70

  // Severity breakdown (effective)
  autoTable(doc, {
    startY: cursorY,
    head: [['Effective severity', 'Count']],
    body: (['critical', 'high', 'medium', 'low', 'informational'] as Severity[]).map((s) => [
      s.toUpperCase(),
      String(data.summary.bySeverity[s])
    ]),
    theme: 'grid',
    headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: TEXT },
    margin: { left: margin, right: margin },
    tableWidth: 220
  })

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
  // Disposition breakdown
  autoTable(doc, {
    startY: cursorY,
    head: [['Status', 'Count']],
    body: [
      ['OPEN', String(data.summary.byStatus.open)],
      ['ACCEPTED RISKS', String(data.summary.byStatus.accepted)],
      ['FALSE POSITIVES', String(data.summary.byStatus.falsePositive)]
    ],
    theme: 'grid',
    headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: TEXT },
    margin: { left: margin, right: margin },
    tableWidth: 220
  })

  // === Components ===
  doc.addPage()
  cursorY = margin
  cursorY = sectionHeader(doc, 'Components', margin, cursorY)
  autoTable(doc, {
    startY: cursorY,
    head: [['Label', 'Type', 'Classification']],
    body: data.components.map((c) => [c.label, c.type, c.classification ?? '—']),
    theme: 'grid',
    headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: TEXT },
    margin: { left: margin, right: margin }
  })

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
  if (cursorY > 700) {
    doc.addPage()
    cursorY = margin
  }
  cursorY = sectionHeader(doc, 'Data Flows', margin, cursorY)
  autoTable(doc, {
    startY: cursorY,
    head: [['Label', 'Source', 'Target', 'Enc', 'Auth', 'Class']],
    body: data.flows.map((f) => [
      f.label,
      f.source,
      f.target,
      f.encrypted ? 'Y' : 'N',
      f.authenticated ? 'Y' : 'N',
      f.classification
    ]),
    theme: 'grid',
    headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: TEXT },
    margin: { left: margin, right: margin }
  })

  if (data.boundaries.length > 0) {
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
    if (cursorY > 700) {
      doc.addPage()
      cursorY = margin
    }
    cursorY = sectionHeader(doc, 'Trust Boundaries', margin, cursorY)
    autoTable(doc, {
      startY: cursorY,
      head: [['Label', 'Type', 'Components']],
      body: data.boundaries.map((b) => [b.label, b.type, String(b.nodeCount)]),
      theme: 'grid',
      headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: TEXT },
      margin: { left: margin, right: margin }
    })
  }

  // === Attack Paths (multi-hop findings) ===
  if (data.attackPathFindings.length > 0) {
    doc.addPage()
    cursorY = margin
    cursorY = sectionHeader(doc, 'Attack Paths', margin, cursorY)
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(
      doc.splitTextToSize(
        'Chained attacks where an untrusted source can reach a target along a path with no control node interrupting it. Each entry below shows the shortest control-free path the analysis engine found.',
        pageWidth - margin * 2
      ),
      margin,
      cursorY
    )
    cursorY += 28
    autoTable(doc, {
      startY: cursorY,
      head: [['Severity', 'Status', 'Finding', 'Path', 'Missing control']],
      body: data.attackPathFindings.map((f) => [
        f.effectiveSeverity.toUpperCase(),
        f.status === 'open' ? 'OPEN' : f.status === 'accepted' ? 'ACCEPTED' : 'FALSE POS.',
        f.title,
        f.attackPath?.chain.join(' -> ') ?? '',
        f.attackPath?.missingControl ?? ''
      ]),
      theme: 'grid',
      headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: TEXT, valign: 'top' },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 60 },
        2: { cellWidth: 110 }
      },
      margin: { left: margin, right: margin }
    })
  }

  // === Findings, split by status ===
  doc.addPage()
  cursorY = margin
  cursorY = sectionHeader(doc, 'Findings', margin, cursorY)

  if (data.findings.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    doc.text('No findings produced by current analysis.', margin, cursorY + 8)
  } else {
    cursorY = drawFindingGroup(
      doc,
      'Open',
      data.openFindings,
      margin,
      cursorY,
      pageWidth
    )
    cursorY = drawFindingGroup(
      doc,
      'Accepted Risks',
      data.acceptedFindings,
      margin,
      cursorY,
      pageWidth
    )
    cursorY = drawFindingGroup(
      doc,
      'False Positives',
      data.falsePositiveFindings,
      margin,
      cursorY,
      pageWidth
    )
  }

  // === Notes ===
  if (data.notes.length > 0) {
    doc.addPage()
    cursorY = margin
    cursorY = sectionHeader(doc, 'Notes & Assumptions', margin, cursorY)
    autoTable(doc, {
      startY: cursorY,
      head: [['Category', 'Note']],
      body: data.notes.map((n) => [n.category, n.content]),
      theme: 'grid',
      headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: TEXT },
      columnStyles: { 0: { cellWidth: 80 } },
      margin: { left: margin, right: margin }
    })
  }

  // === Footer ===
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(
      `${data.appName} v${data.appVersion} — Generated ${formatDate(data.generatedAt)}`,
      margin,
      doc.internal.pageSize.getHeight() - 20
    )
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'right' }
    )
  }

  return doc.output('arraybuffer')
}

function drawFindingGroup(
  doc: jsPDF,
  groupTitle: string,
  findings: ReportFinding[],
  margin: number,
  y: number,
  pageWidth: number
): number {
  if (findings.length === 0) return y
  if (y > 700) {
    doc.addPage()
    y = margin
  }
  // Sub-header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ACCENT)
  doc.text(`${groupTitle} (${findings.length})`, margin, y)
  y += 18
  doc.setFont('helvetica', 'normal')
  for (const f of findings) {
    y = drawFinding(doc, f, margin, y, pageWidth)
  }
  return y + 6
}

function sectionHeader(doc: jsPDF, title: string, x: number, y: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...ACCENT)
  doc.text(title, x, y)
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(1)
  doc.line(x, y + 4, x + 60, y + 4)
  return y + 24
}

function drawFinding(
  doc: jsPDF,
  f: ReportFinding,
  margin: number,
  y: number,
  pageWidth: number
): number {
  const blockHeightEstimate = 130
  if (y + blockHeightEstimate > 760) {
    doc.addPage()
    y = margin
  }

  // Effective severity badge
  const sevColor = SEVERITY_COLOR[f.effectiveSeverity]
  doc.setFillColor(...sevColor)
  doc.rect(margin, y, 60, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255)
  doc.text(f.effectiveSeverity.toUpperCase(), margin + 30, y + 10, { align: 'center' })

  // Status badge after severity (only if not open)
  let xCursor = margin + 70
  if (f.status !== 'open') {
    const color = f.status === 'accepted' ? ACCEPTED_COLOR : FP_COLOR
    doc.setFillColor(...color)
    doc.rect(xCursor, y, 80, 14, 'F')
    doc.setTextColor(255)
    doc.text(
      f.status === 'accepted' ? 'ACCEPTED' : 'FALSE POSITIVE',
      xCursor + 40,
      y + 10,
      { align: 'center' }
    )
    xCursor += 90
  }

  // Title
  doc.setTextColor(...TEXT)
  doc.setFontSize(11)
  doc.text(f.title, xCursor, y + 10)

  // Rule ID
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(f.ruleId, pageWidth - margin, y + 10, { align: 'right' })
  y += 20

  // Override disclosure
  if (f.override) {
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      `Engine severity: ${f.override.from.toUpperCase()} -> Adjusted: ${f.override.to.toUpperCase()}`,
      margin,
      y
    )
    y += 10
  }

  // Description
  doc.setFontSize(9)
  doc.setTextColor(...TEXT)
  const descLines = doc.splitTextToSize(f.description, pageWidth - margin * 2)
  doc.text(descLines, margin, y)
  y += descLines.length * 11 + 4

  // Rationale
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  const ratLines = doc.splitTextToSize(`Rationale: ${f.rationale}`, pageWidth - margin * 2)
  doc.text(ratLines, margin, y)
  y += ratLines.length * 10 + 4
  doc.setFont('helvetica', 'normal')

  // Attack path (compact restatement on the finding itself)
  if (f.attackPath) {
    doc.setFontSize(8)
    doc.setTextColor(...TEXT)
    const apLines = doc.splitTextToSize(
      `Attack path: ${f.attackPath.chain.join(' -> ')}  (no control: ${f.attackPath.missingControl})`,
      pageWidth - margin * 2
    )
    doc.text(apLines, margin, y)
    y += apLines.length * 10 + 2
  }

  if (f.affectedComponents.length > 0) {
    doc.setFontSize(8)
    doc.setTextColor(...TEXT)
    const cLines = doc.splitTextToSize(
      `Affected components: ${f.affectedComponents.join(', ')}`,
      pageWidth - margin * 2
    )
    doc.text(cLines, margin, y)
    y += cLines.length * 10 + 2
  }

  if (f.frameworks.length > 0) {
    doc.setFontSize(8)
    doc.setTextColor(...ACCENT)
    const fLines = doc.splitTextToSize(
      `Frameworks: ${f.frameworks.join(' | ')}`,
      pageWidth - margin * 2
    )
    doc.text(fLines, margin, y)
    y += fLines.length * 10 + 2
  }

  doc.setFontSize(8.5)
  doc.setTextColor(...TEXT)
  const recLines = doc.splitTextToSize(`Recommendation: ${f.recommendation}`, pageWidth - margin * 2)
  doc.text(recLines, margin, y)
  y += recLines.length * 10 + 4

  // Disposition disclosure
  if (f.latestDisposition) {
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    const d = f.latestDisposition
    const dLines = doc.splitTextToSize(
      `Disposition: ${d.status.toUpperCase()} — by ${d.name} · ${formatDate(d.at)} — "${d.justification}"`,
      pageWidth - margin * 2
    )
    doc.text(dLines, margin, y)
    y += dLines.length * 10 + 2
    // Older history if any
    if (f.dispositionHistory.length > 1) {
      doc.setFontSize(7.5)
      const prior = f.dispositionHistory.slice(0, -1)
      doc.text(
        `Prior disposition entries: ${prior.length} (see CSV export for full log)`,
        margin,
        y
      )
      y += 10
    }
  }

  y += 8
  return y
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}
