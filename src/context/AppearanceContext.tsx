import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
export type FontSize = 'sm' | 'md' | 'lg'

interface AppearanceContextType {
  theme: Theme
  fontSize: FontSize
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setFontSize: (size: FontSize) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'saes_theme'
const FONT_SIZE_STORAGE_KEY = 'saes_font_size'

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: '14px',
  md: '16px',
  lg: '18px',
}

const FONT_SIZE_ORDER: FontSize[] = ['sm', 'md', 'lg']

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window === 'undefined') return 'md'
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY)
    if (stored === 'sm' || stored === 'md' || stored === 'lg') return stored
    return 'md'
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

  // Apply font size to document root
  useEffect(() => {
    const root = document.documentElement
    root.style.fontSize = FONT_SIZE_MAP[fontSize]
    root.setAttribute('data-font-size', fontSize)
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize)
  }, [fontSize])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
  }

  const increaseFontSize = () => {
    setFontSizeState((prev) => {
      const idx = FONT_SIZE_ORDER.indexOf(prev)
      if (idx < FONT_SIZE_ORDER.length - 1) {
        return FONT_SIZE_ORDER[idx + 1]
      }
      return prev
    })
  }

  const decreaseFontSize = () => {
    setFontSizeState((prev) => {
      const idx = FONT_SIZE_ORDER.indexOf(prev)
      if (idx > 0) {
        return FONT_SIZE_ORDER[idx - 1]
      }
      return prev
    })
  }

  return (
    <AppearanceContext.Provider
      value={{
        theme,
        fontSize,
        setTheme,
        toggleTheme,
        setFontSize,
        increaseFontSize,
        decreaseFontSize,
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
