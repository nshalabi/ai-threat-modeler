/**
 * Report emitters — a SEPARATE core entry point (`@core/reports`).
 *
 * These formatters pull in heavy, browser-oriented libraries (jsPDF +
 * html2canvas + DOMPurify for PDF, the docx package for DOCX). They are split
 * out of the main `@core` barrel so dependency-light consumers — the MCP
 * server (#11) and the CLI's analyze path (#7) — can import the analysis core
 * without bundling the report stack. The GUI imports from here when it needs
 * to render a report.
 *
 * `buildReportData` and the ReportData types stay in `@core` (they are pure:
 * no heavy deps), so non-GUI consumers can still assemble report data.
 */
export { generatePdfReport } from '../reports/pdf-report'
export { generateDocxReport } from '../reports/docx-report'
export { generateCsvReport } from '../reports/csv-report'
