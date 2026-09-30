import React from 'react'
import { Check, AlertCircle, HelpCircle } from 'lucide-react'
import { CellAnalysis } from '../../api/types'

interface AssumptionBadgesProps {
  cell: CellAnalysis
  onClickDetails?: () => void
}

export const AssumptionBadges: React.FC<AssumptionBadgesProps> = ({ cell, onClickDetails }) => {
  const assumptions = cell.assumptions
  const normPassed = assumptions?.normality?.passed
  const homoscedPassed = assumptions?.homoscedasticity?.passed

  return (
    <div
      onClick={onClickDetails}
      className="inline-flex items-center gap-1.5 cursor-pointer group hover:opacity-80 transition-opacity"
      title="Click to view detailed Shapiro-Wilk & Levene assumption diagnostics"
    >
      {/* Normality Badge */}
      {normPassed !== undefined ? (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
            normPassed
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
          }`}
        >
          {normPassed ? <Check className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
          Norm
        </span>
      ) : null}

      {/* Homoscedasticity Badge */}
      {homoscedPassed !== undefined ? (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
            homoscedPassed
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
          }`}
        >
          {homoscedPassed ? (
            <Check className="w-2.5 h-2.5" />
          ) : (
            <AlertCircle className="w-2.5 h-2.5" />
          )}
          VarEq
        </span>
      ) : null}

      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  )
}
