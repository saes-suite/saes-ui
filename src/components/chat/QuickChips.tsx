import React from 'react'

interface QuickChipsProps {
  onSelectChip: (text: string) => void
  disabled?: boolean
}

const CHIPS = [
  {
    label: '💡 Friedman vs ANOVA',
    prompt: 'When should I use Friedman + Nemenyi instead of ANOVA to compare algorithms?',
  },
  {
    label: '📂 List Datasets',
    prompt: 'Which datasets do I currently have in SAES?',
  },
  {
    label: '🧪 Check Assumptions',
    prompt: 'Check normality and homoscedasticity assumptions and recommend statistical tests.',
  },
  {
    label: '📊 Generate Boxplot',
    prompt: 'Generate a boxplot comparing the algorithms.',
  },
  {
    label: '📈 Plot CD Diagram',
    prompt: 'Generate a critical-distance diagram and show it here in chat.',
  },
  {
    label: '✨ Create Sample Dataset',
    prompt: 'Create a valid sample SAES benchmark dataset with 3 algorithms and 3 instances.',
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
