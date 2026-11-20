import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export const MIN_ZOOM = 70
export const MAX_ZOOM = 160
export const DEFAULT_ZOOM = 100
export const ZOOM_STEP = 5

export interface AppearanceContextType {
  theme: Theme
  zoom: number
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setZoom: (zoom: number | ((prev: number) => number)) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'saes_theme'
const ZOOM_STORAGE_KEY = 'saes_zoom'

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [zoom, setZoomState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_ZOOM
    const storedZoom = localStorage.getItem(ZOOM_STORAGE_KEY)
    if (storedZoom) {
      const parsed = Number(storedZoom)
      if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
        return parsed
      }
    }
    return DEFAULT_ZOOM
  })

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  // Apply zoom to document root via root font-size
  useEffect(() => {
    const root = document.documentElement
    const baseFontSizePx = (zoom / 100) * 16
    root.style.fontSize = `${baseFontSizePx}px`
    root.setAttribute('data-zoom', String(zoom))
    localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom))
    window.dispatchEvent(new Event('resize'))
  }, [zoom])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setZoom = (value: number | ((prev: number) => number)) => {
    setZoomState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(next)))
    })
  }

  const zoomIn = () => {
    setZoom((prev) => prev + ZOOM_STEP)
  }

  const zoomOut = () => {
    setZoom((prev) => prev - ZOOM_STEP)
  }

  const resetZoom = () => {
    setZoom(DEFAULT_ZOOM)
  }

  return (
    <AppearanceContext.Provider
      value={{
        theme,
        zoom,
        setTheme,
        toggleTheme,
        setZoom,
        zoomIn,
        zoomOut,
        resetZoom,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance(): AppearanceContextType {
  const context = useContext(AppearanceContext)
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider')
  }
  return context
}
