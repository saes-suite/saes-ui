import React, { createContext, useContext, useEffect, useState } from 'react'
import { AISettings } from '../api/types'

interface AISettingsContextType {
  settings: AISettings
  updateSettings: (partial: Partial<AISettings>) => void
  resetSettings: () => void
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'local',
  localBaseUrl: 'http://localhost:11434',
  localModel: '',
  openaiApiKey: '',
  openaiModel: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  anthropicApiKey: '',
  anthropicModel: '',
  geminiApiKey: '',
  geminiModel: '',
}

const STORAGE_KEY = 'saes_ai_settings'

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined)

export const AISettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AISettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AISettings> & { provider?: string }
        const merged = { ...DEFAULT_AI_SETTINGS, ...parsed }
        if ((merged.provider as string) === 'offline') {
          merged.provider = 'local'
        }
        return merged
      }
    } catch {
      // fallback to defaults on parse error
    }
    return DEFAULT_AI_SETTINGS
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }
  }, [settings])

  const updateSettings = (partial: Partial<AISettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }

  const resetSettings = () => {
    setSettings(DEFAULT_AI_SETTINGS)
  }

  return (
    <AISettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </AISettingsContext.Provider>
  )
}

export const useAISettings = (): AISettingsContextType => {
  const ctx = useContext(AISettingsContext)
  if (!ctx) {
    throw new Error('useAISettings must be used within an AISettingsProvider')
  }
  return ctx
}
