import React from 'react'

interface QuickChipsProps {
  onSelectChip: (text: string) => void
  disabled?: boolean
}

const CHIPS = [
  {
    label: '📊 Summarize Findings',
    prompt:
      'Summarize the statistical findings across all benchmark problem instances and metrics.',
  },
  {
    label: "🔍 Why was Welch's test chosen?",
    prompt: "Why was Welch's test chosen instead of standard Student's t-test or ANOVA?",
  },
  {
    label: '📐 Interpret Effect Sizes',
    prompt:
      "How should I interpret the calculated effect sizes (Cohen's d and eta-squared) for this benchmark?",
  },
  {
    label: '⚠️ Check Assumption Violations',
    prompt:
      "Were there any violations of normality (Shapiro-Wilk) or homoscedasticity (Levene's test) in this dataset?",
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
