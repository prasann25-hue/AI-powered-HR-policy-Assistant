import { AlertTriangle, Phone, Mail } from 'lucide-react'

/**
 * Shown when Gemini returns requires_escalation: true.
 * Prompts user to contact HR directly.
 */
const EscalationBanner = ({ onEscalate }) => {
  return (
    <div className="mt-3 p-4 rounded-xl bg-yellow-500/8 border border-yellow-500/25 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-yellow-500/15 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-yellow-300 mb-1">
            Human Review Recommended
          </p>
          <p className="text-xs text-yellow-400/80 leading-relaxed">
            This question may require an HR representative's direct attention — either because
            the policy doesn't cover it, or it involves a sensitive matter.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              id="escalate-btn"
              onClick={onEscalate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-yellow-500/15 text-yellow-300 text-xs font-semibold border border-yellow-500/30
                         hover:bg-yellow-500/25 transition-all duration-200"
            >
              <Mail className="w-3.5 h-3.5" />
              Escalate to HR
            </button>
            <a
              href="mailto:hr@company.com"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-secondary text-muted-foreground text-xs font-medium border border-border
                         hover:bg-muted transition-all duration-200"
            >
              <Phone className="w-3.5 h-3.5" />
              Contact HR Directly
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EscalationBanner
