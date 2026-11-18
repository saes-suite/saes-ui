import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

interface MathRendererProps {
  content: string
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  return (
    <div className="max-w-none break-words leading-relaxed text-xs text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-foreground mb-2 mt-3 first:mt-0 border-b border-border/50 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[13px] font-bold text-foreground mb-1.5 mt-2.5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-primary mb-1 mt-2 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-1.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed text-foreground/90">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside space-y-1 mb-2 pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside space-y-1 mb-2 pl-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-xs text-foreground/90 leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/60 pl-2.5 my-2 italic text-muted-foreground bg-primary/5 py-1.5 rounded-r">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-2.5 border-border/60" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full text-left border-collapse text-[11px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/70 text-foreground font-semibold">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/50 bg-card/40">{children}</tbody>
          ),
          tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
          th: ({ children }) => (
            <th className="px-2.5 py-1.5 font-semibold text-foreground border-b border-border/70 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 text-foreground/90 align-top">{children}</td>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className && className.includes('language-'))
            if (isBlock) {
              return (
                <code className={`${className || ''} font-mono text-[11px] text-foreground`}>
                  {children}
                </code>
              )
            }
            return (
              <code className="px-1 py-0.5 rounded bg-muted/80 border border-border/40 font-mono text-[11px] text-primary">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="p-2.5 rounded-lg bg-muted/60 border border-border/70 font-mono text-[11px] overflow-x-auto my-2 text-foreground">
              {children}
            </pre>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
