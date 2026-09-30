import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  DatasetStructureResult,
  REQUIRED_COLUMNS,
  RequiredColumn,
  ColumnType,
} from '../../lib/datasetInspection'
import {
  Columns,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Tag,
  Hash,
  Activity,
  CheckSquare,
} from 'lucide-react'

interface ColumnMappingModalProps {
  isOpen: boolean
  filename: string
  structureResult: DatasetStructureResult | null
  onConfirmMapping: (mapping: Record<string, string>) => void
  onCancel: () => void
}

const REQUIRED_INFO: Record<
  RequiredColumn,
  { label: string; desc: string; expectedType: ColumnType; typeLabel: string }
> = {
  algorithm: {
    label: 'Algorithm (algorithm)',
    desc: 'Name of the method, heuristic, or algorithm evaluated.',
    expectedType: 'categorical',
    typeLabel: 'Categorical (String)',
  },
  instance: {
    label: 'Instance (instance)',
    desc: 'Problem name, benchmark function, or test scenario.',
    expectedType: 'categorical',
    typeLabel: 'Categorical (String)',
  },
  metric: {
    label: 'Metric (metric)',
    desc: 'Performance metric name (e.g. HV, IGD, Runtime).',
    expectedType: 'categorical',
    typeLabel: 'Categorical (String)',
  },
  run_id: {
    label: 'Run ID (run_id)',
    desc: 'Integer identifier for independent replication runs.',
    expectedType: 'integer',
    typeLabel: 'Non-negative Integer',
  },
  value: {
    label: 'Numeric Value (value)',
    desc: 'Quantitative result or continuous metric observation.',
    expectedType: 'float',
    typeLabel: 'Numeric (Float/Decimal)',
  },
  maximize: {
    label: 'Goal Direction (maximize)',
    desc: 'Indicates whether higher is better (True) or worse (False).',
    expectedType: 'boolean',
    typeLabel: 'Boolean (True/False)',
  },
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  filename,
  structureResult,
  onConfirmMapping,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [mapping, setMapping] = useState<Record<string, string>>({})

  // Initialize or reset mapping when structureResult changes
  useEffect(() => {
    if (structureResult?.suggestedMapping) {
      setMapping({ ...structureResult.suggestedMapping })
      setStep(1)
    }
  }, [structureResult])

  if (!structureResult) return null

  const handleSelectColumn = (reqCol: RequiredColumn, selectedHeader: string) => {
    setMapping((prev) => ({
      ...prev,
      [reqCol]: selectedHeader,
    }))
  }

  // Check for duplicates or missing mappings
  const mappedValues = Object.values(mapping).filter((v) => !!v)
  const hasDuplicates = new Set(mappedValues).size !== mappedValues.length
  const allRequiredMapped = REQUIRED_COLUMNS.every((req) => !!mapping[req])
  const canProceedToVerification = allRequiredMapped && !hasDuplicates

  const getTypeBadge = (type: ColumnType) => {
    switch (type) {
      case 'categorical':
        return (
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] gap-1">
            <Tag className="w-2.5 h-2.5" /> Categorical
          </Badge>
        )
      case 'integer':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
            <Hash className="w-2.5 h-2.5" /> Integer
          </Badge>
        )
      case 'float':
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] gap-1">
            <Activity className="w-2.5 h-2.5" /> Float/Numeric
          </Badge>
        )
      case 'boolean':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] gap-1">
            <CheckSquare className="w-2.5 h-2.5" /> Boolean
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            Unknown
          </Badge>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        {/* Top Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Columns className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  {step === 1 ? 'Smart Column Mapping' : 'Final Column-by-Column Verification'}
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Step {step} of 2
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  File: <strong className="text-foreground font-mono">{filename}</strong> ({structureResult.columnCount} columns detected)
                </DialogDescription>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 text-xs font-medium">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                1
              </span>
              <span className="text-muted-foreground/50">→</span>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                2
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Body content scrollable */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
          {/* STEP 1: INTERACTIVE COLUMN SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 text-xs text-sky-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sky-950">
                    Structure detected with {structureResult.columnCount} columns
                  </p>
                  <p className="text-[11px] text-sky-800 mt-0.5">
                    Your file headers differ from standard SAES names. We analyzed data types across all rows to recommend the optimal mapping. Review or adjust each column assignment below:
                  </p>
                </div>
              </div>

              {hasDuplicates && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Duplicate mapping:</strong> Multiple SAES fields are mapped to the same column. Each field must be mapped uniquely.
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {REQUIRED_COLUMNS.map((reqCol) => {
                  const info = REQUIRED_INFO[reqCol]
                  const currentSelected = mapping[reqCol] || ''
                  const selectedAnalysis = currentSelected
                    ? structureResult.columnsAnalysis[currentSelected]
                    : null
                  const isTypeMatch =
                    selectedAnalysis && selectedAnalysis.detectedType === info.expectedType

                  return (
                    <div
                      key={reqCol}
                      className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Required Field Description */}
                      <div className="space-y-1 sm:max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-foreground">
                            {reqCol}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({info.typeLabel})
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {info.desc}
                        </p>
                      </div>

                      {/* Right: Dropdown Selector with detected type */}
                      <div className="flex-1 sm:max-w-md space-y-1.5">
                        <div className="flex items-center gap-2">
                          <select
                            value={currentSelected}
                            onChange={(e) => handleSelectColumn(reqCol, e.target.value)}
                            className="w-full text-xs font-medium h-9 px-3 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                          >
                            <option value="" disabled>
                              -- Select a column from your dataset --
                            </option>
                            {structureResult.rawHeaders.map((header) => {
                              const analysis = structureResult.columnsAnalysis[header]
                              const typeStr = analysis ? analysis.detectedType : 'unknown'
                              return (
                                <option key={header} value={header}>
                                  {header} [{typeStr}]
                                </option>
                              )
                            })}
                          </select>

                          {selectedAnalysis && getTypeBadge(selectedAnalysis.detectedType)}
                        </div>

                        {/* Smart Match Note */}
                        {isTypeMatch && (
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Smart match by data type ({info.expectedType})</span>
                          </div>
                        )}
                        {selectedAnalysis && !isTypeMatch && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-700">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>
                              Detected type ({selectedAnalysis.detectedType}) differs from recommended ({info.expectedType})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2: FINAL VERIFICATION */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">
                    Final Mapping & Type Verification
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Below is the column-by-column breakdown: mapped SAES field, detected type, and identified categories or sample ranges.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {REQUIRED_COLUMNS.map((reqCol) => {
                  const sourceCol = mapping[reqCol]
                  const analysis = structureResult.columnsAnalysis[sourceCol]
                  const isCategorical = analysis?.detectedType === 'categorical'

                  return (
                    <div
                      key={reqCol}
                      className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-foreground">
                            {reqCol}
                          </span>
                          {analysis && getTypeBadge(analysis.detectedType)}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground text-[11px]">Mapped from:</span>
                          <span className="px-2 py-0.5 rounded bg-muted font-mono font-semibold text-primary text-xs">
                            {sourceCol}
                          </span>
                        </div>
                      </div>

                      {/* Diagnostic details & Categories */}
                      <div className="pt-2 border-t border-border/60 text-xs space-y-1.5">
                        {isCategorical && analysis && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Tag className="w-3 h-3 text-sky-500" />
                              Detected categories ({analysis.categoryCount}):
                            </span>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                              {analysis.categories.slice(0, 8).map((cat) => (
                                <span
                                   key={cat}
                                  className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 font-mono text-[10px]"
                                >
                                  {cat}
                                </span>
                              ))}
                              {analysis.categories.length > 8 && (
                                <span className="text-[10px] text-muted-foreground self-center font-mono">
                                  +{analysis.categories.length - 8} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {analysis?.detectedType === 'integer' && analysis && (
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <Hash className="w-3 h-3 text-emerald-500" />
                              Detected integer values:
                            </span>
                            <p className="font-mono text-[10px]">
                              {analysis.numericRange
                                ? `Range: ${analysis.numericRange.min} to ${analysis.numericRange.max}`
                                : `Sample: ${analysis.sampleValues.join(', ')}`}
                            </p>
                          </div>
                        )}

                        {analysis?.detectedType === 'float' && analysis && (
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <Activity className="w-3 h-3 text-indigo-500" />
                              Continuous numeric values:
                            </span>
                            <p className="font-mono text-[10px]">
                              {analysis.numericRange
                                ? `Range: [${analysis.numericRange.min.toFixed(4)}, ${analysis.numericRange.max.toFixed(4)}]`
                                : `Sample: ${analysis.sampleValues.join(', ')}`}
                            </p>
                          </div>
                        )}

                        {analysis?.detectedType === 'boolean' && analysis && (
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-purple-500" />
                              Detected boolean values:
                            </span>
                            <p className="font-mono text-[10px]">
                              {analysis.categories.length > 0
                                ? `Values: ${analysis.categories.join(', ')}`
                                : 'True / False'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/20 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={step === 2 ? () => setStep(1) : onCancel}
            className="text-xs gap-1.5"
          >
            {step === 2 ? (
              <>
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Selection
              </>
            ) : (
              'Cancel'
            )}
          </Button>

          <div className="flex items-center gap-2">
            {step === 1 ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setStep(2)}
                disabled={!canProceedToVerification}
                className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
              >
                Next: Final Verification
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onConfirmMapping(mapping)}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm and Apply Mapping
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
