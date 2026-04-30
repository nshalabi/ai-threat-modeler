/**
 * Samples picker — lists the bundled sample projects so the user can load one
 * with a single click. Both desktop and web builds bundle the same set, so
 * this works identically in either environment.
 */
import { useMemo } from 'react'
import { platform } from '../../platform'
import { useProjectStore } from '../../stores/project-store'

interface SamplesDialogProps {
  onClose: () => void
}

export function SamplesDialog({ onClose }: SamplesDialogProps): JSX.Element {
  const setProject = useProjectStore((s) => s.setProject)
  const samples = useMemo(() => platform.listSamples(), [])

  const handleLoad = async (id: string) => {
    try {
      const raw = await platform.loadSample(id)
      const parsed = JSON.parse(raw)
      setProject(parsed)
      onClose()
    } catch (err) {
      console.error('Failed to load sample:', err)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[#12121a] border border-[#2e2e3a] rounded-lg shadow-2xl w-[560px] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 border-b border-[#2e2e3a]">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">Load a Sample Project</h2>
          <p className="text-xs text-[#64748b] mt-1">
            Pre-built threat models that demonstrate common AI architectures and the
            kinds of findings the analysis engine produces.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {samples.length === 0 && (
            <p className="text-sm text-[#64748b] py-6 text-center">
              No samples bundled in this build.
            </p>
          )}
          {samples.map((s) => (
            <button
              key={s.id}
              onClick={() => handleLoad(s.id)}
              className="w-full text-left bg-[#0a0a0f] hover:bg-[#1a1a24] border border-[#2e2e3a] hover:border-[#6366f1] rounded p-3 transition-colors cursor-pointer"
            >
              <div className="text-sm font-medium text-[#e2e8f0]">{s.name}</div>
              {s.description && (
                <div className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                  {s.description}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="px-6 py-3 bg-[#0a0a0f] border-t border-[#2e2e3a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-[#94a3b8] hover:text-[#e2e8f0] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
