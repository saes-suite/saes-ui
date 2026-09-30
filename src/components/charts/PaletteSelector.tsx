import React from 'react'
import { Palette } from 'lucide-react'

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
  return (
    <div className="flex items-center gap-2">
      <Palette className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Palette:</span>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
      >
        {SCIENTIFIC_PALETTES.map((pal) => (
          <option key={pal.id} value={pal.id}>
            {pal.name}
          </option>
        ))}
      </select>

      {/* Palette swatches preview */}
      <div className="flex items-center gap-0.5 ml-1">
        {SCIENTIFIC_PALETTES.find((p) => p.id === selectedId)
          ?.colors.slice(0, 5)
          .map((color, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full border border-black/20"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
      </div>
    </div>
  )
}
