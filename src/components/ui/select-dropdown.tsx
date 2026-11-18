import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SelectOption {
  value: string | number
  label: string
  group?: string
  desc?: string
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
  fullWidth?: boolean
  disabled?: boolean
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
  fullWidth = false,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0]

  const groupedOptions = useMemo(() => {
    const groups: { name?: string; items: SelectOption[] }[] = []
    let currentGroup: string | undefined = undefined
    let currentItems: SelectOption[] = []

    for (const opt of options) {
      if (opt.group !== currentGroup) {
        if (currentItems.length > 0) {
          groups.push({ name: currentGroup, items: currentItems })
        }
        currentGroup = opt.group
        currentItems = [opt]
      } else {
        currentItems.push(opt)
      }
    }
    if (currentItems.length > 0) {
      groups.push({ name: currentGroup, items: currentItems })
    }
    return groups
  }, [options])

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

  const isFull = fullWidth || className?.includes('w-full')

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex items-center gap-1.5',
        isFull && 'w-full flex',
        className
      )}
    >
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      {label && (
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          {label}
        </span>
      )}

      <div className={cn('relative', isFull && 'w-full flex-1')}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen((prev) => !prev)
            }
          }}
          className={cn(
            'h-9 inline-flex items-center justify-between gap-2.5 rounded-lg border border-input bg-background pl-3 pr-3.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent/50 hover:border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer',
            isFull && 'w-full',
            open && 'border-primary/60 ring-1 ring-primary/30',
            disabled && 'opacity-60 cursor-not-allowed hover:bg-background hover:border-input',
            triggerClassName
          )}
        >
          <span className="flex items-center gap-1.5 truncate text-left">
            {selectedOption?.swatches && (
              <span className="flex items-center -space-x-1 mr-1 shrink-0">
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
              'w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-150 ml-1.5',
              open && 'rotate-180 text-foreground'
            )}
          />
        </button>

        {open && (
          <div
            className={cn(
              'absolute z-50 mt-1.5 min-w-full w-max max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-100',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {groupedOptions.map((group, gIdx) => (
              <div key={group.name ?? `grp-${gIdx}`}>
                {group.name && (
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border/40 mb-1 mt-1.5 first:mt-0">
                    {group.name}
                  </div>
                )}
                {group.items.map((opt) => {
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
                        'w-full flex items-center justify-between gap-3 rounded-md pl-2.5 pr-3 py-1.5 text-xs text-left transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <div className="flex flex-col truncate pr-2">
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
                        {opt.desc && (
                          <span className="text-[10px] text-muted-foreground font-normal truncate mt-0.5">
                            {opt.desc}
                          </span>
                        )}
                      </div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
