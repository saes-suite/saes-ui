import React from 'react'
import { ChatMessageItem } from '../../hooks/useChat'
import { MathRenderer } from './MathRenderer'
import { Bot, User, Database } from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageItem
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.role === 'assistant'

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

      <div className="flex-1 overflow-hidden space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-foreground">
              {isBot ? 'SAES Statistical Advisor' : 'Researcher'}
            </span>
            {isBot && message.contextUsed && (
              <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
                <Database className="w-2.5 h-2.5" /> Benchmark Context Active
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{message.timestamp}</span>
        </div>

        <MathRenderer content={message.content} />
      </div>
    </div>
  )
}
