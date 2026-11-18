import React, { useState } from 'react'
import { ChatMessageItem } from '../../hooks/useChat'
import { ChatArtifactCard } from './ChatArtifactCard'
import { MathRenderer } from './MathRenderer'
import {
  Bot,
  User,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Brain,
  Wrench,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageItem
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.role === 'assistant'
  const thoughts = message.thoughts || []
  const toolEvents = message.toolEvents || []
  const hasTrace = isBot && (thoughts.length > 0 || toolEvents.length > 0)
  const [traceExpanded, setTraceExpanded] = useState(false)

  const formatArgs = (args?: Record<string, unknown>) => {
    if (!args || Object.keys(args).length === 0) return ''
    try {
      const s = JSON.stringify(args)
      return s.length > 90 ? `${s.slice(0, 87)}...` : s
    } catch {
      return ''
    }
  }

  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-xl transition-all ${
        isBot
          ? 'bg-muted/30 border border-border/50'
          : 'bg-primary/10 border border-primary/20 ml-6'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs ${
          isBot
            ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      <div className="flex-1 overflow-hidden space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-foreground">
              {isBot ? 'SAES Chatbot' : 'Researcher'}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">{message.timestamp}</span>
        </div>

        {message.attachmentName && (
          <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-background/80 border border-border text-foreground font-mono">
            <Paperclip className="w-3 h-3 text-primary" />
            <span>{message.attachmentName}</span>
          </div>
        )}

        {hasTrace && (
          <div className="rounded-lg border border-border/60 bg-background/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setTraceExpanded(!traceExpanded)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                {traceExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {thoughts.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <Brain className="w-3 h-3" />
                    {thoughts.length} thought{thoughts.length > 1 ? 's' : ''}
                  </span>
                )}
                {thoughts.length > 0 && toolEvents.length > 0 && <span>·</span>}
                {toolEvents.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Wrench className="w-3 h-3" />
                    {toolEvents.length} tool{toolEvents.length > 1 ? 's' : ''}
                  </span>
                )}
              </span>

              <span className="flex items-center gap-1">
                {toolEvents.some((e) => e.status === 'running') && (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                )}
                <span className="text-[9px] uppercase tracking-wider opacity-75">
                  {traceExpanded ? 'Hide' : 'Details'}
                </span>
              </span>
            </button>

            {traceExpanded && (
              <div className="px-2.5 py-2 border-t border-border/50 space-y-2 bg-muted/20 text-[11px]">
                {thoughts.map((t, idx) => (
                  <div
                    key={`thought-${idx}`}
                    className="flex items-start gap-1.5 text-muted-foreground"
                  >
                    <Brain className="w-3 h-3 text-purple-500 shrink-0 mt-0.5" />
                    <div className="italic whitespace-pre-wrap leading-snug">{t}</div>
                  </div>
                ))}

                {toolEvents.map((ev, idx) => {
                  const argsText = formatArgs(ev.arguments)
                  return (
                    <div
                      key={`tool-${ev.tool}-${idx}`}
                      className="flex items-start gap-1.5 text-foreground/90"
                    >
                      {ev.status === 'running' ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-500 shrink-0 mt-0.5" />
                      ) : ev.status === 'error' ? (
                        <AlertCircle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                          <span className="font-semibold text-foreground">{ev.tool}</span>
                          {argsText && (
                            <span className="text-muted-foreground truncate max-w-full">
                              ({argsText})
                            </span>
                          )}
                        </div>
                        {ev.summary && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            → {ev.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          {message.content ? (
            <MathRenderer content={message.content} />
          ) : (
            isBot &&
            message.isStreaming && (
              <div className="flex items-center gap-1.5 py-1 text-muted-foreground text-xs">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:0.15s]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:0.3s]" />
                <span className="text-[11px] ml-1 text-muted-foreground/80">
                  Running agent tools & analyzing...
                </span>
              </div>
            )
          )}
          {message.content && isBot && message.isStreaming && (
            <span className="inline-block w-1.5 h-3.5 bg-primary/80 animate-pulse ml-0.5 align-middle rounded-[1px]" />
          )}
        </div>

        {isBot && message.artifacts && message.artifacts.length > 0 && (
          <div className="space-y-2 pt-1">
            {message.artifacts.map((art) => (
              <ChatArtifactCard key={art.id} artifact={art} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
