import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Badge } from '../ui/badge'
import { CellAnalysis } from '../../api/types'
import { CheckCircle2, AlertTriangle, Scale, Activity, Layers, Info } from 'lucide-react'

interface AssumptionDrawerProps {
  cell: CellAnalysis | null
  isOpen: boolean
  onClose: () => void
  alpha: number
}

export const AssumptionDrawer: React.FC<AssumptionDrawerProps> = ({
  cell,
  isOpen,
  onClose,
  alpha,
}) => {
  if (!cell) return null

  const assumptions = cell.assumptions
  const normality = assumptions?.normality
  const homoscedasticity = assumptions?.homoscedasticity
  const sampleSizes = assumptions?.sample_sizes

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">
                Assumption Verification & Test Selection Rationale
              </DialogTitle>
              <DialogDescription className="text-xs">
                {cell.instance} — Metric: <strong className="text-foreground">{cell.metric}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Selected Test & Rationale Card */}
          <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Selected Statistical Test
              </span>
              <Badge variant="default" className="text-xs font-mono">
                {cell.test_name}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-foreground/90">
              {assumptions?.decision_reasoning ||
                `The statistical test '${cell.test_name}' was automatically selected by evaluating data normality and homoscedasticity against significance threshold α = ${alpha}.`}
            </p>
          </div>

          {/* 1. Normality (Shapiro-Wilk) */}
          <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                {normality?.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                1. Normality Check ({normality?.test || 'Shapiro-Wilk'})
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  normality?.passed
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                }`}
              >
                {normality?.passed ? 'Normality Met' : 'Violation Detected'}
              </span>
            </div>

            <p className="text-muted-foreground text-[11px]">
              Assesses whether metric observations for each algorithm follow a Gaussian distribution
              ($H_0$: data is normally distributed).
            </p>

            {normality?.p_values && Object.keys(normality.p_values).length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                {Object.entries(normality.p_values).map(([algo, pVal]) => (
                  <div
                    key={algo}
                    className="p-1.5 rounded bg-muted/40 border border-border/40 flex items-center justify-between"
                  >
                    <span className="text-muted-foreground truncate">{algo}:</span>
                    <span
                      className={`font-semibold ${
                        pVal >= alpha ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      p = {pVal.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Homoscedasticity (Levene's Test) */}
          <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                {homoscedasticity?.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                2. Homogeneity of Variances ({homoscedasticity?.test || "Levene's Test"})
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  homoscedasticity?.passed
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                }`}
              >
                {homoscedasticity?.passed ? 'Equal Variances' : 'Heteroscedastic'}
              </span>
            </div>

            <p className="text-muted-foreground text-[11px]">
              Verifies if variance across algorithmic runs is equivalent ($H_0: \sigma_1^2 =
              \sigma_2^2$). When violated, Welch&apos;s Satterthwaite approximation adjusts degrees
              of freedom.
            </p>

            {homoscedasticity?.p_value !== undefined && (
              <div className="p-2 rounded bg-muted/40 border border-border/40 flex items-center justify-between font-mono">
                <span className="text-muted-foreground">Levene Statistic p-value:</span>
                <span
                  className={`font-bold ${
                    homoscedasticity.passed ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  p = {homoscedasticity.p_value.toFixed(4)} (
                  {homoscedasticity.passed ? `≥ α=${alpha}` : `< α=${alpha}`})
                </span>
              </div>
            )}
          </div>

          {/* 3. Sample Size & Balance */}
          {sampleSizes && Object.keys(sampleSizes).length > 0 && (
            <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  3. Experimental Sample Size
                </span>
                <span className="text-muted-foreground font-mono">
                  Total N = {Object.values(sampleSizes).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 font-mono">
                {Object.entries(sampleSizes).map(([algo, n]) => (
                  <span
                    key={algo}
                    className="px-2 py-0.5 rounded bg-muted text-[11px] border border-border/50 text-foreground"
                  >
                    {algo}: <strong>{n}</strong> runs
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warnings (if any) */}
          {cell.warnings && cell.warnings.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
              <span className="font-semibold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Statistical Diagnostic Warnings:
              </span>
              <ul className="list-disc list-inside space-y-0.5 pl-1 opacity-90">
                {cell.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
