import { useEffect } from 'react'
import { Toolbar } from '../Toolbar/Toolbar'
import { ComponentPalette } from '../Sidebar/ComponentPalette'
import { ThreatModelCanvas } from '../Canvas/ThreatModelCanvas'
import { PropertyPanel } from '../PropertyPanel/PropertyPanel'
import { FindingsPanel } from '../FindingsPanel/FindingsPanel'
import { NotesPanel } from '../NotesPanel/NotesPanel'
import { AttackPathsPanel } from '../AttackPathsPanel/AttackPathsPanel'
import { AboutDialog } from '../AboutDialog/AboutDialog'
import { SamplesDialog } from '../SamplesDialog/SamplesDialog'
import { useProjectStore } from '../../stores/project-store'

export function AppLayout(): JSX.Element {
  const activePanel = useProjectStore((s) => s.activePanel)
  const isFullScreen = useProjectStore((s) => s.isFullScreen)
  const toggleFullScreen = useProjectStore((s) => s.toggleFullScreen)
  const showAbout = useProjectStore((s) => s.showAbout)
  const setShowAbout = useProjectStore((s) => s.setShowAbout)
  const showSamples = useProjectStore((s) => s.showSamples)
  const setShowSamples = useProjectStore((s) => s.setShowSamples)

  // ESC exits full-screen mode
  useEffect(() => {
    if (!isFullScreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleFullScreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullScreen, toggleFullScreen])

  if (isFullScreen) {
    return (
      <div className="flex flex-col h-screen w-screen bg-[#0a0a0f]">
        <div className="flex-1 relative">
          <ThreatModelCanvas />
          {/* Floating exit-fullscreen control */}
          <button
            onClick={toggleFullScreen}
            title="Exit Full Screen (Esc)"
            className="absolute top-4 right-4 z-50 px-3 py-1.5 text-xs font-medium
                       bg-[#12121a]/90 border border-[#2e2e3a] rounded
                       text-[#e2e8f0] hover:bg-[#1a1a24] cursor-pointer
                       backdrop-blur-sm shadow-lg"
          >
            Exit Full Screen (Esc)
          </button>
        </div>
        {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
        {showSamples && <SamplesDialog onClose={() => setShowSamples(false)} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0f]">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Component Palette */}
        <div className="w-[280px] flex-shrink-0 border-r border-[#2e2e3a] bg-[#12121a]">
          <ComponentPalette />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 relative">
          <ThreatModelCanvas />
        </div>

        {/* Right Panel - Properties, Findings, or Notes */}
        {activePanel && (
          <div className="w-[320px] flex-shrink-0 border-l border-[#2e2e3a] bg-[#12121a]">
            {activePanel === 'properties' && <PropertyPanel />}
            {activePanel === 'findings' && <FindingsPanel />}
            {activePanel === 'notes' && <NotesPanel />}
            {activePanel === 'attack-paths' && <AttackPathsPanel />}
          </div>
        )}
      </div>

      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      {showSamples && <SamplesDialog onClose={() => setShowSamples(false)} />}
    </div>
  )
}
