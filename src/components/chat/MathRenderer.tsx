import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

interface MathRendererProps {
  content: string
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-xs max-w-none break-words leading-relaxed text-xs">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-foreground mb-2 mt-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-foreground mb-1.5 mt-2.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-sky-300 mb-1 mt-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 mt-1.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed text-foreground/90">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-2 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-2 pl-1">{children}</ol>
          ),
          li: ({ children }) => <li className="text-xs text-foreground/90">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-2.5 my-2 italic text-muted-foreground bg-primary/5 py-1 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px] text-pink-300">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="p-2.5 rounded-lg bg-black/40 border border-border/50 font-mono text-[11px] overflow-x-auto my-2">
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
