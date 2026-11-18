import React, { useState, useRef, useEffect } from 'react'
import { AppWindow, Globe, Moon, Settings, Sun, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { SettingsModal } from './SettingsModal'
import { useAppearance, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../../context/AppearanceContext'

interface HeaderProps {
  isTauri: boolean
  apiOnline: boolean
  onNavigateHub: () => void
  onRefreshHealth: () => void
  onToggleChat?: () => void
  isChatOpen?: boolean
  onOpenSettings?: (tab?: 'server' | 'ai') => void
}

export const Header: React.FC<HeaderProps> = ({
  isTauri,
  apiOnline,
  onNavigateHub,
  onRefreshHealth,
  onOpenSettings,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { theme, toggleTheme, zoom, setZoom, zoomIn, zoomOut, resetZoom } = useAppearance()

  // Decouple drag/hold interactions from document reflow to eliminate layout oscillation
  const [localZoom, setLocalZoom] = useState(zoom)
  const isPointerDownRef = useRef(false)

  // Keep localZoom in sync when zoom changes externally (e.g. + / - buttons or reset)
  useEffect(() => {
    if (!isPointerDownRef.current) {
      setLocalZoom(zoom)
    }
  }, [zoom])

  // Commit zoom when pointer is released anywhere on screen
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isPointerDownRef.current) {
        isPointerDownRef.current = false
        setZoom(localZoom)
      }
    }
    window.addEventListener('pointerup', handleGlobalPointerUp)
    window.addEventListener('pointercancel', handleGlobalPointerUp)
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp)
      window.removeEventListener('pointercancel', handleGlobalPointerUp)
    }
  }, [localZoom, setZoom])

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-xs">
        <div className="max-w-7xl mx-auto flex min-h-16 sm:min-h-[68px] items-center justify-between px-4 sm:px-6 lg:px-8 py-1.5">
          {/* Left: Branding & Navigation */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onNavigateHub}
              className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
            >
              <img
                src="/saes-logo.svg"
                alt="SAES Logo"
                className="w-9 h-9 rounded-lg shadow-xs group-hover:scale-105 transition-transform duration-200 object-contain"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-foreground text-base sm:text-lg">
                    SAES
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-medium">
                    v{__APP_VERSION__}
                  </span>
                  {/* Runtime Badge */}
                  {isTauri ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 py-0.5"
                    >
                      <AppWindow className="w-2.5 h-2.5" /> Desktop
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 py-0.5"
                    >
                      <Globe className="w-2.5 h-2.5" /> Web
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Right: Zoom, Server Health, Settings */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Zoom Range Slider Control */}
            <div
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-border bg-card px-2 sm:px-2.5 shadow-xs h-9 shrink-0 select-none"
              title={`Zoom: ${localZoom}% (clic en el porcentaje para restablecer al 100%)`}
              role="group"
              aria-label="Control de zoom"
            >
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                title={`Disminuir zoom (-${ZOOM_STEP}%)`}
                aria-label="Disminuir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                value={localZoom}
                onPointerDown={() => {
                  isPointerDownRef.current = true
                }}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setLocalZoom(val)
                  // If adjusted via keyboard or non-pointer event, commit directly
                  if (!isPointerDownRef.current) {
                    setZoom(val)
                  }
                }}
                onPointerUp={(e) => {
                  isPointerDownRef.current = false
                  const val = Number((e.target as HTMLInputElement).value)
                  setLocalZoom(val)
                  setZoom(val)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    zoomIn()
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    zoomOut()
                  }
                }}
                style={
                  {
                    '--zoom-percent': `${((localZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%`,
                  } as React.CSSProperties
                }
                className="zoom-slider w-[72px] sm:w-[88px] md:w-[100px] cursor-pointer"
                title={`Nivel de zoom: ${localZoom}%`}
                aria-label="Barra deslizante de zoom"
              />

              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                title={`Aumentar zoom (+${ZOOM_STEP}%)`}
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={resetZoom}
                className="text-[11px] font-mono font-medium text-muted-foreground hover:text-primary hover:bg-muted/60 rounded px-1 py-0.5 transition-colors cursor-pointer select-none tabular-nums shrink-0 min-w-[34px] text-center"
                title="Restablecer zoom al 100%"
                aria-label="Restablecer zoom al 100%"
              >
                {localZoom}%
              </button>
            </div>

            {/* Theme Toggle Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0 cursor-pointer shadow-xs border-border bg-card hover:bg-muted/50 text-foreground shrink-0"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </Button>

            {/* Server Status Pill & Settings modal trigger */}
            <button
              type="button"
              onClick={() => (onOpenSettings ? onOpenSettings('server') : setIsSettingsOpen(true))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors shadow-xs h-9 cursor-pointer ${
                apiOnline
                  ? 'border-border bg-card hover:bg-muted/50 text-foreground'
                  : 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50'
              }`}
              title={
                apiOnline
                  ? 'API Connected — Click to view settings'
                  : 'API Disconnected — Click to configure API connection'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  apiOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                }`}
              />
              <span className="text-[11px] font-medium hidden lg:inline">
                {apiOnline ? 'API Connected' : 'API Disconnected'}
              </span>
              <Settings className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal (fallback if onOpenSettings not managed externally) */}
      {!onOpenSettings && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          apiOnline={apiOnline}
          onRefreshHealth={onRefreshHealth}
        />
      )}
    </>
  )
}
