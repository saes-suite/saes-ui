import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { apiClient } from '../../api/client'
import { useAISettings } from '../../context/AISettingsContext'
import { AISettings, ProviderProbeResponse } from '../../api/types'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Play,
  PlusCircle,
  RefreshCw,
  Server,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  apiOnline: boolean
  onRefreshHealth: () => void
  initialTab?: 'server' | 'ai'
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiOnline,
  onRefreshHealth,
  initialTab = 'server',
}) => {
  const { settings: savedAiSettings, updateSettings: saveAiSettings } = useAISettings()

  const [activeTab, setActiveTab] = useState<'server' | 'ai'>(initialTab)
  const [apiUrl, setApiUrl] = useState<string>(() => apiClient.getBaseUrl())
  const [serverTestStatus, setServerTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'failed'
  >('idle')

  // Form copy of AI settings
  const [aiForm, setAiForm] = useState<AISettings>(savedAiSettings)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)

  // Probe & Model Discovery State per Provider
  const [probeStatus, setProbeStatus] = useState<'idle' | 'probing' | 'success' | 'error'>('idle')
  const [probeResult, setProbeResult] = useState<ProviderProbeResponse | null>(null)
  const [isStartingOllama, setIsStartingOllama] = useState(false)

  // Ollama Model Downloader State
  const [showPullForm, setShowPullForm] = useState(false)
  const [pullModelName, setPullModelName] = useState('')
  const [isPullingModel, setIsPullingModel] = useState(false)
  const [pullProgress, setPullProgress] = useState<{
    status: string
    completed?: number
    total?: number
    percent?: number
  } | null>(null)
  const [pullMessage, setPullMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // When opening modal, sync states
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setApiUrl(apiClient.getBaseUrl())
      setAiForm(savedAiSettings)
      setServerTestStatus('idle')
      setProbeStatus('idle')
      setProbeResult(null)
      setIsStartingOllama(false)
      setShowPullForm(false)
      setPullModelName('')
      setIsPullingModel(false)
      setPullProgress(null)
      setPullMessage(null)
    }
  }, [isOpen, initialTab, savedAiSettings])

  // Reset probe state when changing provider card
  const handleSelectProvider = (prov: AISettings['provider']) => {
    setAiForm((prev) => ({ ...prev, provider: prov }))
    setProbeStatus('idle')
    setProbeResult(null)
    setShowPullForm(false)
    setPullProgress(null)
    setPullMessage(null)
  }

  const handleSave = () => {
    // 1. Save Backend Server URL
    apiClient.setBaseUrl(apiUrl.trim())
    if (typeof window !== 'undefined') {
      localStorage.setItem('saes_api_url', apiUrl.trim())
    }
    onRefreshHealth()

    // 2. Save AI Configuration
    saveAiSettings(aiForm)

    onClose()
  }

  const handleTestServerConnection = async () => {
    setServerTestStatus('testing')
    try {
      apiClient.setBaseUrl(apiUrl.trim())
      const health = await apiClient.getHealth()
      if (health.status === 'ok') {
        setServerTestStatus('success')
        onRefreshHealth()
      } else {
        setServerTestStatus('failed')
      }
    } catch {
      setServerTestStatus('failed')
    }
  }

  // Connect & Probe active provider to list available models
  const handleConnectAndFetchModels = async () => {
    setProbeStatus('probing')
    setProbeResult(null)

    try {
      let apiKey: string | undefined
      let baseUrl: string | undefined

      if (aiForm.provider === 'local') {
        baseUrl = aiForm.localBaseUrl
      } else if (aiForm.provider === 'openai') {
        apiKey = aiForm.openaiApiKey
        baseUrl = aiForm.openaiBaseUrl
      } else if (aiForm.provider === 'anthropic') {
        apiKey = aiForm.anthropicApiKey
      } else if (aiForm.provider === 'gemini') {
        apiKey = aiForm.geminiApiKey
      }

      const res = await apiClient.probeProvider(aiForm.provider, apiKey, baseUrl)
      setProbeResult(res)

      if (res.status === 'ok') {
        setProbeStatus('success')
        if (res.models.length > 0) {
          // If current model not in available models, pick the first one
          if (aiForm.provider === 'local' && !res.models.includes(aiForm.localModel)) {
            setAiForm((prev) => ({ ...prev, localModel: res.models[0] }))
          } else if (aiForm.provider === 'gemini' && !res.models.includes(aiForm.geminiModel)) {
            setAiForm((prev) => ({ ...prev, geminiModel: res.models[0] }))
          } else if (aiForm.provider === 'openai' && !res.models.includes(aiForm.openaiModel)) {
            setAiForm((prev) => ({ ...prev, openaiModel: res.models[0] }))
          } else if (
            aiForm.provider === 'anthropic' &&
            !res.models.includes(aiForm.anthropicModel)
          ) {
            setAiForm((prev) => ({ ...prev, anthropicModel: res.models[0] }))
          }
          if (aiForm.provider === 'local') {
            setShowPullForm(false)
          }
        } else {
          if (aiForm.provider === 'local') {
            setShowPullForm(true)
          }
        }
      } else {
        setProbeStatus('error')
      }
    } catch (err: unknown) {
      setProbeStatus('error')
      setProbeResult({
        status: 'error',
        models: [],
        message: err instanceof Error ? err.message : 'Connection failed to backend server.',
      })
    }
  }

  // Attempt to start local Ollama server
  const handleStartOllamaDaemon = async () => {
    setIsStartingOllama(true)
    try {
      await apiClient.startOllama()
      // Wait 1.5s for service to bind port, then re-probe
      setTimeout(async () => {
        setIsStartingOllama(false)
        await handleConnectAndFetchModels()
      }, 1500)
    } catch {
      setIsStartingOllama(false)
      await handleConnectAndFetchModels()
    }
  }

  // Download / Pull model into local Ollama with real-time streaming progress
  const handlePullModel = async (nameToPull?: string) => {
    const target = (nameToPull || pullModelName).trim()
    if (!target) return
    setIsPullingModel(true)
    setPullMessage(null)
    setPullProgress({ status: 'Connecting to Ollama...', percent: 0 })
    try {
      const res = await apiClient.pullOllamaModelStream(target, aiForm.localBaseUrl, (progress) => {
        setPullProgress(progress)
      })
      if (res.status === 'ok') {
        setPullMessage({
          type: 'success',
          text: `Model '${target}' downloaded and installed successfully in Ollama.`,
        })
        setAiForm((prev) => ({ ...prev, localModel: target }))
        // Refresh models list
        const updated = await apiClient.probeProvider('local', undefined, aiForm.localBaseUrl)
        setProbeResult(updated)
        if (updated.status === 'ok') {
          setProbeStatus('success')
        }
        setShowPullForm(false)
      }
    } catch (err: unknown) {
      setPullMessage({
        type: 'error',
        text: err instanceof Error ? err.message : `Failed to download '${target}'.`,
      })
    } finally {
      setIsPullingModel(false)
      setPullProgress(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Application Settings
          </DialogTitle>
          <DialogDescription>
            Configure SAES backend server connection and AI consultant providers.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/80 gap-2 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('server')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'server'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Backend Server
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            AI Provider & Models
          </button>
        </div>

        {/* Tab 1: Server Settings */}
        {activeTab === 'server' && (
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">SAES API Server URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => {
                    setApiUrl(e.target.value)
                    setServerTestStatus('idle')
                  }}
                  placeholder="http://127.0.0.1:8060"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestServerConnection}
                  disabled={serverTestStatus === 'testing'}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  {serverTestStatus === 'testing' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Status:</span>
                {apiOnline || serverTestStatus === 'success' ? (
                  <span className="flex items-center gap-1 text-emerald-500 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Connected (FastAPI v{__APP_VERSION__})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                    <XCircle className="w-4 h-4" /> Standalone / Server Offline
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefreshHealth}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Recheck
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                💡 <strong>Server command:</strong> To launch the FastAPI server in the background:
              </p>
              <pre className="p-2 bg-muted/60 rounded text-[11px] font-mono text-foreground overflow-x-auto">
                cd ../saes && make start-api
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: AI Provider Settings */}
        {activeTab === 'ai' && (
          <div className="space-y-4 py-3">
            {/* Provider Selection Cards */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select AI Engine
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                {/* Local Ollama */}
                <button
                  type="button"
                  onClick={() => handleSelectProvider('local')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiForm.provider === 'local'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-foreground">Local AI</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Ollama / LM Studio (Private hardware execution)
                  </p>
                </button>

                {/* Google Gemini */}
                <button
                  type="button"
                  onClick={() => handleSelectProvider('gemini')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiForm.provider === 'gemini'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-foreground">Google Gemini</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Gemini 3.5 & Flash models (BYOK)
                  </p>
                </button>

                {/* OpenAI */}
                <button
                  type="button"
                  onClick={() => handleSelectProvider('openai')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiForm.provider === 'openai'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-sky-500" />
                    <span className="text-xs font-bold text-foreground">OpenAI</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    GPT-4o & GPT-4o-mini (BYOK)
                  </p>
                </button>

                {/* Anthropic Claude */}
                <button
                  type="button"
                  onClick={() => handleSelectProvider('anthropic')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiForm.provider === 'anthropic'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold text-foreground">Anthropic</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Claude 3.5 Sonnet & Haiku (BYOK)
                  </p>
                </button>
              </div>
            </div>

            {/* Provider 1: Local AI (Ollama) */}
            {aiForm.provider === 'local' && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                    Local Ollama Connection
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    100% Private (No data sent to cloud)
                  </span>
                </div>

                {/* Step 1: Base URL */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Server Base URL</label>
                  <input
                    type="text"
                    value={aiForm.localBaseUrl}
                    onChange={(e) =>
                      setAiForm((prev) => ({ ...prev, localBaseUrl: e.target.value }))
                    }
                    placeholder="http://localhost:11434"
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Step 2: Connect & Probe Button */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={probeStatus === 'success' ? 'secondary' : 'default'}
                    onClick={handleConnectAndFetchModels}
                    disabled={probeStatus === 'probing' || isStartingOllama}
                    className="text-xs flex items-center gap-1.5 h-8"
                  >
                    {probeStatus === 'probing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {probeStatus === 'success' ? 'Re-scan Models' : 'Connect & Scan Models'}
                  </Button>

                  {probeStatus === 'success' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ollama Running
                    </span>
                  )}
                </div>

                {/* Probe Feedback / Ollama Start or Download Helpers */}
                {probeResult && probeResult.status === 'binary_found_not_running' && (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Ollama is installed on your computer, but the service is stopped.</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleStartOllamaDaemon}
                      disabled={isStartingOllama}
                      className="text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 h-7"
                    >
                      {isStartingOllama ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Start Ollama Server
                    </Button>
                  </div>
                )}

                {probeResult && probeResult.status === 'not_installed' && (
                  <div className="p-3.5 rounded-lg border border-border bg-background space-y-2 text-xs">
                    <p className="text-foreground font-semibold flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-primary" />
                      Ollama is not installed on this computer
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      To run local AI models on your hardware with complete privacy (no cloud
                      connections or API keys required), you need to have Ollama installed on your
                      system:
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <a
                        href="https://ollama.com/download"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Download official installer from ollama.com{' '}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Or install directly from terminal (macOS / Linux):
                    </p>
                    <pre className="p-1.5 bg-muted rounded text-[10px] font-mono text-foreground overflow-x-auto select-all">
                      curl -fsSL https://ollama.com/install.sh | sh
                    </pre>
                  </div>
                )}

                {/* Step 3: Show Model Dropdown & Puller once Connected */}
                {probeStatus === 'success' && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">
                          Installed Ollama Models ({probeResult?.models.length || 0})
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowPullForm(!showPullForm)
                            setPullMessage(null)
                          }}
                          className="h-6 px-2 text-[11px] font-semibold text-primary hover:text-primary flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          {showPullForm ? 'Hide Form' : 'Add / Pull Models'}
                        </Button>
                      </div>

                      {probeResult && probeResult.models.length > 0 ? (
                        <select
                          value={aiForm.localModel}
                          onChange={(e) =>
                            setAiForm((prev) => ({ ...prev, localModel: e.target.value }))
                          }
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="" disabled>
                            -- Select a local model --
                          </option>
                          {probeResult.models.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 space-y-2">
                          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Ollama is running on your machine, but no models are installed yet.
                          </p>
                          {!showPullForm && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setShowPullForm(true)}
                              className="h-7 text-xs flex items-center gap-1.5"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Download your first model
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Integrated Ollama Model Downloader (Expandable Form) */}
                    {showPullForm && (
                      <div className="p-3.5 rounded-lg border border-border/80 bg-card space-y-3 shadow-xs animate-in fade-in-50 duration-200">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5 text-primary" />
                            Pull Model into Ollama
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPullForm(false)}
                            className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                          >
                            ✕ Hide
                          </button>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-tight">
                          Enter a model tag or click one of the recommended models below:
                        </p>

                        {/* Quick Suggestions Chips */}
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { name: 'llama3.2', desc: '3B' },
                            { name: 'llama3.2:1b', desc: '1B Fast' },
                            { name: 'qwen2.5:7b', desc: '7B' },
                            { name: 'phi3:mini', desc: '3.8B' },
                            { name: 'deepseek-r1:8b', desc: '8B Reasoning' },
                          ].map((item) => (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => {
                                setPullModelName(item.name)
                                handlePullModel(item.name)
                              }}
                              disabled={isPullingModel}
                              className="px-2 py-0.5 rounded text-[10px] border border-border bg-muted/60 hover:bg-primary/10 hover:border-primary text-foreground transition-colors disabled:opacity-50"
                            >
                              <strong>{item.name}</strong>{' '}
                              <span className="text-muted-foreground text-[9px]">
                                ({item.desc})
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Download Form */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={pullModelName}
                            onChange={(e) => setPullModelName(e.target.value)}
                            placeholder="e.g. llama3.2, mistral, gemma2:2b"
                            disabled={isPullingModel}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm font-mono placeholder:font-sans"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handlePullModel()}
                            disabled={isPullingModel || !pullModelName.trim()}
                            className="h-8 text-xs shrink-0 flex items-center gap-1.5"
                          >
                            {isPullingModel ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Pulling...
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                Pull Model
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Progress Bar & Details */}
                        {isPullingModel && (
                          <div className="space-y-1.5 p-3 rounded-lg bg-muted/60 border border-border/60">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground flex items-center gap-1.5 truncate max-w-[75%]">
                                <RefreshCw className="w-3 h-3 animate-spin text-primary shrink-0" />
                                {pullProgress?.status || 'Downloading model...'}
                              </span>
                              <span className="font-mono font-bold text-primary shrink-0">
                                {pullProgress?.percent !== undefined
                                  ? `${pullProgress.percent}%`
                                  : ''}
                              </span>
                            </div>

                            {/* Progress track */}
                            <div className="w-full bg-muted-foreground/20 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-full bg-primary transition-all duration-300 ease-out ${
                                  pullProgress?.percent === undefined
                                    ? 'w-full animate-pulse opacity-70'
                                    : ''
                                }`}
                                style={{
                                  width:
                                    pullProgress?.percent !== undefined
                                      ? `${pullProgress.percent}%`
                                      : undefined,
                                }}
                              />
                            </div>

                            {pullProgress?.completed && pullProgress?.total ? (
                              <div className="flex justify-between text-[10px] text-muted-foreground font-mono pt-0.5">
                                <span>{formatBytes(pullProgress.completed)} downloaded</span>
                                <span>Total: {formatBytes(pullProgress.total)}</span>
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                Connecting to Ollama servers...
                              </p>
                            )}
                          </div>
                        )}

                        {pullMessage && (
                          <div
                            className={`p-2 rounded text-xs flex items-center gap-1.5 ${
                              pullMessage.type === 'success'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-destructive/10 text-destructive border border-destructive/20'
                            }`}
                          >
                            {pullMessage.type === 'success' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="text-[11px]">{pullMessage.text}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Provider 3: Google Gemini */}
            {aiForm.provider === 'gemini' && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Google Gemini Configuration (Bring Your Own Key)
                </span>

                {/* Step 1: API Key */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Google AI API Key</label>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={aiForm.geminiApiKey}
                      onChange={(e) => {
                        setAiForm((prev) => ({ ...prev, geminiApiKey: e.target.value }))
                        setProbeStatus('idle')
                        setProbeResult(null)
                      }}
                      placeholder="AIzaSy..."
                      className="flex h-8 w-full rounded-md border border-input bg-background pl-3 pr-8 text-xs shadow-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      {showGeminiKey ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 2: Connect Button */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConnectAndFetchModels}
                    disabled={probeStatus === 'probing' || !aiForm.geminiApiKey.trim()}
                    className="text-xs flex items-center gap-1.5 h-8"
                  >
                    {probeStatus === 'probing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Connect & Load Models
                  </Button>

                  {probeStatus === 'success' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected to Google AI
                    </span>
                  )}
                </div>

                {probeResult && probeStatus === 'error' && (
                  <p className="text-[11px] p-2 rounded-lg bg-destructive/10 text-destructive font-mono">
                    {probeResult.message}
                  </p>
                )}

                {/* Step 3: Dynamic Model Dropdown once Connected */}
                {probeStatus === 'success' && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <label className="text-xs font-medium text-foreground">
                      Available Models ({probeResult?.models.length || 0})
                    </label>
                    {probeResult && probeResult.models.length > 0 ? (
                      <select
                        value={aiForm.geminiModel}
                        onChange={(e) =>
                          setAiForm((prev) => ({ ...prev, geminiModel: e.target.value }))
                        }
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                      >
                        <option value="" disabled>
                          -- Select a model from Google AI --
                        </option>
                        {probeResult.models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No models with content generation permissions found for this key.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Provider 4: OpenAI */}
            {aiForm.provider === 'openai' && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-sky-500" />
                  OpenAI Configuration (Bring Your Own Key)
                </span>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">OpenAI API Key</label>
                  <div className="relative">
                    <input
                      type={showOpenAIKey ? 'text' : 'password'}
                      value={aiForm.openaiApiKey}
                      onChange={(e) => {
                        setAiForm((prev) => ({ ...prev, openaiApiKey: e.target.value }))
                        setProbeStatus('idle')
                        setProbeResult(null)
                      }}
                      placeholder="sk-proj-..."
                      className="flex h-8 w-full rounded-md border border-input bg-background pl-3 pr-8 text-xs shadow-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      {showOpenAIKey ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConnectAndFetchModels}
                    disabled={probeStatus === 'probing' || !aiForm.openaiApiKey.trim()}
                    className="text-xs flex items-center gap-1.5 h-8"
                  >
                    {probeStatus === 'probing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Connect & Load Models
                  </Button>

                  {probeStatus === 'success' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected to OpenAI
                    </span>
                  )}
                </div>

                {probeResult && probeStatus === 'error' && (
                  <p className="text-[11px] p-2 rounded-lg bg-destructive/10 text-destructive font-mono">
                    {probeResult.message}
                  </p>
                )}

                {probeStatus === 'success' && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <label className="text-xs font-medium text-foreground">
                      Available Models ({probeResult?.models.length || 0})
                    </label>
                    {probeResult && probeResult.models.length > 0 ? (
                      <select
                        value={aiForm.openaiModel}
                        onChange={(e) =>
                          setAiForm((prev) => ({ ...prev, openaiModel: e.target.value }))
                        }
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                      >
                        <option value="" disabled>
                          -- Select a model from OpenAI --
                        </option>
                        {probeResult.models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No compatible models found for this API Key.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Provider 5: Anthropic */}
            {aiForm.provider === 'anthropic' && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  Anthropic Claude Configuration (Bring Your Own Key)
                </span>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Anthropic API Key</label>
                  <div className="relative">
                    <input
                      type={showAnthropicKey ? 'text' : 'password'}
                      value={aiForm.anthropicApiKey}
                      onChange={(e) => {
                        setAiForm((prev) => ({ ...prev, anthropicApiKey: e.target.value }))
                        setProbeStatus('idle')
                        setProbeResult(null)
                      }}
                      placeholder="sk-ant-api03-..."
                      className="flex h-8 w-full rounded-md border border-input bg-background pl-3 pr-8 text-xs shadow-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      {showAnthropicKey ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConnectAndFetchModels}
                    disabled={probeStatus === 'probing' || !aiForm.anthropicApiKey.trim()}
                    className="text-xs flex items-center gap-1.5 h-8"
                  >
                    {probeStatus === 'probing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Connect & Load Models
                  </Button>

                  {probeStatus === 'success' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected to Anthropic
                    </span>
                  )}
                </div>

                {probeResult && probeStatus === 'error' && (
                  <p className="text-[11px] p-2 rounded-lg bg-destructive/10 text-destructive font-mono">
                    {probeResult.message}
                  </p>
                )}

                {probeStatus === 'success' && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <label className="text-xs font-medium text-foreground">
                      Available Models ({probeResult?.models.length || 0})
                    </label>
                    {probeResult && probeResult.models.length > 0 ? (
                      <select
                        value={aiForm.anthropicModel}
                        onChange={(e) =>
                          setAiForm((prev) => ({ ...prev, anthropicModel: e.target.value }))
                        }
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                      >
                        <option value="" disabled>
                          -- Select a model from Anthropic --
                        </option>
                        {probeResult.models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No available models found for this API Key.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
