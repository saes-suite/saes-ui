import React from 'react'
import { Palette } from 'lucide-react'
import { SelectDropdown } from '../ui/select-dropdown'

export interface ColorPaletteConfig {
  id: string
  name: string
  colors: string[]
}

export const SCIENTIFIC_PALETTES: ColorPaletteConfig[] = [
  {
    id: 'academic',
    name: 'Academic Blue',
    colors: ['#0284c7', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
  },
  {
    id: 'nature',
    name: 'Nature Publishing',
    colors: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4'],
  },
  {
    id: 'viridis',
    name: 'Viridis (Perceptual)',
    colors: ['#440154', '#3b528b', '#21908d', '#5dc963', '#fde725'],
  },
  {
    id: 'colorblind',
    name: 'Okabe-Ito (Colorblind-Safe)',
    colors: ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7', '#56B4E9'],
  },
  {
    id: 'set2',
    name: 'ColorBrewer Set2',
    colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f'],
  },
]

interface PaletteSelectorProps {
  selectedId: string
  onSelect: (paletteId: string) => void
}

export const PaletteSelector: React.FC<PaletteSelectorProps> = ({ selectedId, onSelect }) => {
  const options = SCIENTIFIC_PALETTES.map((pal) => ({
    value: pal.id,
    label: pal.name,
    swatches: pal.colors,
  }))

  return (
    <SelectDropdown
      value={selectedId}
      options={options}
      onChange={onSelect}
      icon={<Palette className="w-4 h-4" />}
      label="Palette:"
    />
  )
}

interface PaletteColorPickerProps {
  colors: string[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  label?: string
}

export const PaletteColorPicker: React.FC<PaletteColorPickerProps> = ({
  colors,
  selectedIndex,
  onSelectIndex,
  label = 'Color:',
}) => {
  const activeIdx = selectedIndex < colors.length ? selectedIndex : 0

  return (
    <div className="inline-flex items-center gap-1.5">
      {label && (
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 shadow-xs">
        {colors.map((color, idx) => {
          const isSelected = idx === activeIdx
          return (
            <button
              key={`${color}-${idx}`}
              type="button"
              onClick={() => onSelectIndex(idx)}
              title={`Color ${idx + 1} (${color})`}
              className={`w-4 h-4 rounded-full border border-black/15 transition-all ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110'
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          )
        })}
      </div>
    </div>
  )
}
