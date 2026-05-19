/**
 * Share dialog (#5, web only). Produces a URL that encodes the *design only*
 * into the link fragment. No analysis results, no #6 disposition log — the
 * recipient re-analyzes deterministically. For full analyzed/audited work,
 * the .aitm file or an exported report is the right artifact.
 */
import { useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import {
  encodeProjectToHash,
  type ShareOptions,
  SOFT_URL_LENGTH
} from '../../utils/share-link'

interface ShareDialogProps {
  onClose: () => void
}

export function ShareDialog({ onClose }: ShareDialogProps): JSX.Element {
  const project = useProjectStore((s) => s.project)
  const [opts, setOpts] = useState<ShareOptions>({
    includeNotes: true,
    anonymize: false
  })
  const [result, setResult] = useState<ReturnType<typeof encodeProjectToHash> | null>(
    null
  )
  const [copied, setCopied] = useState(false)

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : ''

  const generate = () => {
    setCopied(false)
    setResult(encodeProjectToHash(project, opts, baseUrl))
  }

  const copy = async () => {
    if (!result || result.tooLarge) return
    try {
      await navigator.clipboard.writeText(result.url)
      setCopied(true)
    } catch {
      // Clipboard API unavailable (locked-down/embedded browser) — the
      // readonly field below is selectable as a fallback.
      setCopied(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[#12121a] border border-[#2e2e3a] rounded-lg shadow-2xl w-[560px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 border-b border-[#2e2e3a]">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">Share model link</h2>
          <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
            Encodes the <strong>design only</strong> into a link. Analysis
            results and risk dispositions are <strong>not</strong> included —
            the recipient runs Analyze to reproduce findings. For analyzed or
            audited work, share the <code>.aitm</code> file or an exported
            report instead.
          </p>
        </div>

        <div className="px-6 py-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94a3b8]">
            <input
              type="checkbox"
              checked={opts.includeNotes}
              disabled={opts.anonymize}
              onChange={(e) =>
                setOpts((o) => ({ ...o, includeNotes: e.target.checked }))
              }
              className="w-3.5 h-3.5 rounded border-[#2e2e3a] bg-[#0a0a0f] text-[#6366f1]"
            />
            Include notes {opts.anonymize && '(dropped when anonymizing)'}
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94a3b8]">
            <input
              type="checkbox"
              checked={opts.anonymize}
              onChange={(e) =>
                setOpts((o) => ({ ...o, anonymize: e.target.checked }))
              }
              className="w-3.5 h-3.5 rounded border-[#2e2e3a] bg-[#0a0a0f] text-[#6366f1]"
            />
            Anonymize labels (replace component/flow/zone names; drop notes &
            descriptions)
          </label>

          <button
            onClick={generate}
            className="px-3 py-1.5 text-xs bg-[#6366f1] text-white rounded hover:bg-[#818cf8] cursor-pointer"
          >
            Generate link
          </button>

          {result && (
            <div className="space-y-2 pt-1">
              {result.tooLarge ? (
                <p className="text-xs text-red-400 leading-relaxed">
                  This model is too large to share via URL
                  ({result.length.toLocaleString()} chars). Export the{' '}
                  <code>.aitm</code> file or a report and share that instead.
                </p>
              ) : (
                <>
                  <textarea
                    readOnly
                    value={result.url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full h-20 text-[10px] bg-[#0a0a0f] border border-[#2e2e3a] rounded p-2 text-[#94a3b8] resize-none font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copy}
                      className="px-3 py-1.5 text-xs bg-[#1a1a24] border border-[#2e2e3a] rounded text-[#e2e8f0] hover:border-[#6366f1] cursor-pointer"
                    >
                      {copied ? 'Copied ✓' : 'Copy link'}
                    </button>
                    <span className="text-[10px] text-[#64748b]">
                      {result.length.toLocaleString()} chars
                      {result.warnLong &&
                        ` — long (>${SOFT_URL_LENGTH}); may not paste cleanly in some apps`}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-[10px] text-[#475569] leading-relaxed pt-1 border-t border-[#2e2e3a] mt-1">
            The entire model is encoded in the link itself — nothing is
            uploaded to any server. Anyone with the link can open the model, so
            treat it like the data it contains.
          </p>
        </div>

        <div className="px-6 py-3 bg-[#0a0a0f] border-t border-[#2e2e3a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-[#94a3b8] hover:text-[#e2e8f0] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
