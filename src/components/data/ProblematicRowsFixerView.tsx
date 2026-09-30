import React, { useState, useMemo } from 'react'
import { ArrowLeft, AlertTriangle, Trash2, CheckCircle2, Lock, Save, Check } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  analyzeRowByRow,
  saveRowEditsToCsv,
  getCellValidationIssue,
  CellIssueInfo,
} from '../../lib/datasetInspection'

export interface ProblematicRowsFixerViewProps {
  filename: string
  rawCsv: string
  onDiscard: () => void
  onSaveCleanDataset: (cleanCsv: string) => Promise<void>
}

const COLS = ['algorithm', 'instance', 'metric', 'run_id', 'value', 'maximize'] as const

export const ProblematicRowsFixerView: React.FC<ProblematicRowsFixerViewProps> = ({
  filename,
  rawCsv,
  onDiscard,
  onSaveCleanDataset,
}) => {
  const [edits, setEdits] = useState<Record<number, Record<string, string>>>({})
  const [deletedIndices, setDeletedIndices] = useState<Set<number>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  // Compute row analysis on the base CSV
  const baseAnalysis = useMemo(() => analyzeRowByRow(rawCsv), [rawCsv])

  const handleCellEdit = (rowIndex: number, column: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [rowIndex]: {
        ...(prev[rowIndex] || {}),
        [column]: value,
      },
    }))
  }

  const handleDeleteRow = (rowIndex: number) => {
    setDeletedIndices((prev) => {
      const next = new Set(prev)
      next.add(rowIndex)
      return next
    })
  }

  const handleDropAllBadRows = () => {
    const nextDeleted = new Set(deletedIndices)
    baseAnalysis.problematicRows.forEach((r) => nextDeleted.add(r.rowIndex))
    setDeletedIndices(nextDeleted)
  }

  // Active defective rows (excluding any deleted locally)
  const activeRows = baseAnalysis.problematicRows.filter((r) => !deletedIndices.has(r.rowIndex))

  // Check remaining issues across active defective rows
  let totalIssuesCount = 0
  const rowIssuesComputed: Record<number, Record<string, CellIssueInfo>> = {}

  activeRows.forEach((row) => {
    const rIdx = row.rowIndex
    COLS.forEach((col) => {
      const currentVal =
        edits[rIdx]?.[col] !== undefined ? edits[rIdx][col] : (row.cells[col] ?? '')
      const issue = getCellValidationIssue(col, currentVal)
      if (issue) {
        if (!rowIssuesComputed[rIdx]) rowIssuesComputed[rIdx] = {}
        rowIssuesComputed[rIdx][col] = issue
        totalIssuesCount++
      }
    })
  })

  const isClean = totalIssuesCount === 0

  const handleSave = async () => {
    if (!isClean || isSaving) return
    setIsSaving(true)
    try {
      const cleanCsv = saveRowEditsToCsv(rawCsv, edits, deletedIndices)
      await onSaveCleanDataset(cleanCsv)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Discard &amp; Back
          </Button>
          <span className="text-muted-foreground/30">|</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">
              Fix Dataset Quality Issues
            </span>
            <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono text-xs font-medium">
              {filename}
            </span>
          </div>
        </div>

        {/* Action Button: Locked until clean */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isClean ? 'default' : 'outline'}
            size="sm"
            onClick={handleSave}
            disabled={!isClean || isSaving}
            className={`gap-1.5 text-xs font-semibold shadow-xs transition-all ${
              !isClean
                ? 'opacity-60 cursor-not-allowed border-rose-300 text-rose-700 bg-rose-50/50'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title={
              !isClean
                ? `Fix all ${totalIssuesCount} remaining error(s) before dataset can be saved`
                : 'Save clean dataset and proceed to visualize'
            }
          >
            {!isClean ? (
              <>
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  Fix {totalIssuesCount} Error{totalIssuesCount !== 1 ? 's' : ''} to Save
                </span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save & Continue to Visualize'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {isClean ? (
        <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-emerald-950">
                  All Errors Resolved! Dataset is 100% Clean
                </h3>
                <Badge variant="success" className="text-[10px]">
                  Ready to Save
                </Badge>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                All defective cells have been corrected or dropped. Click &ldquo;Save &amp; Continue
                to Visualize&rdquo; above to persist this dataset.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-rose-300 bg-card p-5 space-y-4 shadow-sm">
          {/* Header info */}
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
                    Must Fix to Save
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Datasets with errors cannot be saved or analyzed. Edit the highlighted cells or
                  drop defective rows.
                </p>
              </div>
            </div>

            {/* Drop all action */}
            {activeRows.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDropAllBadRows}
                disabled={isSaving}
                className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-300 h-8 gap-1.5 shrink-0"
                title="Drop all defective rows in 1 click"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                Drop All {activeRows.length} Bad Row{activeRows.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>

          {/* Table of defective rows only */}
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
                    <tr key={rIdx} className="bg-rose-50/20 hover:bg-rose-50/40 transition-colors">
                      {/* Row # */}
                      <td className="px-3 py-2.5 text-center font-bold text-foreground">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-rose-200 text-rose-900 font-bold">
                          #{rIdx}
                        </span>
                      </td>

                      {/* algorithm */}
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={algVal}
                            onChange={(e) => handleCellEdit(rIdx, 'algorithm', e.target.value)}
                            placeholder="Algorithm"
                            className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                              issues.algorithm
                                ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                                : isAlgFixed
                                  ? 'border-emerald-400 bg-emerald-50/50 text-emerald-950'
                                  : 'border-border bg-background text-foreground'
                            }`}
                          />
                          {issues.algorithm && (
                            <span className="block text-[10px] font-sans font-medium text-rose-600 mt-0.5">
                              {issues.algorithm.label}
                            </span>
                          )}
                          {isAlgFixed && (
                            <span className="absolute right-2 top-2 text-emerald-600">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* instance */}
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={instVal}
                            onChange={(e) => handleCellEdit(rIdx, 'instance', e.target.value)}
                            placeholder="Instance"
                            className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                              issues.instance
                                ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                                : isInstFixed
                                  ? 'border-emerald-400 bg-emerald-50/50 text-emerald-950'
                                  : 'border-border bg-background text-foreground'
                            }`}
                          />
                          {issues.instance && (
                            <span className="block text-[10px] font-sans font-medium text-rose-600 mt-0.5">
                              {issues.instance.label}
                            </span>
                          )}
                          {isInstFixed && (
                            <span className="absolute right-2 top-2 text-emerald-600">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* metric */}
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={metrVal}
                            onChange={(e) => handleCellEdit(rIdx, 'metric', e.target.value)}
                            placeholder="Metric"
                            className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                              issues.metric
                                ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                                : isMetrFixed
                                  ? 'border-emerald-400 bg-emerald-50/50 text-emerald-950'
                                  : 'border-border bg-background text-foreground'
                            }`}
                          />
                          {issues.metric && (
                            <span className="block text-[10px] font-sans font-medium text-rose-600 mt-0.5">
                              {issues.metric.label}
                            </span>
                          )}
                          {isMetrFixed && (
                            <span className="absolute right-2 top-2 text-emerald-600">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* run_id */}
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={runVal}
                            onChange={(e) => handleCellEdit(rIdx, 'run_id', e.target.value)}
                            placeholder="0, 1, 2..."
                            className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                              issues.run_id
                                ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                                : isRunFixed
                                  ? 'border-emerald-400 bg-emerald-50/50 text-emerald-950'
                                  : 'border-border bg-background text-foreground'
                            }`}
                          />
                          {issues.run_id && (
                            <span className="block text-[10px] font-sans font-medium text-rose-600 mt-0.5">
                              {issues.run_id.label}
                            </span>
                          )}
                          {isRunFixed && (
                            <span className="absolute right-2 top-2 text-emerald-600">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* value */}
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={valVal}
                            onChange={(e) => handleCellEdit(rIdx, 'value', e.target.value)}
                            placeholder="Numeric float"
                            className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                              issues.value
                                ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                                : isValFixed
                                  ? 'border-emerald-400 bg-emerald-50/50 text-emerald-950'
                                  : 'border-border bg-background text-foreground'
                            }`}
                          />
                          {issues.value && (
                            <span className="block text-[10px] font-sans font-medium text-rose-600 mt-0.5">
                              {issues.value.label}
                            </span>
                          )}
                          {isValFixed && (
                            <span className="absolute right-2 top-2 text-emerald-600">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* maximize */}
                      <td className="px-2 py-2">
                        <div className="relative">
                          <select
                            value={
                              maxVal.toLowerCase() === 'true'
                                ? 'True'
                                : maxVal.toLowerCase() === 'false'
                                  ? 'False'
                                  : maxVal
                            }
                            onChange={(e) => handleCellEdit(rIdx, 'maximize', e.target.value)}
                            className={`w-full px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                              issues.maximize
                                ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold focus:ring-1 focus:ring-rose-500'
                                : isMaxFixed
                                  ? 'border-emerald-400 bg-emerald-50/50 text-emerald-950'
                                  : 'border-border bg-background text-foreground'
                            }`}
                          >
                            {issues.maximize && (
                              <option value={maxVal} disabled>
                                Invalid: &quot;{maxVal}&quot;
                              </option>
                            )}
                            <option value="True">True</option>
                            <option value="False">False</option>
                          </select>
                          {issues.maximize && (
                            <span className="block text-[10px] font-sans font-medium text-rose-600 mt-0.5">
                              {issues.maximize.label}
                            </span>
                          )}
                          {isMaxFixed && (
                            <span className="absolute right-6 top-2 text-emerald-600">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Drop row */}
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRow(rIdx)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                          title={`Drop defective row #${rIdx}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
