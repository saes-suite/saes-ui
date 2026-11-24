import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BenchmarkRecord,
  PerformanceProfilesResponse,
  GlobalMetaRankingItem,
  PostHocCorrectionType,
} from '../../api/types'
import { apiClient } from '../../api/client'
import { getProfilesCacheKey, getCachedProfiles, setCachedProfiles } from '../../lib/workspaceCache'
import { PlotlyChart } from '../charts/PlotlyChart'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { SelectDropdown } from '../ui/select-dropdown'
import { exportPlotlyImage, exportToCsv } from '../../lib/exportUtils'
import {
  TrendingUp,
  Trophy,
  RefreshCw,
  Loader2,
  AlertCircle,
  Scale,
  Sparkles,
  Info,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Link2,
} from 'lucide-react'

interface PerformanceProfilesWorkspaceProps {
  records?: BenchmarkRecord[]
  alpha: number
  apiOnline?: boolean
  selectedDatasetFilename?: string | null
  rawCsv?: string
}

type ProfileSubTab = 'curves' | 'rankings' | 'wtl_matrix'

const LINE_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#dc2626', // Red
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#d97706', // Amber
  '#db2777', // Pink
]

export const PerformanceProfilesWorkspace: React.FC<PerformanceProfilesWorkspaceProps> = ({
  records,
  alpha,
  apiOnline = true,
  selectedDatasetFilename,
  rawCsv,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('curves')
  const [selectedMetric, setSelectedMetric] = useState<string | undefined>(undefined)
  const [pairedDesign, setPairedDesign] = useState<boolean>(false)
  const [posthocCorrection, setPosthocCorrection] = useState<PostHocCorrectionType>('holm')
  const [isLogScale, setIsLogScale] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [chartEl, setChartEl] = useState<HTMLDivElement | null>(null)

  // Extract available metrics from records
  const availableMetrics = useMemo(() => {
    if (!records || records.length === 0) return []
    return Array.from(new Set(records.map((r) => r.metric))).sort()
  }, [records])

  const targetMetric = selectedMetric || availableMetrics[0] || 'HV'

  const datasetId = selectedDatasetFilename || (rawCsv ? `csv-${rawCsv.length}` : 'default')
  const cacheKey = useMemo(
    () => getProfilesCacheKey(datasetId, targetMetric, alpha, pairedDesign, posthocCorrection),
    [datasetId, targetMetric, alpha, pairedDesign, posthocCorrection]
  )

  const [data, setData] = useState<PerformanceProfilesResponse | null>(
    () => getCachedProfiles(cacheKey) ?? null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!apiOnline) return
      if (!forceRefresh) {
        const cached = getCachedProfiles(cacheKey)
        if (cached) {
          setData(cached)
          return
        }
      }

      setLoading(true)
      setError(null)
      try {
        let res: PerformanceProfilesResponse
        if (selectedDatasetFilename) {
          res = await apiClient.getPerformanceProfilesFromPath(selectedDatasetFilename, {
            metric: targetMetric,
            alpha,
            paired: pairedDesign,
            posthoc_correction: posthocCorrection,
          })
        } else if (rawCsv) {
          res = await apiClient.getPerformanceProfilesFromCsv(rawCsv, {
            metric: targetMetric,
            alpha,
            paired: pairedDesign,
            posthoc_correction: posthocCorrection,
          })
        } else {
          setError('No dataset or observations available.')
          return
        }
        setCachedProfiles(cacheKey, res)
        setData(res)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to compute performance profiles'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [
      apiOnline,
      cacheKey,
      selectedDatasetFilename,
      rawCsv,
      targetMetric,
      alpha,
      pairedDesign,
      posthocCorrection,
    ]
  )

  useEffect(() => {
    const cached = getCachedProfiles(cacheKey)
    if (cached) {
      setData(cached)
    } else {
      fetchData()
    }
  }, [cacheKey, fetchData])

  // Prepare Plotly chart data for Dolan-Moré step curves
  const plotlyChartData = useMemo(() => {
    if (!data || !data.curves) return []

    return data.curves.map((curve, idx) => {
      const color = LINE_COLORS[idx % LINE_COLORS.length]
      return {
        x: curve.tau_values,
        y: curve.rho_values,
        type: 'scatter' as const,
        mode: 'lines' as const,
        line: {
          shape: 'hv' as const, // Step function per Dolan-Moré standard
          width: 2.5,
          color,
        },
        name: `${curve.algorithm} (Eff: ${(curve.efficiency * 100).toFixed(1)}%, Rob: ${(curve.robustness * 100).toFixed(1)}%)`,
        hovertemplate:
          `<b>${curve.algorithm}</b><br>` +
          `Performance Ratio (τ): %{x:.2f}<br>` +
          `Prob. Solved ρ(τ): %{y:.1%}<extra></extra>`,
      }
    })
  }, [data])

  const { plotlyLayout, chartHeight } = useMemo(() => {
    const numCurves = data?.curves?.length || 0
    // Estimate legend rows needed based on number of algorithm curves
    const estimatedLegendRows = Math.max(1, Math.ceil((numCurves * 220) / 700))
    // 80px clearance ensures ~35px of clean visual breathing room below the X-axis title
    const clearancePx = 80
    const legendHeight = estimatedLegendRows * 24
    const bottomMargin = Math.max(110, clearancePx + legendHeight + 24)
    const calculatedHeight = Math.max(520, 360 + bottomMargin)
    const plotAreaHeight = Math.max(200, calculatedHeight - 50 - bottomMargin)
    const yOffset = -(clearancePx / plotAreaHeight)

    return {
      chartHeight: calculatedHeight,
      plotlyLayout: {
        autosize: true,
        title: {
          text: `Dolan-Moré Performance Profile: ${targetMetric} (${data?.maximize ? 'Higher is better' : 'Lower is better'})`,
          font: { family: 'Inter, sans-serif', size: 14, color: '#1e293b' },
        },
        xaxis: {
          title: {
            text: 'Performance Factor (τ ≥ 1)',
            standoff: 8,
            font: { family: 'Inter, sans-serif', size: 12, color: '#334155' },
          },
          type: isLogScale ? ('log' as const) : ('linear' as const),
          gridcolor: '#e2e8f0',
          zeroline: false,
          autorange: true,
        },
        yaxis: {
          title: 'Fraction of Problems Solved ρ(τ)',
          range: [0, 1.05] as [number, number],
          gridcolor: '#e2e8f0',
          tickformat: '.0%',
        },
        legend: {
          orientation: 'h' as const,
          x: 0.5,
          xanchor: 'center' as const,
          y: yOffset,
          yanchor: 'top' as const,
          font: { family: 'Inter, sans-serif', size: 11, color: '#334155' },
        },
        margin: { l: 60, r: 40, t: 50, b: bottomMargin },
      },
    }
  }, [targetMetric, data?.maximize, isLogScale, data?.curves?.length])

  const handleCopySummary = () => {
    if (!data || !data.meta_rankings) return
    const text = data.meta_rankings
      .map(
        (r) =>
          `#${r.rank} ${r.algorithm}: Efficiency=${(r.efficiency * 100).toFixed(1)}%, ` +
          `Robustness=${(r.robustness * 100).toFixed(1)}%, Net W/T/L=${r.net_score > 0 ? '+' : ''}${r.net_score} ` +
          `(${r.total_wins}W / ${r.total_ties}T / ${r.total_losses}L)`
      )
      .join('\n')

    navigator.clipboard.writeText(text)
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2000)
  }

  const handleExportRankingsCsv = () => {
    if (!data || !data.meta_rankings) return
    const headers = [
      'Rank',
      'Algorithm',
      'Efficiency rho(1)',
      'Robustness lim rho(tau)',
      'Wins',
      'Ties',
      'Losses',
      'Net Score',
      'Copeland Score',
    ]
    const rows = data.meta_rankings.map((r) => [
      r.rank,
      r.algorithm,
      (r.efficiency * 100).toFixed(2) + '%',
      (r.robustness * 100).toFixed(2) + '%',
      r.total_wins,
      r.total_ties,
      r.total_losses,
      r.net_score,
      r.copeland_score.toFixed(3),
    ])
    exportToCsv(`saes_meta_rankings_${targetMetric}`, headers, rows)
  }

  const handleExportMatrixCsv = () => {
    if (!data || !data.wtl_matrix || !data.curves) return
    const algos = data.curves.map((c) => c.algorithm)
    const headers = ['Algorithm', ...algos]
    const rows = data.wtl_matrix.map((rowCells, rIdx) => {
      const rowAlgo = algos[rIdx] || `Algo ${rIdx + 1}`
      const cells = rowCells.map((cell) =>
        cell.algo_row === cell.algo_col ? '—' : `${cell.wins}W / ${cell.ties}T / ${cell.losses}L`
      )
      return [rowAlgo, ...cells]
    })
    exportToCsv(`saes_pairwise_wtl_matrix_${targetMetric}`, headers, rows)
  }

  // Top solver
  const topSolver =
    data?.meta_rankings && data.meta_rankings.length > 0 ? data.meta_rankings[0] : null

  return (
    <div className="space-y-5">
      {/* 1. Header & Navigation Controls */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs p-5 space-y-4">
        {/* Top View Subtabs + Actions Row (Matches Statistical Workbench design) */}
        {/* Top View Subtabs + Actions Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/60 gap-1 overflow-x-auto max-w-full shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('curves')}
              title="Dolan-Moré step function curves evaluating solver efficiency and robustness (ρ(τ) Profile)"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'curves'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Curves &amp; Top Solver</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('rankings')}
              title="Global meta-rankings summary based on efficiency, robustness and Copeland score"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'rankings'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Global Meta-Rankings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('wtl_matrix')}
              title="Head-to-head Win / Tie / Loss pairwise matrix across all instances"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'wtl_matrix'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Pairwise W/T/L Matrix</span>
            </button>
          </div>

          {/* Controls at the same height as the left buttons */}
          <div className="flex items-center justify-end gap-2 ml-auto shrink-0">
            {/* Metric Selector */}
            {availableMetrics.length > 1 && (
              <SelectDropdown
                label="Metric:"
                value={targetMetric}
                options={availableMetrics.map((m) => ({ value: m, label: m }))}
                onChange={setSelectedMetric}
                triggerClassName="h-8 font-mono font-medium"
              />
            )}

            {/* W/T/L Multiplicity Correction */}
            <SelectDropdown
              label="W/T/L Adj:"
              value={posthocCorrection}
              options={[
                { value: 'holm', label: 'Holm (FWER)' },
                { value: 'bonferroni', label: 'Bonferroni' },
                { value: 'hochberg', label: 'Hochberg' },
                { value: 'hommel', label: 'Hommel' },
                { value: 'finner', label: 'Finner' },
                { value: 'fdr_bh', label: 'BH (FDR)' },
                { value: 'fdr_by', label: 'BY (FDR)' },
                { value: 'none', label: 'Unadjusted' },
              ]}
              onChange={(val) => setPosthocCorrection(val as PostHocCorrectionType)}
              triggerClassName="h-8 text-xs font-medium"
            />

            {/* Paired Design Toggle */}
            <Button
              type="button"
              variant={pairedDesign ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setPairedDesign((p) => !p)}
              className="h-8 gap-1.5 text-xs rounded-lg"
              title="Use paired W/T/L tests only when runs share matched seeds (CRN) or identical CV folds"
            >
              <Link2 className="w-3.5 h-3.5" />
              {pairedDesign ? 'Paired' : 'Independent'}
            </Button>

            {/* Copy Summary */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 gap-1.5 text-xs rounded-lg"
              disabled={!data}
            >
              {copiedSummary ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedSummary ? 'Copied' : 'Copy Summary'}
            </Button>
          </div>
        </div>

        {/* Subtitle, Method Citation & Refresh Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              Dolan &amp; Moré (2002) Benchmarking Framework
            </span>
            <span>•</span>
            <span>Significance level α = {alpha}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[11px] font-mono w-fit bg-muted/40">
              {data ? `${data.curves.length} Algorithms Evaluated` : 'Analyzing'}
            </Badge>

            {/* Refresh Button placed here */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={loading}
              className="h-7 px-2.5 gap-1.5 text-xs rounded-lg cursor-pointer"
              title="Refresh and recalculate performance profiles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex items-center justify-center p-12 rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">
              Computing Dolan-Moré performance profiles across all instances...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold">Calculation Error</h4>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Main Subtab Views */}
      {!loading && !error && data && (
        <div className="space-y-5">
          {/* SUBTAB 1: CURVES & HERO TOP SOLVER */}
          {activeSubTab === 'curves' && (
            <div className="space-y-5">
              {/* Top Solver Hero Card */}
              {topSolver && (
                <div className="rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                            Top Benchmark Performer (#1 Meta-Rank)
                          </span>
                          <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0">
                            Copeland:{' '}
                            {topSolver.copeland_score > 0
                              ? `+${topSolver.copeland_score.toFixed(3)}`
                              : topSolver.copeland_score.toFixed(3)}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mt-0.5">
                          {topSolver.algorithm}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono">
                      <div className="px-3 py-1.5 rounded-lg bg-background/80 border border-border">
                        <span className="text-muted-foreground block text-[10px] uppercase">
                          Efficiency ρ(1)
                        </span>
                        <span className="font-bold text-foreground text-sm">
                          {(topSolver.efficiency * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-background/80 border border-border">
                        <span className="text-muted-foreground block text-[10px] uppercase">
                          Robustness lim ρ(τ)
                        </span>
                        <span className="font-bold text-foreground text-sm">
                          {(topSolver.robustness * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-background/80 border border-border">
                        <span className="text-muted-foreground block text-[10px] uppercase">
                          W / T / L
                        </span>
                        <span className="font-bold text-emerald-600 text-sm">
                          {topSolver.total_wins}W
                        </span>
                        <span className="text-muted-foreground text-xs mx-0.5">/</span>
                        <span className="font-bold text-muted-foreground text-sm">
                          {topSolver.total_ties}T
                        </span>
                        <span className="text-muted-foreground text-xs mx-0.5">/</span>
                        <span className="font-bold text-rose-600 text-sm">
                          {topSolver.total_losses}L
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Plotly Chart Card */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-foreground">
                      Dolan-Moré Step Profile Curve ρ(τ)
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 ml-auto w-full xl:w-auto">
                    {/* Log Scale Toggle */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLogScale(!isLogScale)}
                      className="h-7 text-xs font-mono"
                      title="Toggle logarithmic scale on τ axis"
                    >
                      Scale: {isLogScale ? 'log₂(τ)' : 'Linear (τ)'}
                    </Button>

                    {/* Figure Export Toolbar */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        exportPlotlyImage(chartEl, `performance_profiles_${targetMetric}`, 'png')
                      }
                      className="h-7 text-xs gap-1.5"
                      title="Export High-Resolution PNG (300 DPI)"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      PNG (300 DPI)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        exportPlotlyImage(chartEl, `performance_profiles_${targetMetric}`, 'svg')
                      }
                      className="h-7 text-xs gap-1.5"
                      title="Export Scalable Vector Graphics (SVG)"
                    >
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      SVG Vector
                    </Button>
                  </div>
                </div>

                <div className="w-full" style={{ height: `${chartHeight}px` }}>
                  <PlotlyChart
                    data={plotlyChartData}
                    layout={plotlyLayout}
                    onPlotlyRef={(el) => setChartEl(el)}
                    className="w-full h-full"
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted/60 border border-border/60 text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Interpretation Guide:</strong> The vertical intercept{' '}
                    <strong>ρ(1)</strong> indicates solver <em>efficiency</em> (probability of being
                    the fastest/highest performer on a randomly selected instance). The horizontal
                    upper asymptote indicates <em>robustness</em> (the maximum fraction of benchmark
                    problems solved within ratio τ).
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: GLOBAL META-RANKINGS */}
          {activeSubTab === 'rankings' && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h4 className="text-sm font-bold text-foreground">
                    Global Meta-Rankings &amp; Aggregate Performance Summary
                  </h4>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportRankingsCsv}
                  className="h-8 text-xs gap-1.5 rounded-lg ml-auto shrink-0"
                  title="Download CSV table of global meta rankings"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Export Rankings (CSV)
                </Button>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/70">
                    <TableRow>
                      <TableHead className="w-16 font-bold">Rank</TableHead>
                      <TableHead className="font-bold">Algorithm</TableHead>
                      <TableHead className="text-center font-bold">Efficiency ρ(1)</TableHead>
                      <TableHead className="text-center font-bold">Robustness lim ρ(τ)</TableHead>
                      <TableHead className="text-center font-bold">Win / Tie / Loss</TableHead>
                      <TableHead className="text-center font-bold">Net Score</TableHead>
                      <TableHead className="text-center font-bold">Copeland Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.meta_rankings.map((row: GlobalMetaRankingItem) => (
                      <TableRow key={row.algorithm} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-mono font-bold">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              row.rank === 1
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : row.rank === 2
                                  ? 'bg-slate-200 text-slate-800'
                                  : row.rank === 3
                                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                    : 'text-muted-foreground font-normal'
                            }`}
                          >
                            {row.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {row.algorithm}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {(row.efficiency * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {(row.robustness * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          <span className="text-emerald-700 font-semibold">{row.total_wins}W</span>
                          {' / '}
                          <span className="text-muted-foreground">{row.total_ties}T</span>
                          {' / '}
                          <span className="text-rose-700 font-semibold">{row.total_losses}L</span>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          <span
                            className={
                              row.net_score > 0
                                ? 'text-emerald-600'
                                : row.net_score < 0
                                  ? 'text-rose-600'
                                  : 'text-muted-foreground'
                            }
                          >
                            {row.net_score > 0 ? `+${row.net_score}` : row.net_score}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {row.copeland_score > 0
                            ? `+${row.copeland_score.toFixed(3)}`
                            : row.copeland_score.toFixed(3)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* SUBTAB 3: PAIRWISE W/T/L MATRIX */}
          {activeSubTab === 'wtl_matrix' && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-foreground">
                    Head-to-Head Win / Tie / Loss Pairwise Matrix
                  </h4>
                </div>
                <div className="flex items-center gap-2 ml-auto shrink-0 justify-end">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Format: Net (+Wins / =Ties / -Losses)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportMatrixCsv}
                    className="h-8 text-xs gap-1.5 rounded-lg shrink-0"
                    title="Download CSV table of pairwise W/T/L matrix"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Export Matrix (CSV)
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/70">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Row \ Col</TableHead>
                      {data.curves.map((c) => (
                        <TableHead key={c.algorithm} className="text-center font-bold text-xs">
                          {c.algorithm}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.wtl_matrix.map((rowCells, rIdx) => {
                      const rowAlgo = data.curves[rIdx]?.algorithm || `Algo ${rIdx + 1}`
                      return (
                        <TableRow key={rowAlgo} className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-xs text-foreground bg-muted/20">
                            {rowAlgo}
                          </TableCell>
                          {rowCells.map((cell) => {
                            const isSelf = cell.algo_row === cell.algo_col
                            return (
                              <TableCell
                                key={`${cell.algo_row}-${cell.algo_col}`}
                                className={`text-center font-mono text-xs p-2.5 ${
                                  isSelf
                                    ? 'bg-muted/40 text-muted-foreground/60'
                                    : cell.net > 0
                                      ? 'bg-emerald-50/70 text-emerald-800'
                                      : cell.net < 0
                                        ? 'bg-rose-50/70 text-rose-800'
                                        : 'bg-background text-muted-foreground'
                                }`}
                              >
                                {isSelf ? (
                                  '—'
                                ) : (
                                  <div>
                                    <span className="font-semibold text-xs">
                                      {cell.net > 0 ? `+${cell.net}` : cell.net}
                                    </span>
                                    <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                                      {cell.wins}W / {cell.ties}T / {cell.losses}L
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
