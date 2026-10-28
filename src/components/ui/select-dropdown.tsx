import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SelectOption {
  value: string | number
  label: string
  swatches?: string[]
}

interface SelectDropdownProps {
  value: string | number
  options: SelectOption[]
  onChange: (value: string) => void
  icon?: React.ReactNode
  label?: string
  className?: string
  triggerClassName?: string
  align?: 'left' | 'right'
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  options,
  onChange,
  icon,
  label,
  className,
  triggerClassName,
  align = 'left',
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative inline-flex items-center gap-1.5', className)}>
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      {label && (
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          {label}
        </span>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            'h-8 inline-flex items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent/50 hover:border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            open && 'border-primary/60 ring-1 ring-primary/30',
            triggerClassName
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.swatches && (
              <span className="flex items-center -space-x-1 mr-0.5">
                {selectedOption.swatches.slice(0, 5).map((color, idx) => (
                  <span
                    key={idx}
                    className="w-3 h-3 rounded-full border border-background shadow-2xs"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            )}
            <span className="truncate">{selectedOption?.label ?? value}</span>
          </span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-150',
              open && 'rotate-180 text-foreground'
            )}
          />
        </button>

        {open && (
          <div
            className={cn(
              'absolute z-50 mt-1.5 min-w-full w-max max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-100',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(String(opt.value))
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors',
                    isSelected
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.swatches && (
                      <span className="flex items-center gap-0.5 shrink-0">
                        {opt.swatches.slice(0, 5).map((color, i) => (
                          <span
                            key={i}
                            className="w-3 h-3 rounded-full border border-black/20"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  <Check
                    className={cn(
                      'w-3.5 h-3.5 shrink-0 text-primary transition-opacity',
                      isSelected ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
