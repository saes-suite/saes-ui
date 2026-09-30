import React, { useState } from 'react'
import { AppWindow, Database, Globe, Moon, Settings, Sparkles, Sun } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { SettingsModal } from './SettingsModal'
import { DatasetItem } from '../../api/types'
import { useAppearance } from '../../context/AppearanceContext'

interface HeaderProps {
  isTauri: boolean
  apiOnline: boolean
  datasets: DatasetItem[]
  selectedDatasetFilename: string | null
  currentView: 'hub' | 'fix-issues' | 'editor' | 'visualize'
  onNavigateHub: () => void
  onSelectDataset: (filename: string) => void
  onRefreshHealth: () => void
  onToggleChat: () => void
  isChatOpen: boolean
}

export const Header: React.FC<HeaderProps> = ({
  isTauri,
  apiOnline,
  datasets,
  selectedDatasetFilename,
  currentView,
  onNavigateHub,
  onSelectDataset,
  onRefreshHealth,
  onToggleChat,
  isChatOpen,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { theme, toggleTheme, fontSize, setFontSize } = useAppearance()

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-xs">
        <div className="flex h-16 sm:h-[68px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Branding & Navigation */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onNavigateHub}
              className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-xs font-bold text-lg group-hover:scale-105 transition-transform duration-200">
                Σ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-foreground text-base sm:text-lg">
                    SAES
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-medium">
                    v0.1.0
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

            {/* Breadcrumb Context indicator */}
            {currentView !== 'hub' && (
              <div className="hidden md:flex items-center gap-2 pl-3 ml-2 border-l border-border/80 text-xs sm:text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={onNavigateHub}
                  className="hover:text-foreground hover:underline transition-colors cursor-pointer"
                >
                  Datasets
                </button>
                <span>/</span>
                <span className="font-semibold text-foreground font-mono">
                  {selectedDatasetFilename || 'dataset'}
                </span>
                <span>/</span>
                <span className="capitalize text-primary font-medium">
                  {currentView === 'fix-issues'
                    ? 'Quality Fixer'
                    : currentView === 'editor'
                      ? 'Editor'
                      : 'Visualization & Stats'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Dataset Selector, Server Health, Settings */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Dataset Switcher (only if multiple datasets exist) */}
            {datasets.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-xs h-9">
                <Database className="w-3.5 h-3.5 text-primary shrink-0" />
                <select
                  value={selectedDatasetFilename || ''}
                  onChange={(e) => onSelectDataset(e.target.value)}
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer max-w-[140px] truncate"
                  title="Switch dataset"
                >
                  <option value="" disabled className="bg-popover text-foreground">
                    Switch dataset...
                  </option>
                  {datasets.map((d) => (
                    <option
                      key={d.filename}
                      value={d.filename}
                      className="bg-popover text-foreground"
                    >
                      {d.name} {d.row_count !== undefined ? `(${d.row_count} rows)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Font Size Adjuster Buttons */}
            <div
              className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-xs h-9"
              title="Ajustar tamaño de letra"
              role="group"
              aria-label="Ajustar tamaño de letra"
            >
              <button
                type="button"
                onClick={() => setFontSize('sm')}
                className={`h-7 px-2 flex items-center justify-center rounded text-xs transition-colors cursor-pointer ${
                  fontSize === 'sm'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title="Tamaño de letra: Pequeño (14px)"
                aria-label="Tamaño de letra pequeño"
              >
                <span className="text-[11px] font-semibold leading-none">A-</span>
              </button>
              <button
                type="button"
                onClick={() => setFontSize('md')}
                className={`h-7 px-2 flex items-center justify-center rounded text-xs transition-colors cursor-pointer ${
                  fontSize === 'md'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title="Tamaño de letra: Normal (16px)"
                aria-label="Tamaño de letra normal"
              >
                <span className="text-[13px] font-medium leading-none">A</span>
              </button>
              <button
                type="button"
                onClick={() => setFontSize('lg')}
                className={`h-7 px-2 flex items-center justify-center rounded text-xs transition-colors cursor-pointer ${
                  fontSize === 'lg'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title="Tamaño de letra: Grande (18px)"
                aria-label="Tamaño de letra grande"
              >
                <span className="text-[15px] font-bold leading-none">A+</span>
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

            {/* AI Consultant Drawer Trigger */}
            <Button
              type="button"
              variant={isChatOpen ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleChat}
              className="h-9 gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
              title="Toggle Statistical Consultant AI Drawer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">AI Consultant</span>
            </Button>

            {/* Server Status Pill & Settings modal trigger */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiOnline={apiOnline}
        onRefreshHealth={onRefreshHealth}
      />
    </>
  )
}
