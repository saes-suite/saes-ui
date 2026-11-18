import React from 'react'

interface QuickChipsProps {
  onSelectChip: (text: string) => void
  disabled?: boolean
}

const CHIPS = [
  {
    label: '📂 List Datasets',
    prompt: 'List all uploaded datasets and tell me which ones are valid.',
  },
  {
    label: '📊 Extract KPIs',
    prompt: 'Extract KPIs and performance summary for the active dataset.',
  },
  {
    label: '🧪 Normality & Test Advice',
    prompt:
      'Check normality and homoscedasticity assumptions on this dataset and recommend the best statistical tests.',
  },
  {
    label: '📈 Plot CD Diagram',
    prompt:
      'Generate and show a critical-distance diagram for the active dataset right here in chat.',
  },
  {
    label: '📋 Generate Table',
    prompt: 'Generate a statistical comparison table for the active dataset and show it here.',
  },
  {
    label: '✨ Create Sample Dataset',
    prompt:
      'Create a valid sample SAES benchmark dataset with 3 algorithms and 3 instances, save it, and open it in Visualize.',
  },
]

export const QuickChips: React.FC<QuickChipsProps> = ({ onSelectChip, disabled = false }) => {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {CHIPS.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          disabled={disabled}
          onClick={() => onSelectChip(chip.prompt)}
          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted/60 hover:bg-primary/20 hover:text-primary hover:border-primary/40 border border-border/60 text-muted-foreground transition-all duration-150 disabled:opacity-50 cursor-pointer text-left"
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
