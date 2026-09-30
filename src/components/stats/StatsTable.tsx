import React, { useState, useMemo } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { CellAnalysis } from '../../api/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Button } from '../ui/button'
import { AssumptionBadges } from './AssumptionBadges'
import { AssumptionDrawer } from './AssumptionDrawer'
import {
  ArrowUpDown,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react'

interface StatsTableProps {
  results: CellAnalysis[]
  alpha: number
  onExportCsv?: () => void
}

export const StatsTable: React.FC<StatsTableProps> = ({ results, alpha }) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedCell, setSelectedCell] = useState<CellAnalysis | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [filterMetric, setFilterMetric] = useState<string>('all')

  const openDrawer = (cell: CellAnalysis) => {
    setSelectedCell(cell)
    setIsDrawerOpen(true)
  }

  const filteredData = useMemo(() => {
    if (filterMetric === 'all') return results
    return results.filter((r) => r.metric === filterMetric)
  }, [results, filterMetric])

  const availableMetrics = useMemo(() => {
    return Array.from(new Set(results.map((r) => r.metric)))
  }, [results])

  const columns = useMemo<ColumnDef<CellAnalysis>[]>(
    () => [
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
          <span className="font-mono font-bold text-foreground">{row.getValue('instance')}</span>
        ),
      },
      {
        accessorKey: 'metric',
        header: 'Metric',
        cell: ({ row }) => (
          <span className="px-2 py-0.5 rounded bg-muted font-mono text-xs text-purple-300 font-semibold border border-purple-500/20">
            {row.getValue('metric')}
          </span>
        ),
      },
      {
        accessorKey: 'test_name',
        header: 'Applied Test',
        cell: ({ row }) => {
          const test = row.getValue('test_name') as string
          return (
            <div className="flex flex-col">
              <span className="font-medium text-xs text-sky-300">{test}</span>
              <div className="mt-1">
                <AssumptionBadges
                  cell={row.original}
                  onClickDetails={() => openDrawer(row.original)}
                />
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'statistic',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-3 h-8 text-xs font-semibold"
          >
            Statistic
            <ArrowUpDown className="ml-1.5 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const stat = Number(row.getValue('statistic'))
          const df = row.original.degrees_of_freedom
          const dfStr = Array.isArray(df) ? `(${df.join(', ')})` : df ? `(${df})` : ''
          return (
            <span className="font-mono text-xs text-foreground">
              {stat.toFixed(3)} <span className="text-[10px] text-muted-foreground">{dfStr}</span>
            </span>
          )
        },
      },
      {
        accessorKey: 'p_value',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-3 h-8 text-xs font-semibold"
          >
            p-value
            <ArrowUpDown className="ml-1.5 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const p = Number(row.getValue('p_value'))
          const isSig = row.original.is_significant
          return (
            <span
              className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                isSig
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {isSig ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-400" />
              )}
              {p < 0.0001 ? '< 0.0001' : p.toFixed(4)}
            </span>
          )
        },
      },
      {
        accessorKey: 'effect_size_value',
        header: 'Effect Size',
        cell: ({ row }) => {
          const val = row.original.effect_size_value
          const name = row.original.effect_size_name
          const mag = row.original.effect_size_magnitude || 'negligible'
          if (val === null || val === undefined)
            return <span className="text-muted-foreground text-xs">—</span>

          const magColor =
            mag === 'large'
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              : mag === 'medium'
                ? 'text-sky-400 bg-sky-500/10 border-sky-500/30'
                : mag === 'small'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30'

          return (
            <div className="flex items-center gap-2" title={name || 'Effect Size'}>
              <span className="font-mono text-xs font-semibold text-foreground">
                {val.toFixed(3)}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${magColor}`}
              >
                {mag}
              </span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: 'Assumptions',
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDrawer(row.original)}
            className="h-7 px-2 text-[11px] gap-1 hover:bg-primary/10 hover:text-primary"
          >
            <HelpCircle className="w-3 h-3" />
            Diagnostics
          </Button>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Export results to CSV
  const handleExportCsv = () => {
    const header =
      'instance,metric,test_name,statistic,p_value,is_significant,effect_size_name,effect_size_value,effect_size_magnitude\n'
    const rows = results.map(
      (r) =>
        `"${r.instance}","${r.metric}","${r.test_name}",${r.statistic},${r.p_value},${r.is_significant},"${r.effect_size_name || ''}",${r.effect_size_value ?? ''},"${r.effect_size_magnitude || ''}"`
    )
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `saes_statistical_analysis_alpha_${alpha}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const significantCount = results.filter((r) => r.is_significant).length

  return (
    <div className="space-y-4">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
              Total Cells Evaluated
            </span>
            <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
              {results.length}
            </div>
            <span className="text-xs text-muted-foreground">
              Significance threshold α = {alpha}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
              Significant Differences
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
              {significantCount} / {results.length}
            </div>
            <span className="text-xs text-emerald-400/80">
              {results.length > 0 ? Math.round((significantCount / results.length) * 100) : 0}%
              rejection rate
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
              Large Effect Sizes
            </span>
            <div className="text-2xl font-bold font-mono text-sky-400 mt-0.5">
              {results.filter((r) => r.effect_size_magnitude === 'large').length}
            </div>
            <span className="text-xs text-muted-foreground">High practical significance</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-card/40 border border-border/60">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Metric Filter:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setFilterMetric('all')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                filterMetric === 'all'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All Metrics
            </button>
            {availableMetrics.map((met) => (
              <button
                key={met}
                type="button"
                onClick={() => setFilterMetric(met)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  filterMetric === met
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {met}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="gap-1.5 text-xs h-8"
        >
          <Download className="w-3.5 h-3.5" />
          Export Analysis (CSV)
        </Button>
      </div>

      {/* TanStack Results Table */}
      <div className="rounded-xl border border-border/70 bg-card/60 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground text-xs"
                >
                  No statistical test results available. Click <strong>Run Analysis</strong> in the
                  header.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Assumption Verification Drilldown Drawer/Modal */}
      <AssumptionDrawer
        cell={selectedCell}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        alpha={alpha}
      />
    </div>
  )
}
