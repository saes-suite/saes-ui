import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  BenchmarkRecord,
  DataExplorationResponse,
  DistributionProfile,
  StatisticalTestType,
  TableExportFormat,
  TableType,
} from '../../api/types'
import { apiClient } from '../../api/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { PlotlyChart } from '../charts/PlotlyChart'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Columns3,
  Database,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Loader2,
  RotateCcw,
  Scale,
  Search,
  Sparkles,
} from 'lucide-react'

interface DataTableProps {
  data: BenchmarkRecord[]
  alpha?: number
  apiOnline?: boolean
  selectedDatasetFilename?: string | null
  rawCsv?: string
  onSelectRecommendedTest?: (
    testId: StatisticalTestType,
    tableType: TableType,
    metric?: string
  ) => void
}

type ExplorerSubTab = 'reveal_metrics' | 'normality' | 'recommendations' | 'raw_rows'
type PivotGranularity = 'aggregated' | 'by_run'
type NormalityFilter = 'all' | 'normal' | 'non_normal'

function fmtP(p: number | null | undefined): string {
  if (p === null || p === undefined || Number.isNaN(p)) return '—'
  if (p < 0.0001) return '< 0.0001'
  return p.toFixed(4)
}

function fmtNum(v: number | null | undefined, digits = 4): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const abs = Math.abs(v)
  if (abs > 0 && (abs < 1e-4 || abs >= 1e5)) return v.toExponential(3)
  return v.toFixed(digits)
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  alpha = 0.05,
  apiOnline = true,
  selectedDatasetFilename,
  rawCsv,
  onSelectRecommendedTest,
}) => {
  const [subTab, setSubTab] = useState<ExplorerSubTab>('reveal_metrics')
  const [pivotGranularity, setPivotGranularity] = useState<PivotGranularity>('aggregated')
  const [pivotStatFormat, setPivotStatFormat] = useState<'mean_std' | 'median_iqr'>('mean_std')
  const [normalityFilter, setNormalityFilter] = useState<NormalityFilter>('all')
  const [showDimensionFilters, setShowDimensionFilters] = useState<boolean>(false)

  const allMetrics = useMemo(() => Array.from(new Set(data.map((r) => r.metric))).sort(), [data])
  const allAlgorithms = useMemo(
    () => Array.from(new Set(data.map((r) => r.algorithm))).sort(),
    [data]
  )
  const allInstances = useMemo(
    () => Array.from(new Set(data.map((r) => r.instance))).sort(),
    [data]
  )

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([])
  const [selectedInstances, setSelectedInstances] = useState<string[]>([])

  const [exploration, setExploration] = useState<DataExplorationResponse | null>(null)
  const [isLoadingExplore, setIsLoadingExplore] = useState<boolean>(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<TableExportFormat | null>(null)
  const [inspectedProfile, setInspectedProfile] = useState<DistributionProfile | null>(null)

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSize, setPageSize] = useState(15)

  const fetchExploration = useCallback(async () => {
    if (!apiOnline || (!selectedDatasetFilename && !rawCsv) || data.length === 0) return
    setIsLoadingExplore(true)
    try {
      const params = {
        metrics: selectedMetrics.length > 0 ? selectedMetrics : undefined,
        algorithms: selectedAlgorithms.length > 0 ? selectedAlgorithms : undefined,
        instances: selectedInstances.length > 0 ? selectedInstances : undefined,
        alpha,
      }
      const res = selectedDatasetFilename
        ? await apiClient.exploreDatasetFromPath(selectedDatasetFilename, params)
        : await apiClient.exploreDatasetFromCsv(rawCsv || '', params)
      setExploration(res)
    } catch {
      // Keep local fallback table functional even if exploration call fails
    } finally {
      setIsLoadingExplore(false)
    }
  }, [
    apiOnline,
    selectedDatasetFilename,
    rawCsv,
    data.length,
    selectedMetrics,
    selectedAlgorithms,
    selectedInstances,
    alpha,
  ])

  useEffect(() => {
    fetchExploration()
  }, [fetchExploration])

  const handleExport = async (format: TableExportFormat) => {
    if (!apiOnline || (!selectedDatasetFilename && !rawCsv)) return
    setIsExporting(format)
    try {
      const params = {
        metrics: selectedMetrics.length > 0 ? selectedMetrics : undefined,
        algorithms: selectedAlgorithms.length > 0 ? selectedAlgorithms : undefined,
        instances: selectedInstances.length > 0 ? selectedInstances : undefined,
        alpha,
      }
      const resolvedViewMode =
        subTab === 'reveal_metrics'
          ? pivotGranularity === 'by_run'
            ? 'by_run'
            : 'reveal_metrics'
          : subTab === 'raw_rows'
            ? 'by_run'
            : subTab

      const blob = selectedDatasetFilename
        ? await apiClient.exportExplorationFromPath(
            selectedDatasetFilename,
            format,
            resolvedViewMode,
            pivotStatFormat,
            normalityFilter,
            params
          )
        : await apiClient.exportExplorationFromCsv(
            rawCsv || '',
            format,
            resolvedViewMode,
            pivotStatFormat,
            normalityFilter,
            params
          )

      const extMap: Record<TableExportFormat, string> = {
        pdf: 'pdf',
        docx: 'docx',
        latex: 'tex',
        csv: 'csv',
        markdown: 'md',
        html: 'html',
      }
      const ext = extMap[format] || format
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `saes_observations_${resolvedViewMode}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      setIsExportDialogOpen(false)
    } catch {
      // Ignore export error
    } finally {
      setIsExporting(null)
    }
  }

  const toggleItem = (
    item: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(current.includes(item) ? current.filter((x) => x !== item) : [...current, item])
  }

  const resetAllFilters = () => {
    setSelectedMetrics([])
    setSelectedAlgorithms([])
    setSelectedInstances([])
    setNormalityFilter('all')
    setGlobalFilter('')
  }

  const filteredRawRecords = useMemo(() => {
    return data.filter((r) => {
      if (selectedMetrics.length > 0 && !selectedMetrics.includes(r.metric)) return false
      if (selectedAlgorithms.length > 0 && !selectedAlgorithms.includes(r.algorithm)) return false
      if (selectedInstances.length > 0 && !selectedInstances.includes(r.instance)) return false
      return true
    })
  }, [data, selectedMetrics, selectedAlgorithms, selectedInstances])

  const filteredProfiles = useMemo(() => {
    const list = exploration?.distribution_profiles || []
    return list.filter((p) => {
      if (normalityFilter === 'normal' && !p.is_normal) return false
      if (normalityFilter === 'non_normal' && p.is_normal) return false
      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase()
        if (
          !p.algorithm.toLowerCase().includes(q) &&
          !p.instance.toLowerCase().includes(q) &&
          !p.metric.toLowerCase().includes(q) &&
          !p.distribution_shape.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [exploration, normalityFilter, globalFilter])

  const activeMetricsList = useMemo(() => {
    if (exploration && exploration.active_metrics.length > 0) return exploration.active_metrics
    if (selectedMetrics.length > 0) return selectedMetrics
    return allMetrics
  }, [exploration, selectedMetrics, allMetrics])

  const columns = useMemo<ColumnDef<BenchmarkRecord>[]>(
    () => [
      {
        accessorKey: 'algorithm',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-3 h-8 text-xs font-semibold"
          >
            Algorithm
            <ArrowUpDown className="ml-1.5 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-primary">{row.getValue('algorithm')}</span>
        ),
      },
      {
        accessorKey: 'instance',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-3 h-8 text-xs font-semibold"
          >
            Instance
            <ArrowUpDown className="ml-1.5 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-foreground">{row.getValue('instance')}</span>
        ),
      },
      {
        accessorKey: 'metric',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-3 h-8 text-xs font-semibold"
          >
            Metric
            <ArrowUpDown className="ml-1.5 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="px-2 py-0.5 rounded bg-muted font-mono text-xs font-semibold">
            {row.getValue('metric')}
          </span>
        ),
      },
      {
        accessorKey: 'run_id',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-3 h-8 text-xs font-semibold"
          >
            Run ID
            <ArrowUpDown className="ml-1.5 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-muted-foreground">{row.getValue('run_id')}</span>
        ),
      },
      {
        accessorKey: 'value',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-3 h-8 text-xs font-semibold"
          >
            Metric Value
            <ArrowUpDown className="ml-1.5 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const val = Number(row.getValue('value'))
          return (
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {isNaN(val) ? 'NaN' : val.toFixed(6)}
            </span>
          )
        },
      },
      {
        accessorKey: 'maximize',
        header: 'Direction',
        cell: ({ row }) => {
          const isMax = Boolean(row.getValue('maximize'))
          return (
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${
                isMax
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20'
                  : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border border-zinc-500/20'
              }`}
            >
              {isMax ? '▲ Maximize' : '▼ Minimize'}
            </span>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredRawRecords,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  })

  const diag = exploration?.context_diagnostics
  const activeFilterGroups =
    (selectedMetrics.length > 0 ? 1 : 0) +
    (selectedAlgorithms.length > 0 ? 1 : 0) +
    (selectedInstances.length > 0 ? 1 : 0)

  return (
    <div className="space-y-6">
      {/* 1. CLEAN UNIFIED HEADER BAR: SUB-TABS, SEARCH, COLLAPSIBLE FILTERS & EXPORT */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Sub-Tab Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('reveal_metrics')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'reveal_metrics'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              Reveal Metrics ({activeMetricsList.length})
            </button>

            <button
              type="button"
              onClick={() => setSubTab('normality')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'normality'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Normality &amp; Distributions ({exploration?.distribution_profiles.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setSubTab('recommendations')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'recommendations'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Test Suggestions ({exploration?.recommendations.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setSubTab('raw_rows')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'raw_rows'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Raw Observations ({filteredRawRecords.length.toLocaleString()})
            </button>
            {isLoadingExplore && <Loader2 className="w-4 h-4 animate-spin text-primary ml-1" />}
          </div>

          {/* Search, Filter Toggle & Export Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Quick search algorithm or instance..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-9 w-full rounded-xl border border-input bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDimensionFilters(!showDimensionFilters)}
              className="h-9 px-3 text-xs gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              {showDimensionFilters ? 'Hide Filters' : 'Filter Dimensions'}
              {activeFilterGroups > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px]">
                  {activeFilterGroups}
                </span>
              )}
            </Button>

            {(activeFilterGroups > 0 || normalityFilter !== 'all' || globalFilter) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-9 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isExporting !== null || !exploration}
              onClick={() => setIsExportDialogOpen(true)}
              className="h-9 px-4 text-xs gap-1.5 font-semibold shadow-xs"
            >
              {isExporting !== null ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Export Table
            </Button>
          </div>
        </div>

        {/* Collapsible Multi-Dimensional Filter Pills (Metrics, Algorithms, Instances) */}
        {showDimensionFilters && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-3 border-t border-border/60 text-xs">
            {/* Metrics Filter */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Reveal / Filter Metrics ({activeMetricsList.length}/{allMetrics.length})
                </span>
                {selectedMetrics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMetrics([])}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    All Metrics
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allMetrics.map((m) => {
                  const active = selectedMetrics.length === 0 || selectedMetrics.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleItem(m, selectedMetrics, setSelectedMetrics)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary font-semibold'
                          : 'bg-background text-muted-foreground border-border/60 opacity-60'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Algorithms Filter */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter Algorithms (
                  {selectedAlgorithms.length === 0
                    ? allAlgorithms.length
                    : selectedAlgorithms.length}
                  /{allAlgorithms.length})
                </span>
                {selectedAlgorithms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAlgorithms([])}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    All Algorithms
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {allAlgorithms.map((a) => {
                  const active = selectedAlgorithms.length === 0 || selectedAlgorithms.includes(a)
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleItem(a, selectedAlgorithms, setSelectedAlgorithms)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/40 font-semibold'
                          : 'bg-background text-muted-foreground border-border/60 opacity-60'
                      }`}
                    >
                      {a}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Instances Filter */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter Instances (
                  {selectedInstances.length === 0 ? allInstances.length : selectedInstances.length}/
                  {allInstances.length})
                </span>
                {selectedInstances.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedInstances([])}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    All Instances
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {allInstances.map((inst) => {
                  const active = selectedInstances.length === 0 || selectedInstances.includes(inst)
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => toggleItem(inst, selectedInstances, setSelectedInstances)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                        active
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-semibold'
                          : 'bg-background text-muted-foreground border-border/60 opacity-60'
                      }`}
                    >
                      {inst}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Compact Single-Row Context Diagnostics Summary Strip */}
        {diag && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/50 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/70 font-mono text-xs">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <strong>{diag.k_algorithms}</strong> Algos × <strong>{diag.n_instances}</strong>{' '}
                Inst × <strong>{diag.n_metrics}</strong> Metrics
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs border ${
                  diag.all_normal
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Shapiro-Wilk: <strong>{diag.normality_pass_count}</strong>/
                {diag.normality_total_groups} Normal ({Math.round(diag.normality_rate * 100)}%)
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 font-mono text-xs text-muted-foreground">
                <Scale className="w-3.5 h-3.5 text-sky-500" />
                Levene min p = {fmtP(diag.homoscedasticity_levene_p)} (
                {diag.homoscedasticity_passed ? 'Homoscedastic' : 'Heteroscedastic'})
              </span>
            </div>

            {exploration?.recommendations[0] && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Recommended:{' '}
                <strong>{exploration.recommendations[0].test_name.split('+')[0]}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          SUB-TAB 1: REVEAL METRICS MATRIX (SIDE-BY-SIDE MULTI-METRIC PIVOT)
         ===================================================================== */}
      {subTab === 'reveal_metrics' && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Side-by-Side Multi-Metric Reveal Matrix
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reveals all active metrics side-by-side for each Algorithm and Instance with
                Shapiro-Wilk normality indicators.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center rounded-xl border border-border bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => setPivotGranularity('aggregated')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    pivotGranularity === 'aggregated'
                      ? 'bg-card text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Aggregated per Instance
                </button>
                <button
                  type="button"
                  onClick={() => setPivotGranularity('by_run')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    pivotGranularity === 'by_run'
                      ? 'bg-card text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  By Run ID
                </button>
              </div>

              {pivotGranularity === 'aggregated' && (
                <div className="flex items-center rounded-xl border border-border bg-muted/50 p-1">
                  <button
                    type="button"
                    onClick={() => setPivotStatFormat('mean_std')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer ${
                      pivotStatFormat === 'mean_std'
                        ? 'bg-card text-foreground font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Mean ± SD
                  </button>
                  <button
                    type="button"
                    onClick={() => setPivotStatFormat('median_iqr')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer ${
                      pivotStatFormat === 'median_iqr'
                        ? 'bg-card text-foreground font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Median (IQR)
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            {pivotGranularity === 'aggregated' ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-3.5 px-4 text-xs font-bold">Instance</TableHead>
                    <TableHead className="py-3.5 px-4 text-xs font-bold">Algorithm</TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Runs (n)
                    </TableHead>
                    {activeMetricsList.map((m) => (
                      <TableHead
                        key={m}
                        className="py-3.5 px-4 text-center font-mono text-xs font-bold"
                      >
                        {m}{' '}
                        <span className="text-[11px] font-normal text-muted-foreground">
                          ({exploration?.metric_directions[m] ? '▲ Max' : '▼ Min'})
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(exploration?.aggregated_rows || [])
                    .filter((row) => {
                      if (!globalFilter.trim()) return true
                      const q = globalFilter.toLowerCase()
                      return (
                        row.algorithm.toLowerCase().includes(q) ||
                        row.instance.toLowerCase().includes(q)
                      )
                    })
                    .map((row) => (
                      <TableRow
                        key={`${row.instance}_${row.algorithm}`}
                        className="hover:bg-muted/20"
                      >
                        <TableCell className="py-3 px-4 font-mono font-bold text-xs">
                          {row.instance}
                        </TableCell>
                        <TableCell className="py-3 px-4 font-mono font-semibold text-xs text-primary">
                          {row.algorithm}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center font-mono text-xs text-muted-foreground">
                          {row.n_runs}
                        </TableCell>
                        {activeMetricsList.map((m) => {
                          const valStr =
                            pivotStatFormat === 'median_iqr'
                              ? row.metrics_median_iqr[m]
                              : row.metrics_mean_std[m]
                          const isNorm = row.metrics_normal[m]
                          const shapP = row.metrics_shapiro_p[m]
                          return (
                            <TableCell key={m} className="py-3 px-4 text-center font-mono text-xs">
                              <div className="inline-flex items-center gap-2">
                                <span>{valStr || '—'}</span>
                                {isNorm !== undefined && (
                                  <span
                                    title={`Shapiro-Wilk p = ${fmtP(shapP)}`}
                                    className={`px-1.5 py-0.2 rounded text-[10px] border ${
                                      isNorm
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    }`}
                                  >
                                    {isNorm ? 'Norm' : 'Non-Norm'}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-3.5 px-4 text-xs font-bold">Instance</TableHead>
                    <TableHead className="py-3.5 px-4 text-xs font-bold">Algorithm</TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Run ID
                    </TableHead>
                    {activeMetricsList.map((m) => (
                      <TableHead
                        key={m}
                        className="py-3.5 px-4 text-center font-mono text-xs font-bold"
                      >
                        {m}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(exploration?.pivoted_rows || [])
                    .filter((row) => {
                      if (!globalFilter.trim()) return true
                      const q = globalFilter.toLowerCase()
                      return (
                        row.algorithm.toLowerCase().includes(q) ||
                        row.instance.toLowerCase().includes(q)
                      )
                    })
                    .slice(0, 200)
                    .map((row) => (
                      <TableRow
                        key={`${row.instance}_${row.algorithm}_${row.run_id}`}
                        className="hover:bg-muted/20"
                      >
                        <TableCell className="py-3 px-4 font-mono text-xs">
                          {row.instance}
                        </TableCell>
                        <TableCell className="py-3 px-4 font-mono font-semibold text-xs text-primary">
                          {row.algorithm}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center font-mono text-xs text-muted-foreground">
                          #{row.run_id}
                        </TableCell>
                        {activeMetricsList.map((m) => (
                          <TableCell key={m} className="py-3 px-4 text-center font-mono text-xs">
                            {row.metrics_values[m] !== undefined
                              ? fmtNum(row.metrics_values[m], 6)
                              : '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: NORMALITY & DISTRIBUTION DIAGNOSTICS TABLE
         ===================================================================== */}
      {subTab === 'normality' && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Group-by-Group Normality (Shapiro-Wilk, D&apos;Agostino K², KS) &amp; Distribution
                Diagnostics
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click any row to inspect its empirical distribution histogram, quantiles, and
                normality test breakdown.
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1 text-xs">
              {(
                [
                  { id: 'all', label: 'All Groups' },
                  { id: 'normal', label: 'Normal Only' },
                  { id: 'non_normal', label: 'Non-Normal (Violated)' },
                ] as { id: NormalityFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setNormalityFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    normalityFilter === f.id
                      ? 'bg-card text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="py-3.5 px-4 text-xs font-bold">Instance</TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-bold">Metric</TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-bold">Algorithm</TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-xs font-bold">n</TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                    Mean ± SD
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                    Median (IQR)
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                    Shapiro-Wilk (W, p)
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                    KS Normal p
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                    Skew / Kurt
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-bold">
                    Distribution Shape
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((prof) => (
                  <TableRow
                    key={`${prof.instance}_${prof.metric}_${prof.algorithm}`}
                    onClick={() => setInspectedProfile(prof)}
                    className="cursor-pointer hover:bg-muted/30"
                    title="Click to inspect histogram, quantiles, and normality tests"
                  >
                    <TableCell className="py-3 px-4 font-mono font-bold text-xs">
                      {prof.instance}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-xs">{prof.metric}</TableCell>
                    <TableCell className="py-3 px-4 font-mono font-semibold text-xs text-primary">
                      {prof.algorithm}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-mono text-xs">
                      {prof.n}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-mono text-xs">
                      {fmtNum(prof.mean)} ± {fmtNum(prof.std)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-mono text-xs">
                      {fmtNum(prof.median)} ({fmtNum(prof.iqr)})
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-mono text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold border ${
                          prof.shapiro_passed
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        W={prof.shapiro_stat.toFixed(3)}, p={fmtP(prof.shapiro_p)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-mono text-xs">
                      {fmtP(prof.ks_p)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-mono text-xs text-muted-foreground">
                      {prof.skewness.toFixed(2)} / {prof.kurtosis.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs font-medium">
                      {prof.distribution_shape}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: SMART CONTEXT-AWARE STATISTICAL TEST RECOMMENDATIONS
         ===================================================================== */}
      {subTab === 'recommendations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(exploration?.recommendations || []).map((rec) => {
            const badgeColor =
              rec.suitability === 'recommended'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : rec.suitability === 'suitable'
                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'

            return (
              <div
                key={rec.test_id}
                className={`rounded-2xl border p-5 bg-card flex flex-col justify-between space-y-4 shadow-xs ${
                  rec.suitability === 'recommended'
                    ? 'border-emerald-500/40 ring-1 ring-emerald-500/10'
                    : 'border-border/70'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                        {rec.category} • Suitability Score: {rec.suitability_score}/100
                      </span>
                      <h4 className="text-sm font-bold text-foreground mt-0.5">{rec.test_name}</h4>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${badgeColor}`}
                    >
                      {rec.suitability}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>

                  <div className="space-y-1.5 pt-1 text-xs">
                    {rec.assumptions_satisfied.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                    {rec.assumptions_violated.map((v, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-amber-600 dark:text-amber-400"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5 truncate">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    {rec.reference_citation}
                  </span>

                  {onSelectRecommendedTest && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        onSelectRecommendedTest(
                          (rec.test_id === 'bayesian_rope'
                            ? 'wilcoxon'
                            : rec.test_id) as StatisticalTestType,
                          (rec.suggested_table_type || 'instance_algorithm') as TableType,
                          activeMetricsList[0]
                        )
                      }
                      className="h-8 px-3.5 text-xs gap-1.5 shrink-0"
                    >
                      Open in Workbench
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: RAW OBSERVATIONS TABLE
         ===================================================================== */}
      {subTab === 'raw_rows' && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-foreground">
              Showing {table.getFilteredRowModel().rows.length.toLocaleString()} filtered benchmark
              observations
            </span>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setPageSize(val)
                  table.setPageSize(val)
                }}
                className="h-8 rounded-lg border border-input bg-background pl-2.5 pr-7 text-xs"
              >
                {[10, 15, 25, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-muted/40">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="py-3 px-4">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/20">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3 px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground text-xs"
                    >
                      No matching benchmark observations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="px-5 py-3 border-t border-border/60 bg-muted/10 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground font-mono">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {Math.max(1, table.getPageCount())}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DISTRIBUTION & NORMALITY DRILL-DOWN MODAL */}
      <Dialog open={!!inspectedProfile} onOpenChange={(o) => !o && setInspectedProfile(null)}>
        <DialogContent className="sm:max-w-xl">
          {inspectedProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span className="font-mono text-primary">{inspectedProfile.algorithm}</span>
                  <span>—</span>
                  <span className="font-mono">{inspectedProfile.instance}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {inspectedProfile.metric}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Shape: <strong>{inspectedProfile.distribution_shape}</strong> (n ={' '}
                  {inspectedProfile.n} observations)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs pt-2">
                <div className="rounded-xl border border-border/70 bg-background p-2">
                  <PlotlyChart
                    data={[
                      {
                        type: 'histogram',
                        x: inspectedProfile.raw_values,
                        name: 'Histogram',
                        marker: {
                          color: inspectedProfile.is_normal ? '#10b981' : '#f43f5e',
                          opacity: 0.75,
                        },
                      },
                    ]}
                    layout={{
                      height: 210,
                      margin: { t: 24, r: 16, b: 36, l: 44 },
                      title: {
                        text: `Empirical Distribution (${inspectedProfile.metric})`,
                        font: { size: 12 },
                      },
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'transparent',
                      showlegend: false,
                    }}
                    style={{ width: '100%', height: '210px' }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Shapiro-Wilk
                    </span>
                    <strong
                      className={
                        inspectedProfile.shapiro_passed ? 'text-emerald-500' : 'text-rose-500'
                      }
                    >
                      W={inspectedProfile.shapiro_stat.toFixed(3)} (p=
                      {fmtP(inspectedProfile.shapiro_p)})
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Kolmogorov-Smirnov
                    </span>
                    <strong>
                      D={inspectedProfile.ks_stat.toFixed(3)} (p={fmtP(inspectedProfile.ks_p)})
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Skewness / Kurtosis
                    </span>
                    <strong>
                      {inspectedProfile.skewness.toFixed(2)} /{' '}
                      {inspectedProfile.kurtosis.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          OBSERVATIONS & DATA EXPORT FORMAT PICKER DIALOG
         ===================================================================== */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Export Observations &amp; Data Table
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose a file format to download the currently active observations &amp; data view (
              <strong>
                {subTab === 'reveal_metrics'
                  ? pivotGranularity === 'by_run'
                    ? 'Multi-Metric Per-Run Observations'
                    : 'Multi-Metric Aggregated Reveal Table'
                  : subTab === 'normality'
                    ? 'Normality & Distribution Diagnostics'
                    : subTab === 'recommendations'
                      ? 'Statistical Test Recommendations'
                      : 'Filtered Observations'}
              </strong>
              ).
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {(
              [
                {
                  fmt: 'pdf',
                  label: 'PDF Document (.pdf)',
                  desc: 'Publication-ready vector table of filtered observations & diagnostics',
                  icon: FileText,
                },
                {
                  fmt: 'docx',
                  label: 'Microsoft Word (.docx)',
                  desc: 'Editable OpenXML Word table for scientific reports',
                  icon: FileText,
                },
                {
                  fmt: 'latex',
                  label: 'LaTeX Booktabs (.tex)',
                  desc: 'IEEE / ACM / Springer booktabs table environment',
                  icon: FileCode,
                },
                {
                  fmt: 'csv',
                  label: 'CSV Spreadsheet (.csv)',
                  desc: 'Comma-separated table for Excel, R, or Python',
                  icon: FileSpreadsheet,
                },
                {
                  fmt: 'markdown',
                  label: 'Markdown Table (.md)',
                  desc: 'GitHub-flavored Markdown table for documentation',
                  icon: Code2,
                },
                {
                  fmt: 'html',
                  label: 'HTML Standalone (.html)',
                  desc: 'Styled standalone HTML table document',
                  icon: Layers,
                },
              ] as {
                fmt: TableExportFormat
                label: string
                desc: string
                icon: typeof FileText
              }[]
            ).map(({ fmt, label, desc, icon: Icon }) => (
              <button
                key={fmt}
                type="button"
                disabled={isExporting !== null}
                onClick={() => handleExport(fmt)}
                className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-card hover:bg-primary/5 hover:border-primary/50 text-left transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  {isExporting === fmt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">{label}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
