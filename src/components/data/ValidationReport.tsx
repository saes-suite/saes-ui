import React from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, ShieldCheck, Columns } from 'lucide-react'
import { ValidationResponse } from '../../api/types'
import { Badge } from '../ui/badge'

interface ValidationReportProps {
  validation: ValidationResponse | null
  isValidating: boolean
}

export const ValidationReport: React.FC<ValidationReportProps> = ({ validation, isValidating }) => {
  if (isValidating) {
    return (
      <div className="flex items-center justify-center p-8 rounded-xl border border-border/60 bg-card/40">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Performing automated schema and statistical health checks...
        </div>
      </div>
    )
  }

  if (!validation) {
    return null
  }

  const requiredColumns = [
    { name: 'algorithm', desc: 'Algorithm name (categorical)' },
    { name: 'instance', desc: 'Problem instance / benchmark function' },
    { name: 'metric', desc: 'Performance indicator (e.g. IGD, HV, EP)' },
    { name: 'run_id', desc: 'Independent replicate identifier (integer)' },
    { name: 'value', desc: 'Numerical evaluation result (float)' },
    { name: 'maximize', desc: 'Optimization direction (boolean)' },
  ]

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-5 space-y-4">
      {/* Header with status badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              validation.is_valid
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/15 text-rose-400'
            }`}
          >
            {validation.is_valid ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Schema & Structural Validation Report
              {validation.is_valid ? (
                <Badge variant="success">Validated — Ready for Analysis</Badge>
              ) : (
                <Badge variant="destructive">Validation Failed</Badge>
              )}
            </h4>
            <p className="text-xs text-muted-foreground">
              {validation.is_valid
                ? 'Dataset satisfies all SAES structural and numerical consistency criteria.'
                : 'Dataset contains critical errors that must be resolved before statistical testing.'}
            </p>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/60 text-xs font-mono">
            <span className="text-rose-400 font-bold">{validation.error_count}</span> errors
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/60 text-xs font-mono">
            <span className="text-amber-400 font-bold">{validation.warning_count}</span> warnings
          </span>
        </div>
      </div>

      {/* Required Columns Verification Grid */}
      <div>
        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Columns className="w-3.5 h-3.5" /> Required Column Schemas
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {requiredColumns.map((col) => {
            const isMissing = validation.issues.some(
              (i) => i.severity === 'ERROR' && i.column === col.name
            )
            return (
              <div
                key={col.name}
                className={`p-2 rounded border text-xs ${
                  isMissing
                    ? 'border-rose-500/40 bg-rose-500/5 text-rose-300'
                    : 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono font-semibold">{col.name}</span>
                  {isMissing ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{col.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Issues List (Errors & Warnings) */}
      {validation.issues.length > 0 && (
        <div className="space-y-1.5">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Issues & Diagnostic Notes
          </h5>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {validation.issues.map((issue, idx) => {
              const isError = issue.severity.toUpperCase() === 'ERROR'
              const isWarning = issue.severity.toUpperCase() === 'WARNING'
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 p-2 rounded-lg text-xs border ${
                    isError
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                      : isWarning
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                  }`}
                >
                  {isError && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                  {isWarning && (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  {!isError && !isWarning && (
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[11px]">[{issue.issue_type}]</span>
                      {issue.column && (
                        <span className="text-[10px] px-1 rounded bg-black/20 font-mono">
                          col: {issue.column}
                        </span>
                      )}
                      {issue.row_index !== null && issue.row_index !== undefined && (
                        <span className="text-[10px] px-1 rounded bg-black/20 font-mono">
                          row: {issue.row_index}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs opacity-90">{issue.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
