import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { KnowledgeEngine } from '../../../../knowledge/engine'
import { AnalysisEngine } from '../../../../analysis/engine'
import { loadBuiltinPacks } from '../../../../knowledge/loader'
import { buildReportData } from '../../reports/report-data'
import { generatePdfReport } from '../../reports/pdf-report'
import { generateDocxReport } from '../../reports/docx-report'
import { generateCsvReport } from '../../reports/csv-report'
import { platform } from '../../platform'

export function Toolbar(): JSX.Element {
  const project = useProjectStore((s) => s.project)
  const isDirty = useProjectStore((s) => s.isDirty)
  const newProject = useProjectStore((s) => s.newProject)
  const setProject = useProjectStore((s) => s.setProject)
  const markClean = useProjectStore((s) => s.markClean)
  const activePanel = useProjectStore((s) => s.activePanel)
  const setActivePanel = useProjectStore((s) => s.setActivePanel)
  const findings = useProjectStore((s) => s.findings)
  const setFindings = useProjectStore((s) => s.setFindings)
  const showHighRiskPath = useProjectStore((s) => s.showHighRiskPath)
  const clearHighlight = useProjectStore((s) => s.clearHighlight)
  const isFullScreen = useProjectStore((s) => s.isFullScreen)
  const toggleFullScreen = useProjectStore((s) => s.toggleFullScreen)
  const highlightedNodeIds = useProjectStore((s) => s.highlightedNodeIds)
  const setShowAbout = useProjectStore((s) => s.setShowAbout)
  const setShowSamples = useProjectStore((s) => s.setShowSamples)
  const notes = useProjectStore((s) => s.project.notes)

  const [reportsOpen, setReportsOpen] = useState(false)
  const reportsMenuRef = useRef<HTMLDivElement>(null)
  const [reportBusy, setReportBusy] = useState(false)

  // Click-outside to close reports menu
  useEffect(() => {
    if (!reportsOpen) return
    const onClick = (e: MouseEvent) => {
      if (reportsMenuRef.current && !reportsMenuRef.current.contains(e.target as Node)) {
        setReportsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [reportsOpen])

  const handleNew = () => {
    newProject('Untitled Project', '')
  }

  const handleOpen = async () => {
    const result = await platform.openProject()
    if (result.success && result.data) {
      try {
        const parsed = JSON.parse(result.data)
        setProject(parsed, result.path)
      } catch {
        console.error('Failed to parse project file')
      }
    }
  }

  const handleSave = async () => {
    const data = JSON.stringify(project, null, 2)
    const safeName = project.name.replace(/[^\w.-]+/g, '_') || 'project'
    const result = await platform.saveProject(data, `${safeName}.aitm`)
    if (result.success) {
      markClean()
    }
  }

  const handleRunAnalysis = () => {
    const knowledgeEngine = new KnowledgeEngine()
    const { pack, rules } = loadBuiltinPacks()
    knowledgeEngine.loadPack(pack)

    const analysisEngine = new AnalysisEngine(knowledgeEngine)
    analysisEngine.loadRules(rules)

    const result = analysisEngine.analyze(project)
    setFindings(result.findings)
    setActivePanel('findings')
  }

  const generateReport = async (format: 'pdf' | 'docx' | 'csv') => {
    setReportsOpen(false)
    setReportBusy(true)
    try {
      const data = buildReportData(project, findings)
      const safeName = project.name.replace(/[^\w.-]+/g, '_') || 'threat-model'

      if (format === 'csv') {
        const csv = generateCsvReport(data)
        await platform.saveReport({ format, data: csv, defaultName: `${safeName}-findings.csv` })
      } else if (format === 'pdf') {
        const buffer = await generatePdfReport(data)
        await platform.saveReport({ format, data: buffer, defaultName: `${safeName}.pdf` })
      } else {
        const buffer = await generateDocxReport(data)
        await platform.saveReport({ format, data: buffer, defaultName: `${safeName}.docx` })
      }
    } catch (err) {
      console.error('Report generation failed:', err)
    } finally {
      setReportBusy(false)
    }
  }

  const handleHighRiskPath = () => {
    if (highlightedNodeIds.length > 0) {
      clearHighlight()
    } else {
      showHighRiskPath()
    }
  }

  const toggleFindings = () => {
    setActivePanel(activePanel === 'findings' ? null : 'findings')
  }

  const toggleNotes = () => {
    setActivePanel(activePanel === 'notes' ? null : 'notes')
  }

  const toggleAttackPaths = () => {
    setActivePanel(activePanel === 'attack-paths' ? null : 'attack-paths')
  }

  const hasFindings = findings.length > 0
  const highlightActive = highlightedNodeIds.length > 0

  return (
    <div className="h-11 flex items-center justify-between px-4 bg-[#12121a] border-b border-[#2e2e3a] select-none">
      {/* Left actions */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={handleNew} title="New Project">
          New
        </ToolbarButton>
        <ToolbarButton onClick={handleOpen} title="Open Project">
          Open
        </ToolbarButton>
        <ToolbarButton onClick={handleSave} title="Save Project">
          Save
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowSamples(true)} title="Load a sample project">
          Samples
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={handleRunAnalysis} title="Run Analysis" accent>
          Analyze
        </ToolbarButton>

        {/* Reports menu */}
        <div className="relative" ref={reportsMenuRef}>
          <ToolbarButton
            onClick={() => setReportsOpen((o) => !o)}
            title="Generate Report"
            disabled={reportBusy}
          >
            {reportBusy ? 'Generating…' : 'Reports ▾'}
          </ToolbarButton>
          {reportsOpen && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-[#12121a] border border-[#2e2e3a] rounded shadow-lg z-50">
              <ReportMenuItem onClick={() => generateReport('pdf')}>
                PDF Report
              </ReportMenuItem>
              <ReportMenuItem onClick={() => generateReport('docx')}>
                Word (.docx)
              </ReportMenuItem>
              <ReportMenuItem onClick={() => generateReport('csv')}>
                Findings (.csv)
              </ReportMenuItem>
            </div>
          )}
        </div>

        <ToolbarDivider />

        <ToolbarButton
          onClick={handleHighRiskPath}
          title="Highlight High-Risk Components"
          active={highlightActive}
          disabled={!hasFindings}
        >
          {highlightActive ? 'Clear Highlight' : 'Highlight High-Risk Components'}
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleFullScreen}
          title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen Diagram'}
          active={isFullScreen}
        >
          {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
        </ToolbarButton>
      </div>

      {/* Center - Project name */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[#e2e8f0] font-medium">{project.name}</span>
        {isDirty && <span className="text-[#64748b] text-xs">(unsaved)</span>}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={toggleNotes}
          title="Toggle Notes Panel"
          active={activePanel === 'notes'}
        >
          Notes{notes.length > 0 ? ` (${notes.length})` : ''}
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleFindings}
          title="Toggle Findings Panel"
          active={activePanel === 'findings'}
        >
          Findings{findings.length > 0 ? ` (${findings.length})` : ''}
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleAttackPaths}
          title="Toggle Attack Paths Panel"
          active={activePanel === 'attack-paths'}
        >
          Attack Paths
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={() => setShowAbout(true)} title="About">
          About
        </ToolbarButton>
      </div>
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  title,
  accent,
  active,
  disabled
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  accent?: boolean
  active?: boolean
  disabled?: boolean
}): JSX.Element {
  const base =
    'px-3 py-1.5 text-xs font-medium rounded transition-colors duration-150'
  const cursor = disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
  const style = accent
    ? 'bg-[#6366f1] text-white hover:bg-[#818cf8]'
    : active
      ? 'bg-[#1a1a24] text-[#e2e8f0] border border-[#6366f1]'
      : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a1a24]'

  return (
    <button
      className={`${base} ${style} ${cursor}`}
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function ToolbarDivider(): JSX.Element {
  return <div className="w-px h-5 bg-[#2e2e3a] mx-1" />
}

function ReportMenuItem({
  children,
  onClick
}: {
  children: React.ReactNode
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left px-3 py-2 text-xs text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a1a24] cursor-pointer"
    >
      {children}
    </button>
  )
}
