/**
 * About dialog — shows app info and developer credits.
 */
import { platform } from '../../platform'

interface AboutDialogProps {
  onClose: () => void
}

const APP_VERSION = '0.1.0'

export function AboutDialog({ onClose }: AboutDialogProps): JSX.Element {
  const open = (url: string) => {
    void platform.openExternal(url)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[#12121a] border border-[#2e2e3a] rounded-lg shadow-2xl w-[460px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with icon */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="flex justify-center mb-3">
            <AppIcon />
          </div>
          <h2 className="text-xl font-bold text-[#e2e8f0]">AI Threat Modeler</h2>
          <p className="text-xs text-[#64748b] mt-1">Version {APP_VERSION}</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Threat modeling for AI systems</p>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 text-sm text-[#94a3b8] text-center space-y-3">
          <p>
            A visual threat modeling tool dedicated to AI systems — LLMs, RAG, agents, and
            model pipelines.
          </p>
          <p className="text-[#94a3b8]">
            Findings are mapped to MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF, and NIST CSF.
          </p>
          <p className="text-[#64748b] text-xs pt-1">
            Developed by{' '}
            <span className="text-[#e2e8f0] font-medium">Nader Shalabi</span>
          </p>

          {/* Social icons */}
          <div className="pt-2 flex items-center justify-center gap-4">
            <button
              onClick={() => open('https://github.com/nshalabi')}
              className="text-[#64748b] hover:text-[#e2e8f0] transition-colors cursor-pointer"
              title="GitHub"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </button>
            <button
              onClick={() => open('https://x.com/nader_shalabi')}
              className="text-[#64748b] hover:text-[#e2e8f0] transition-colors cursor-pointer"
              title="X (Twitter)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
            <button
              onClick={() => open('https://www.linkedin.com/in/nadershalabi')}
              className="text-[#64748b] hover:text-[#e2e8f0] transition-colors cursor-pointer"
              title="LinkedIn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </button>
          </div>

          <p className="text-[10px] text-[#475569] pt-3 leading-relaxed">
            Copyright &copy; 2026 Nader Shalabi.
            <br />
            Released under the MIT License.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0a0a0f] border-t border-[#2e2e3a] flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-1.5 text-xs bg-[#6366f1] text-white rounded hover:bg-[#818cf8] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function AppIcon(): JSX.Element {
  return (
    <svg width="64" height="64" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="96" fill="#6366f1" />
      <path
        d="M256 104 L400 152 L400 272 C400 348 344 408 256 432 C168 408 112 348 112 272 L112 152 Z"
        fill="#ffffff"
      />
      <g stroke="#6366f1" strokeWidth="14" strokeLinecap="round">
        <line x1="208" y1="248" x2="304" y2="248" />
        <line x1="208" y1="248" x2="256" y2="332" />
        <line x1="304" y1="248" x2="256" y2="332" />
      </g>
      <circle cx="208" cy="248" r="22" fill="#6366f1" />
      <circle cx="304" cy="248" r="22" fill="#6366f1" />
      <circle cx="256" cy="332" r="22" fill="#6366f1" />
    </svg>
  )
}
