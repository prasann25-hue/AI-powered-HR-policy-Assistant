import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MarkdownRenderer = ({ content }) => {
  if (!content) return null

  return (
    <div className="prose-hr text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block rendering
          code({ node, inline, className, children, ...props }) {
            return inline ? (
              <code className={className} {...props}>{children}</code>
            ) : (
              <pre className="bg-muted rounded-lg p-3 overflow-x-auto my-2">
                <code className="text-xs text-accent font-mono" {...props}>{children}</code>
              </pre>
            )
          },
          // Open links in new tab safely
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            )
          },
          // Table styling
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2">
                <table className="w-full text-xs border-collapse border border-border rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            )
          },
          th({ children }) {
            return <th className="bg-muted px-3 py-2 text-left font-semibold border border-border">{children}</th>
          },
          td({ children }) {
            return <td className="px-3 py-2 border border-border">{children}</td>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
