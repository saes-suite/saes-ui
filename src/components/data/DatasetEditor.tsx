import React, { useState, useMemo, useEffect } from 'react'
import Papa from 'papaparse'
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  Table as TableIcon,
  Code,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { BenchmarkRecord, ValidationResponse } from '../../api/types'
import { analyzeRowByRow } from '../../lib/datasetInspection'
import { ProblematicRowsEditor } from './ProblematicRowsEditor'

interface DatasetEditorProps {
  filename: string
  records: BenchmarkRecord[]
  rawCsv: string
  validation: ValidationResponse | null
  isValidating: boolean
  apiOnline: boolean
  onBack: () => void
  onSave: (filename: string, content: string) => Promise<void>
  onSaveAndVisualize: (filename: string, content: string) => Promise<void>
  onRevalidate: (customCsv?: string) => Promise<ValidationResponse | undefined>
  onUpdateRecords: (records: BenchmarkRecord[]) => void
}

export const DatasetEditor: React.FC<DatasetEditorProps> = ({
  filename,
  records,
  rawCsv,
  validation,
  isValidating: _isValidating,
  apiOnline: _apiOnline,
  onBack,
  onSave,
  onSaveAndVisualize,
  onRevalidate,
  onUpdateRecords,
}) => {
  const [activeMode, setActiveMode] = useState<'table' | 'csv'>('table')
  const [csvText, setCsvText] = useState<string>(rawCsv)
  const [localRecords, setLocalRecords] = useState<BenchmarkRecord[]>(records)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 25

  // Keep local records and csv text in sync when props update
  useEffect(() => {
    setCsvText(rawCsv)
    setLocalRecords(records)
  }, [rawCsv, records])

  // Inspect rawCsv for row-level defects
  const rowAnalysis = useMemo(() => analyzeRowByRow(rawCsv), [rawCsv])

  // Keep records and csvText in sync when mode switches
  const handleModeChange = (mode: 'table' | 'csv') => {
    if (mode === 'csv') {
      // Re-generate CSV from localRecords
      const headers = ['algorithm', 'instance', 'metric', 'run_id', 'value', 'maximize']
      const rows = localRecords.map((r) => [
        r.algorithm,
        r.instance,
        r.metric,
        r.run_id,
        r.value,
        r.maximize ? 'True' : 'False',
      ])
      setCsvText([headers.join(','), ...rows.map((row) => row.join(','))].join('\n'))
    } else {
      // Parse CSV into localRecords
      try {
        const lines = csvText.trim().split('\n')
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
          const algoIdx = headers.indexOf('algorithm')
          const instIdx = headers.indexOf('instance')
          const metricIdx = headers.indexOf('metric')
          const runIdx = headers.indexOf('run_id')
          const valIdx = headers.indexOf('value')
          const maxIdx = headers.indexOf('maximize')

          const parsed: BenchmarkRecord[] = []
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map((c) => c.trim())
            if (row.length >= 5) {
              parsed.push({
                algorithm: algoIdx >= 0 ? row[algoIdx] : row[0] || '',
                instance: instIdx >= 0 ? row[instIdx] : row[1] || '',
                metric: metricIdx >= 0 ? row[metricIdx] : row[2] || '',
                run_id: runIdx >= 0 ? parseInt(row[runIdx] || '0', 10) : 0,
                value: valIdx >= 0 ? parseFloat(row[valIdx]) : 0,
                maximize: maxIdx >= 0 ? row[maxIdx].toLowerCase() === 'true' : false,
              })
            }
          }
          if (parsed.length > 0) {
            setLocalRecords(parsed)
          }
        }
      } catch {
        // Fallback keep current
      }
    }
    setActiveMode(mode)
  }

  // Update a single cell in localRecords
  const handleCellChange = (
    index: number,
    field: keyof BenchmarkRecord,
    val: string | number | boolean
  ) => {
    const updated = [...localRecords]
    const item = { ...updated[index] }

    if (field === 'value') {
      item.value = parseFloat(String(val)) || 0
    } else if (field === 'run_id') {
      item.run_id = parseInt(String(val), 10) || 0
    } else if (field === 'maximize') {
      item.maximize = Boolean(val)
    } else {
      // string fields
      item[field] = String(val) as never
    }

    updated[index] = item
    setLocalRecords(updated)
    setSaveStatus('idle')
  }

  // Delete a row
  const handleDeleteRow = (index: number) => {
    const updated = localRecords.filter((_, i) => i !== index)
    setLocalRecords(updated)
    setSaveStatus('idle')
  }

  // Add a new row
  const handleAddRow = () => {
    const newRecord: BenchmarkRecord = {
      algorithm: localRecords[0]?.algorithm || 'Algorithm_A',
      instance: localRecords[0]?.instance || 'Instance_1',
      metric: localRecords[0]?.metric || 'Metric_1',
      run_id: (localRecords[localRecords.length - 1]?.run_id || 0) + 1,
      value: 0,
      maximize: false,
    }
    setLocalRecords([newRecord, ...localRecords])
    setSaveStatus('idle')
    setPage(0)
  }

  // Prepare current CSV content
  const getCurrentCsv = (): string => {
    if (activeMode === 'csv') {
      return csvText
    }
    const rows = localRecords.map((r) => [
      r.algorithm,
      r.instance,
      r.metric,
      r.run_id,
      isNaN(r.value) ? '' : r.value,
      r.maximize ? 'True' : 'False',
    ])
    return Papa.unparse({
      fields: ['algorithm', 'instance', 'metric', 'run_id', 'value', 'maximize'],
      data: rows,
    })
  }

  // Handle Save
  const handleSave = async () => {
    const content = getCurrentCsv()
    setIsSaving(true)
    try {
      onUpdateRecords(localRecords)
      await onSave(filename, content)
      await onRevalidate(content)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3500)
    } catch {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Save and Visualize
  const handleSaveAndVisualize = async () => {
    const content = getCurrentCsv()
    setIsSaving(true)
    try {
      onUpdateRecords(localRecords)
      await onSaveAndVisualize(filename, content)
    } catch {
      setSaveStatus('error')
      setIsSaving(false)
    }
  }

  // Filtered rows for table mode
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return localRecords
    const q = searchQuery.toLowerCase()
    return localRecords.filter(
      (r) =>
        r.algorithm.toLowerCase().includes(q) ||
        r.instance.toLowerCase().includes(q) ||
        r.metric.toLowerCase().includes(q) ||
        String(r.value).includes(q) ||
        String(r.run_id).includes(q)
    )
  }, [localRecords, searchQuery])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginatedRows = filtered.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1 text-xs -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Datasets
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm sm:text-base">Edit Dataset</span>
            <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono text-xs font-medium">
              {filename}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium mr-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 text-xs bg-card font-medium"
          >
            <Save className="w-3.5 h-3.5 text-muted-foreground" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>

          {(validation === null || validation.is_valid) && rowAnalysis.isValid && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSaveAndVisualize}
              disabled={isSaving}
              className="gap-1.5 text-xs shadow-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              title="Save changes and proceed to visualize"
            >
              <Eye className="w-3.5 h-3.5" />
              Visualize
            </Button>
          )}
        </div>
      </div>

      {/* Validation Status Banner */}
      {validation && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            validation.is_valid
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-rose-200 bg-rose-50 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {validation.is_valid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>
              {validation.is_valid ? (
                <strong>Dataset Schema Valid:</strong>
              ) : (
                <strong>Validation Issues Detected:</strong>
              )}{' '}
              {validation.is_valid
                ? 'All required columns and data rows satisfy standard SAES format.'
                : `${validation.error_count} errors, ${validation.warning_count} warnings found.`}
            </span>
          </div>

          <Badge variant={validation.is_valid ? 'success' : 'destructive'} className="text-[10px]">
            {validation.is_valid ? 'Valid' : `${validation.error_count} Errors`}
          </Badge>
        </div>
      )}

      {/* DIRECT PROBLEMATIC ROWS EDITOR (Shows only the N rows with issues, forces fixing) */}
      {!rowAnalysis.isValid && (
        <ProblematicRowsEditor
          rawCsv={rawCsv}
          rowAnalysis={rowAnalysis}
          onSaveCsv={async (newCsv) => {
            setCsvText(newCsv)
            await onSave(filename, newCsv)
            await onRevalidate(newCsv)
          }}
          onRevalidate={async () => {
            await onRevalidate(csvText || rawCsv)
          }}
        />
      )}

      {/* Mode Switcher & Tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab Toggle: Table View vs Raw CSV */}
        <div className="flex items-center p-1 rounded-lg bg-muted border border-border/80 w-fit">
          <button
            type="button"
            onClick={() => handleModeChange('table')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'table'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Table Editor ({localRecords.length} rows)
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('csv')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'csv'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Raw CSV Text
          </button>
        </div>

        {/* Table Controls (Search & Add) */}
        {activeMode === 'table' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search rows..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(0)
                }}
                className="h-8 w-48 sm:w-56 rounded-md border border-input bg-card pl-8 pr-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="h-8 gap-1 text-xs bg-card"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              Add Row
            </Button>
          </div>
        )}
      </div>

      {/* Editor Content */}
      {activeMode === 'table' ? (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden space-y-3 p-4">
          <div className="overflow-x-auto border border-border/80 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="px-3 py-2 w-12 text-center">#</th>
                  <th className="px-3 py-2">Algorithm</th>
                  <th className="px-3 py-2">Instance</th>
                  <th className="px-3 py-2">Metric</th>
                  <th className="px-3 py-2 w-24">Run ID</th>
                  <th className="px-3 py-2 w-36">Value</th>
                  <th className="px-3 py-2 w-28">Maximize</th>
                  <th className="px-3 py-2 w-12 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((record, i) => {
                    const actualIndex = page * pageSize + i
                    return (
                      <tr key={actualIndex} className="hover:bg-muted/20">
                        <td className="px-3 py-2 text-center text-muted-foreground font-mono text-[11px]">
                          {actualIndex + 1}
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={record.algorithm}
                            onChange={(e) =>
                              handleCellChange(actualIndex, 'algorithm', e.target.value)
                            }
                            className="w-full px-2 py-1 rounded border border-border/60 bg-background text-xs font-mono focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={record.instance}
                            onChange={(e) =>
                              handleCellChange(actualIndex, 'instance', e.target.value)
                            }
                            className="w-full px-2 py-1 rounded border border-border/60 bg-background text-xs font-mono focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={record.metric}
                            onChange={(e) =>
                              handleCellChange(actualIndex, 'metric', e.target.value)
                            }
                            className="w-full px-2 py-1 rounded border border-border/60 bg-background text-xs font-mono focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            value={record.run_id}
                            onChange={(e) =>
                              handleCellChange(actualIndex, 'run_id', e.target.value)
                            }
                            className="w-full px-2 py-1 rounded border border-border/60 bg-background text-xs font-mono focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            step="any"
                            value={isNaN(record.value) ? '' : record.value}
                            onChange={(e) => handleCellChange(actualIndex, 'value', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-border/60 bg-background text-xs font-mono font-semibold text-emerald-700 focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            value={record.maximize ? 'true' : 'false'}
                            onChange={(e) =>
                              handleCellChange(actualIndex, 'maximize', e.target.value === 'true')
                            }
                            className="w-full px-2 py-1 rounded border border-border/60 bg-background text-xs font-mono focus:border-primary focus:outline-none"
                          >
                            <option value="true">True (Max)</option>
                            <option value="false">False (Min)</option>
                          </select>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(actualIndex)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete this observation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls */}
          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span className="font-mono">
              Showing {filtered.length === 0 ? 0 : page * pageSize + 1}–
              {Math.min((page + 1) * pageSize, filtered.length)} of{' '}
              {filtered.length.toLocaleString()} observations
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 font-mono text-xs">
                Page {page + 1} of {Math.max(1, totalPages)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Raw CSV Code Editor */
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Edit comma-separated values directly:</span>
            <span className="font-mono">
              {csvText.split('\n').length.toLocaleString()} lines •{' '}
              {(csvText.length / 1024).toFixed(1)} KB
            </span>
          </div>

          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value)
              setSaveStatus('idle')
            }}
            rows={22}
            className="w-full rounded-lg border border-border bg-slate-50 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
            placeholder="algorithm,instance,metric,run_id,value,maximize"
          />
        </div>
      )}

      {/* Validation Issue Inspector at bottom */}
      {validation && validation.issues.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-sm">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Detected Issues in Current Dataset
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {validation.issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-2 rounded border border-border/80 bg-muted/30 text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-rose-600">
                    [{issue.issue_type}]
                  </span>
                  <span>{issue.message}</span>
                </div>
                {issue.row_index !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    row: {issue.row_index}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
