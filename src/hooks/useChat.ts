import { useState, useCallback, useRef, useEffect } from 'react'
import { apiClient } from '../api/client'
import { AnalysisResponse, ChatArtifact, ToolCallEvent, UIAction } from '../api/types'
import { useAISettings } from '../context/AISettingsContext'

export interface ChatAttachment {
  filename: string
  content: string
  sizeBytes: number
}

export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  contextUsed?: boolean
  isStreaming?: boolean
  attachmentName?: string
  thoughts?: string[]
  toolEvents?: ToolCallEvent[]
  artifacts?: ChatArtifact[]
}

const CHAT_STORAGE_KEY = 'saes_chat_history_v1'

function createWelcomeMessage(): ChatMessageItem {
  return {
    id: 'welcome',
    role: 'assistant',
    content: `### Welcome to SAES Statistical Consultant 🔬

I am your embedded AI agent. I can:
- **Inspect, validate, repair, or create** SAES CSV datasets (drag & drop or attach a CSV below!)
- **Extract KPIs** and dataset diagnostics across algorithms, instances, and metrics
- **Test normality & homoscedasticity** and recommend the right statistical tests
- **Run SAES analyses** (hypothesis tests, rankings, tables, performance profiles, power, reproducibility) and **navigate the UI** for you

Try a quick chip below or attach a dataset to get started!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

function loadStoredMessages(): ChatMessageItem[] {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return [createWelcomeMessage()]
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((m) => ({
        ...m,
        isStreaming: false,
      })) as ChatMessageItem[]
    }
  } catch {
    // Ignore storage parse errors and fall back to welcome message
  }
  return [createWelcomeMessage()]
}

export function useChat(
  rawCsv: string | null,
  _analysis: AnalysisResponse | null,
  alpha: number = 0.05,
  datasetName: string | null = null,
  currentView: string | null = null,
  currentTab: string | null = null,
  onUIAction?: (action: UIAction) => void
) {
  const { settings: aiSettings } = useAISettings()
  const [messages, setMessages] = useState<ChatMessageItem[]>(loadStoredMessages)

  useEffect(() => {
    try {
      const toStore = messages.map((m) => ({ ...m, isStreaming: false }))
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      // Ignore storage quota errors
    }
  }, [messages])
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const attachFile = useCallback(async (file: File) => {
    const text = await file.text()
    setAttachment({
      filename: file.name,
      content: text,
      sizeBytes: file.size,
    })
  }, [])

  const clearAttachment = useCallback(() => {
    setAttachment(null)
  }, [])

  const sendMessage = useCallback(
    async (queryText: string) => {
      if (!queryText.trim() && !attachment) return

      const effectiveQuery =
        queryText.trim() || `Please inspect the uploaded dataset "${attachment?.filename}".`
      const currentAttachment = attachment
      if (currentAttachment) {
        setAttachment(null)
      }

      const userMsg: ChatMessageItem = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: effectiveQuery,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachmentName: currentAttachment?.filename,
      }

      const botId = `bot-${Date.now()}`
      const botMsg: ChatMessageItem = {
        id: botId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contextUsed: false,
        isStreaming: true,
        thoughts: [],
        toolEvents: [],
        artifacts: [],
      }

      const historyPayload = messages
        .filter((m) => m.id !== 'welcome' && m.id !== 'reset' && m.content.trim().length > 0)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      setMessages((prev) => [...prev, userMsg, botMsg])
      setIsLoading(true)
      setError(null)

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      let accumulatedText = ''
      let contextWasUsed = false

      try {
        let model: string | undefined
        let apiKey: string | undefined
        let baseUrl: string | undefined

        if (aiSettings.provider === 'local') {
          model = aiSettings.localModel
          baseUrl = aiSettings.localBaseUrl
        } else if (aiSettings.provider === 'openai') {
          model = aiSettings.openaiModel
          apiKey = aiSettings.openaiApiKey || undefined
          baseUrl = aiSettings.openaiBaseUrl || undefined
        } else if (aiSettings.provider === 'anthropic') {
          model = aiSettings.anthropicModel
          apiKey = aiSettings.anthropicApiKey || undefined
        } else if (aiSettings.provider === 'gemini') {
          model = aiSettings.geminiModel
          apiKey = aiSettings.geminiApiKey || undefined
        }

        const chatReq = {
          query: effectiveQuery,
          dataset_name: datasetName || undefined,
          csv_data: rawCsv || undefined,
          attached_csv: currentAttachment?.content || undefined,
          attached_filename: currentAttachment?.filename || undefined,
          current_view: currentView || undefined,
          current_tab: currentTab || undefined,
          history: historyPayload,
          alpha: alpha,
          provider: aiSettings.provider,
          model,
          api_key: apiKey,
          base_url: baseUrl,
        }

        try {
          const res = await apiClient.chatStream(
            chatReq,
            (token, contextUsed) => {
              accumulatedText += token
              contextWasUsed = contextUsed
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botId
                    ? {
                        ...msg,
                        content: accumulatedText,
                        contextUsed: contextWasUsed,
                        isStreaming: true,
                      }
                    : msg
                )
              )
            },
            abortControllerRef.current.signal,
            {
              onThought: (thought) => {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botId
                      ? {
                          ...msg,
                          thoughts: [...(msg.thoughts || []), thought],
                        }
                      : msg
                  )
                )
              },
              onToolCall: (tool, args) => {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botId
                      ? {
                          ...msg,
                          toolEvents: [
                            ...(msg.toolEvents || []),
                            { tool, status: 'running', arguments: args },
                          ],
                        }
                      : msg
                  )
                )
              },
              onToolResult: (tool, ok, summary) => {
                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id !== botId) return msg
                    const events = [...(msg.toolEvents || [])]
                    const idx = [...events]
                      .reverse()
                      .findIndex((e) => e.tool === tool && e.status === 'running')
                    const targetIdx = idx >= 0 ? events.length - 1 - idx : -1
                    const prevArgs = targetIdx >= 0 ? events[targetIdx].arguments : undefined
                    const updated: ToolCallEvent = {
                      tool,
                      status: ok ? 'done' : 'error',
                      arguments: prevArgs,
                      summary,
                    }
                    if (targetIdx >= 0) {
                      events[targetIdx] = updated
                    } else {
                      events.push(updated)
                    }
                    return { ...msg, toolEvents: events }
                  })
                )
              },
              onUIAction: (action) => {
                onUIAction?.(action)
              },
              onArtifact: (artifact) => {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botId
                      ? {
                          ...msg,
                          artifacts: [...(msg.artifacts || []), artifact],
                        }
                      : msg
                  )
                )
              },
            }
          )
          accumulatedText = res.fullText
          contextWasUsed = res.contextUsed
        } catch {
          if (!accumulatedText) {
            try {
              const res = await apiClient.chat(chatReq)
              accumulatedText = res.response
              contextWasUsed = res.context_used
              res.ui_actions?.forEach((act) => onUIAction?.(act))
              if (res.artifacts && res.artifacts.length > 0) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botId
                      ? {
                          ...msg,
                          artifacts: [...(msg.artifacts || []), ...(res.artifacts || [])],
                        }
                      : msg
                  )
                )
              }
            } catch {
              accumulatedText =
                '⚠️ **Backend API unreachable.** Please ensure the SAES backend (`:8060` / `:8070`) and your configured AI provider are running.'
              contextWasUsed = false
            }
          } else {
            accumulatedText += '\n\n*(Stream disconnected)*'
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botId
              ? {
                  ...msg,
                  content: accumulatedText,
                  contextUsed: contextWasUsed,
                  isStreaming: false,
                  toolEvents: (msg.toolEvents || []).map((ev) =>
                    ev.status === 'running' ? { ...ev, status: 'done' } : ev
                  ),
                }
              : msg
          )
        )
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    },
    [
      rawCsv,
      alpha,
      datasetName,
      currentView,
      currentTab,
      aiSettings,
      attachment,
      messages,
      onUIAction,
    ]
  )

  const clearHistory = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    setAttachment(null)
    setMessages([createWelcomeMessage()])
  }, [])

  return {
    messages,
    isOpen,
    setIsOpen,
    isLoading,
    error,
    attachment,
    attachFile,
    clearAttachment,
    sendMessage,
    clearHistory,
  }
}
