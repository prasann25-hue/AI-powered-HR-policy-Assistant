import { Hash } from 'lucide-react'

/**
 * Displays a list of chunk ID citations from an AI response.
 * Shows abbreviated IDs with hover tooltip for full UUID.
 */
const CitationBadge = ({ citations = [] }) => {
  if (!citations || citations.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/40">
      <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
        <Hash className="w-3 h-3" />
        Sources:
      </span>
      {citations.map((id, i) => (
        <span
          key={id}
          title={`Chunk ID: ${id}`}
          className="badge-blue text-[10px] font-mono cursor-help"
        >
          chunk-{i + 1}: {id.slice(0, 8)}…
        </span>
      ))}
    </div>
  )
}

export default CitationBadge
