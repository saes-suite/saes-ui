import React, { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, X, RotateCcw, Bot, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '../ui/button'
import { ChatMessage } from './ChatMessage'
import { QuickChips } from './QuickChips'
import { ChatMessageItem } from '../../hooks/useChat'

interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessageItem[]
  isLoading: boolean
  error: string | null
  onSendMessage: (query: string) => void
  onClearHistory: () => void
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isLoading,
  error,
  onSendMessage,
  onClearHistory,
}) => {
  const [input, setInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isLoading) return
    onSendMessage(input)
    setInput('')
  }

  const handleChipClick = (prompt: string) => {
    onSendMessage(prompt)
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'w-[95vw] sm:w-[680px] h-[85vh]' : 'w-[92vw] sm:w-[460px] h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              SAES AI Statistical Consultant
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Powered by fast API /api/v1/chat & Statistical Decision Rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClearHistory}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted hidden sm:block"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground">
            <Bot className="w-4 h-4 animate-bounce text-purple-400" />
            <span>Analyzing statistical models & formulating recommendation...</span>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      <div className="px-4 py-2 border-t border-border/40 bg-muted/20">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
          Suggested Inquiries
        </span>
        <QuickChips onSelectChip={handleChipClick} disabled={isLoading} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-border/60 bg-background flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about effect sizes, normality violations, Welch tests..."
          disabled={isLoading}
          className="flex-1 h-9 rounded-lg border border-input bg-muted/40 px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || isLoading}
          className="h-9 px-3 gap-1 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  )
}
