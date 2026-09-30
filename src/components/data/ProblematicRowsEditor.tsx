import React, { useState, useEffect } from 'react'
import {
  RowAnalysisResult,
  saveRowEditsToCsv,
} from '../../lib/datasetInspection'
import {
  AlertTriangle,
  AlertCircle,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

interface ProblematicRowsEditorProps {
  rawCsv: string
  rowAnalysis: RowAnalysisResult
  onSaveCsv: (newCsv: string) => Promise<void>
  onRevalidate: () => void
  isSaving?: boolean
}

interface CellIssueInfo {
  label: string
}

function getCellValidationIssue(column: string, value: string): CellIssueInfo | null {
  const trimmed = value !== undefined && value !== null ? String(value).trim() : ''
  if (!trimmed) {
    return { label: 'Empty cell' }
  }
  if (column === 'run_id') {
    if (!/^-?\d+$/.test(trimmed) || parseInt(trimmed, 10) < 0) {
      return { label: 'Integer \u2265 0 required' }
    }
  }
  if (column === 'value') {
    if (isNaN(Number(trimmed))) {
      return { label: 'NaN / Non-numeric' }
    }
  }
  if (column === 'maximize') {
    const lower = trimmed.toLowerCase()
    if (!['true', 'false', '1', '0', 'yes', 'no', 't', 'f', 'max', 'min'].includes(lower)) {
      return { label: 'True or False required' }
    }
  }
  return null
}

export const ProblematicRowsEditor: React.FC<ProblematicRowsEditorProps> = ({
  rawCsv,
  rowAnalysis,
  onSaveCsv,
  onRevalidate,
  isSaving = false,
}) => {
  // Local edits: map from rowIndex (1-indexed) to { colName: editedValue }
  const [edits, setEdits] = useState<Record<number, Record<string, string>>>({})
  const [deletedIndices, setDeletedIndices] = useState<Set<number>>(new Set())
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)

  // Reset local edits when rawCsv changes
  useEffect(() => {
    setEdits({})
    setDeletedIndices(new Set())
  }, [rawCsv])

  const handleCellEdit = (rowIndex: number, column: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [rowIndex]: {
        ...(prev[rowIndex] || {}),
        [column]: value,
      },
    }))
    setSaveFeedback(null)
  }

  const handleDeleteRow = (rowIndex: number) => {
    setDeletedIndices((prev) => {
      const next = new Set(prev)
      next.add(rowIndex)
      return next
    })
    setSaveFeedback(null)
  }

  const handleDropAllProblematic = async () => {
    const nextDeleted = new Set(deletedIndices)
    rowAnalysis.problematicRows.forEach((r) => nextDeleted.add(r.rowIndex))
    setDeletedIndices(nextDeleted)
    const newCsv = saveRowEditsToCsv(rawCsv, edits, nextDeleted)
    await onSaveCsv(newCsv)
    onRevalidate()
    setSaveFeedback('All problematic rows dropped. Re-evaluating dataset...')
  }

  const handleSaveAndReevaluate = async () => {
    const newCsv = saveRowEditsToCsv(rawCsv, edits, deletedIndices)
    await onSaveCsv(newCsv)
    onRevalidate()
    setSaveFeedback('Changes saved. Re-evaluating dataset...')
    setTimeout(() => setSaveFeedback(null), 3500)
  }

  // Active problematic rows (only the rows with errors, excluding any deleted locally)
  const activeRows = (rowAnalysis.problematicRows || []).filter(
    (r) => !deletedIndices.has(r.rowIndex)
  )

  // Count remaining cell issues across all active problematic rows
  const COLS = ['algorithm', 'instance', 'metric', 'run_id', 'value', 'maximize'] as const
  let totalIssuesCount = 0

  const rowIssuesComputed: Record<number, Record<string, CellIssueInfo>> = {}
  activeRows.forEach((row) => {
    const rIdx = row.rowIndex
    COLS.forEach((col) => {
      const currentVal =
        edits[rIdx]?.[col] !== undefined ? edits[rIdx][col] : row.cells[col] ?? ''
      const issue = getCellValidationIssue(col, currentVal)
      if (issue) {
        if (!rowIssuesComputed[rIdx]) rowIssuesComputed[rIdx] = {}
        rowIssuesComputed[rIdx][col] = issue
        totalIssuesCount++
      }
    })
  })

  const hasRemainingIssues = totalIssuesCount > 0

  // 1. If dataset is 100% valid, render clean verified banner
  if (rowAnalysis.isValid) {
    return (
      <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-emerald-950">
                Dataset 100% Valid &amp; Verified
              </h3>
              <Badge variant="success" className="text-[10px]">
                All {rowAnalysis.totalRows} rows clean
              </Badge>
            </div>
            <p className="text-xs text-emerald-800 mt-0.5">
              No missing cells, NaNs, or type inconsistencies exist. Ready for visualization and statistical analysis.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-rose-300 bg-card p-5 space-y-4 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                {activeRows.length} Defective Row{activeRows.length !== 1 ? 's' : ''} Detected
              </h3>
              <Badge variant="destructive" className="text-[10px]">
                Must Fix Before Evaluating
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Only defective rows are shown. Correct the highlighted cells or drop bad rows, then re-evaluate.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDropAllProblematic}
            disabled={isSaving || activeRows.length === 0}
            className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-300 h-8 gap-1.5"
            title="Drop all defective rows in 1 click"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            Drop All {activeRows.length} Bad Row{activeRows.length !== 1 ? 's' : ''}
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSaveAndReevaluate}
            disabled={isSaving || hasRemainingIssues}
            className={`text-xs font-semibold h-8 gap-1.5 shadow-sm transition-all ${
              hasRemainingIssues
                ? 'bg-muted text-muted-foreground border border-rose-200 opacity-60 cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
            title={
              hasRemainingIssues
                ? `Fix all ${totalIssuesCount} remaining error(s) before re-evaluating`
                : 'Save changes and re-evaluate dataset'
            }
          >
            {hasRemainingIssues ? (
              <Lock className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            )}
            {hasRemainingIssues
              ? `Save & Re-evaluate (Locked: ${totalIssuesCount} error${totalIssuesCount !== 1 ? 's' : ''})`
              : 'Save & Re-evaluate'}
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-semibold text-foreground">
            Displaying only the {activeRows.length} row{activeRows.length !== 1 ? 's' : ''} with errors
          </span>
          <span>&bull;</span>
          <span>
            {rowAnalysis.totalRows.toLocaleString()} total rows in file ({rowAnalysis.validRowsCount.toLocaleString()} valid)
          </span>
        </div>

        {saveFeedback && (
          <span className="text-[11px] font-medium text-emerald-700 animate-in fade-in">
            {saveFeedback}
          </span>
        )}
      </div>

      {/* Defective Rows Table */}
      {activeRows.length > 0 ? (
        <div className="border border-border/80 rounded-lg overflow-x-auto bg-background">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/70 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="px-3 py-2 w-16 text-center">Row #</th>
                <th className="px-3 py-2">Algorithm</th>
                <th className="px-3 py-2">Instance</th>
                <th className="px-3 py-2">Metric</th>
                <th className="px-3 py-2 w-28">Run ID</th>
                <th className="px-3 py-2 w-36">Value</th>
                <th className="px-3 py-2 w-32">Maximize</th>
                <th className="px-3 py-2 w-16 text-center">Drop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono text-[11px]">
              {activeRows.map((row) => {
                const rIdx = row.rowIndex
                const issues = rowIssuesComputed[rIdx] || {}

                const algVal = edits[rIdx]?.algorithm ?? row.cells.algorithm ?? ''
                const instVal = edits[rIdx]?.instance ?? row.cells.instance ?? ''
                const metrVal = edits[rIdx]?.metric ?? row.cells.metric ?? ''
                const runVal = edits[rIdx]?.run_id ?? row.cells.run_id ?? ''
                const valVal = edits[rIdx]?.value ?? row.cells.value ?? ''
                const maxVal = edits[rIdx]?.maximize ?? row.cells.maximize ?? ''

                const isAlgFixed = !issues.algorithm && edits[rIdx]?.algorithm !== undefined
                const isInstFixed = !issues.instance && edits[rIdx]?.instance !== undefined
                const isMetrFixed = !issues.metric && edits[rIdx]?.metric !== undefined
                const isRunFixed = !issues.run_id && edits[rIdx]?.run_id !== undefined
                const isValFixed = !issues.value && edits[rIdx]?.value !== undefined
                const isMaxFixed = !issues.maximize && edits[rIdx]?.maximize !== undefined

                return (
                  <tr key={rIdx} className="bg-rose-50/30 hover:bg-rose-50/60 transition-colors">
                    {/* Row # */}
                    <td className="px-3 py-2.5 text-center font-bold text-foreground">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-rose-200 text-rose-900 font-bold">
                        #{rIdx}
                      </span>
                    </td>

                    {/* algorithm */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={algVal}
                        onChange={(e) => handleCellEdit(rIdx, 'algorithm', e.target.value)}
                        placeholder="Algorithm name"
                        className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                          issues.algorithm
                            ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                            : isAlgFixed
                            ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950'
                            : 'border-border/70 bg-card focus:border-primary'
                        }`}
                      />
                      {issues.algorithm && (
                        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          {issues.algorithm.label}
                        </span>
                      )}
                      {isAlgFixed && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Fixed
                        </span>
                      )}
                    </td>

                    {/* instance */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={instVal}
                        onChange={(e) => handleCellEdit(rIdx, 'instance', e.target.value)}
                        placeholder="Instance name"
                        className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                          issues.instance
                            ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                            : isInstFixed
                            ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950'
                            : 'border-border/70 bg-card focus:border-primary'
                        }`}
                      />
                      {issues.instance && (
                        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          {issues.instance.label}
                        </span>
                      )}
                      {isInstFixed && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Fixed
                        </span>
                      )}
                    </td>

                    {/* metric */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={metrVal}
                        onChange={(e) => handleCellEdit(rIdx, 'metric', e.target.value)}
                        placeholder="Metric name"
                        className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                          issues.metric
                            ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                            : isMetrFixed
                            ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950'
                            : 'border-border/70 bg-card focus:border-primary'
                        }`}
                      />
                      {issues.metric && (
                        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          {issues.metric.label}
                        </span>
                      )}
                      {isMetrFixed && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Fixed
                        </span>
                      )}
                    </td>

                    {/* run_id */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={runVal}
                        onChange={(e) => handleCellEdit(rIdx, 'run_id', e.target.value)}
                        placeholder="e.g. 0, 1"
                        className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                          issues.run_id
                            ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                            : isRunFixed
                            ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950'
                            : 'border-border/70 bg-card focus:border-primary'
                        }`}
                      />
                      {issues.run_id && (
                        <span className="text-[10px] text-rose-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          {issues.run_id.label}
                        </span>
                      )}
                      {isRunFixed && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Fixed
                        </span>
                      )}
                    </td>

                    {/* value */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={valVal}
                        onChange={(e) => handleCellEdit(rIdx, 'value', e.target.value)}
                        placeholder="e.g. 0.025"
                        className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                          issues.value
                            ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                            : isValFixed
                            ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950'
                            : 'border-border/70 bg-card focus:border-primary'
                        }`}
                      />
                      {issues.value && (
                        <span className="text-[10px] text-rose-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          {issues.value.label}
                        </span>
                      )}
                      {isValFixed && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Fixed
                        </span>
                      )}
                    </td>

                    {/* maximize */}
                    <td className="px-2 py-2">
                      <select
                        value={maxVal}
                        onChange={(e) => handleCellEdit(rIdx, 'maximize', e.target.value)}
                        className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                          issues.maximize
                            ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                            : isMaxFixed
                            ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950'
                            : 'border-border/70 bg-card focus:border-primary'
                        }`}
                      >
                        <option value="" disabled>
                          Select True / False
                        </option>
                        <option value="True">True (Maximize)</option>
                        <option value="False">False (Minimize)</option>
                        {maxVal && !['true', 'false'].includes(maxVal.toLowerCase()) && (
                          <option value={maxVal} disabled>
                            Invalid: &quot;{maxVal}&quot;
                          </option>
                        )}
                      </select>
                      {issues.maximize && (
                        <span className="text-[10px] text-rose-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          {issues.maximize.label}
                        </span>
                      )}
                      {isMaxFixed && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1 leading-none">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Fixed
                        </span>
                      )}
                    </td>

                    {/* Action: Delete Row */}
                    <td className="px-2 py-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRow(rIdx)}
                        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-100"
                        title="Delete this defective row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All defective rows were deleted. Click &ldquo;Save &amp; Re-evaluate&rdquo; to finalize.</span>
          </div>
        </div>
      )}

      {/* Bottom Status Info */}
      <div className="pt-1">
        <span className="text-xs text-rose-800 font-medium flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {hasRemainingIssues
            ? `Visualization remains locked: ${totalIssuesCount} error(s) must be fixed or bad rows dropped.`
            : `All ${activeRows.length} defective row(s) corrected! Click "Save & Re-evaluate" above to verify.`}
        </span>
      </div>
    </div>
  )
}
