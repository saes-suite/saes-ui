import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Sparkles,
  X,
  RotateCcw,
  Bot,
  Maximize2,
  Minimize2,
  Cpu,
  Zap,
  Flame,
  Settings,
  Paperclip,
} from 'lucide-react'
import { Button } from '../ui/button'
import { ChatMessage } from './ChatMessage'
import { QuickChips } from './QuickChips'
import { ChatAttachment, ChatMessageItem } from '../../hooks/useChat'
import { useAISettings } from '../../context/AISettingsContext'

interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessageItem[]
  isLoading: boolean
  error: string | null
  attachment: ChatAttachment | null
  onAttachFile: (file: File) => void
  onClearAttachment: () => void
  onSendMessage: (query: string) => void
  onClearHistory: () => void
  onOpenSettings?: () => void
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isLoading,
  error,
  attachment,
  onAttachFile,
  onClearAttachment,
  onSendMessage,
  onClearHistory,
  onOpenSettings,
}) => {
  const { settings: aiSettings } = useAISettings()
  const [input, setInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isNearBottomRef = useRef(true)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight
    isNearBottomRef.current = distanceToBottom < 80
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen && isNearBottomRef.current) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !attachment) || isLoading) return
    isNearBottomRef.current = true
    onSendMessage(input)
    setInput('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onAttachFile(file)
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv')) {
      onAttachFile(file)
    }
  }

  const handleChipClick = (prompt: string) => {
    isNearBottomRef.current = true
    onSendMessage(prompt)
  }

  const getProviderBadge = () => {
    if (aiSettings.provider === 'local') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          <Cpu className="w-3 h-3" />
          Local: {aiSettings.localModel}
        </span>
      )
    }
    if (aiSettings.provider === 'openai') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 font-medium">
          <Zap className="w-3 h-3" />
          OpenAI: {aiSettings.openaiModel}
        </span>
      )
    }
    if (aiSettings.provider === 'anthropic') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-medium">
          <Sparkles className="w-3 h-3" />
          Claude: {aiSettings.anthropicModel.split('-')[1] || aiSettings.anthropicModel}
        </span>
      )
    }
    if (aiSettings.provider === 'gemini') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
          <Flame className="w-3 h-3" />
          Gemini: {aiSettings.geminiModel}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
        <Cpu className="w-3 h-3" />
        Local: {aiSettings.localModel || 'Not selected'}
      </span>
    )
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`fixed bottom-4 right-4 z-50 flex flex-col bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ${
        isDragging ? 'border-primary ring-2 ring-primary/40' : 'border-border'
      } ${isExpanded ? 'w-[95vw] sm:w-[680px] h-[85vh]' : 'w-[92vw] sm:w-[460px] h-[600px]'} ${
        isOpen
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none invisible'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              SAES Chatbot
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted text-[10px] transition-colors border border-border/50 cursor-pointer"
                title="Configure AI Engine & Models"
              >
                {getProviderBadge()}
                <Settings className="w-2.5 h-2.5 text-muted-foreground ml-0.5" />
              </button>
            </div>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3" onScroll={handleScroll}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (!messages.length || messages[messages.length - 1].role !== 'assistant') && (
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

      {/* Staged CSV Attachment Pill */}
      {attachment && (
        <div className="px-3 py-1.5 border-t border-border/50 bg-primary/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-foreground font-mono truncate">
            <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{attachment.filename}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              ({Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={onClearAttachment}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-border/60 bg-background flex items-center gap-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
          title="Upload or attach a CSV dataset for the agent to inspect/fix"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </Button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            attachment
              ? `Ask about ${attachment.filename} (e.g. "Check & fix this dataset")...`
              : 'Ask the agent to inspect, fix, create datasets, KPIs, or navigate...'
          }
          disabled={isLoading}
          className="flex-1 h-9 rounded-lg border border-input bg-muted/40 px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        <Button
          type="submit"
          size="sm"
          disabled={(!input.trim() && !attachment) || isLoading}
          className="h-9 px-3 gap-1 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  )
}
