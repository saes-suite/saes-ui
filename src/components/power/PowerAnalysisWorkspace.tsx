import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BenchmarkRecord,
  PowerAnalysisResponse,
  PostHocPowerItem,
  SampleSizeRecommendation,
} from '../../api/types'
import { apiClient } from '../../api/client'
import { getPowerCacheKey, getCachedPower, setCachedPower } from '../../lib/workspaceCache'
import { PlotlyChart } from '../charts/PlotlyChart'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { SelectDropdown } from '../ui/select-dropdown'
import { exportPlotlyImage, exportToCsv } from '../../lib/exportUtils'
import {
  Activity,
  Zap,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Search,
  SlidersHorizontal,
} from 'lucide-react'

interface PowerAnalysisWorkspaceProps {
  records?: BenchmarkRecord[]
  alpha: number
  apiOnline?: boolean
  selectedDatasetFilename?: string | null
  rawCsv?: string
}

type PowerSubTab = 'planning' | 'curves' | 'audit'

const EFFECT_CURVE_COLORS: Record<string, string> = {
  'Small Effect (d = 0.20)': '#64748b',
  'Medium Effect (d = 0.50)': '#2563eb',
  'Large Effect (d = 0.80)': '#16a34a',
}

export const PowerAnalysisWorkspace: React.FC<PowerAnalysisWorkspaceProps> = ({
  records,
  alpha,
  apiOnline = true,
  selectedDatasetFilename,
  rawCsv,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PowerSubTab>('planning')
  const [targetPower, setTargetPower] = useState<number>(0.8)
  const [targetEffectSize, setTargetEffectSize] = useState<number>(0.5)
  const [selectedMetric, setSelectedMetric] = useState<string | undefined>(undefined)
  const [chartEl, setChartEl] = useState<HTMLDivElement | null>(null)

  // Post-hoc audit table filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'underpowered' | 'optimal'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const availableMetrics = useMemo(() => {
    if (!records || records.length === 0) return []
    return Array.from(new Set(records.map((r) => r.metric))).sort()
  }, [records])

  const targetMetric = selectedMetric || availableMetrics[0] || 'HV'

  const actualN = useMemo(() => {
    if (!records || records.length === 0) return 30
    const firstCell = records.filter(
      (r) => r.instance === records[0].instance && r.algorithm === records[0].algorithm
    )
    return firstCell.length || 30
  }, [records])

  const datasetId = selectedDatasetFilename || (rawCsv ? `csv-${rawCsv.length}` : 'default')
  const cacheKey = useMemo(
    () => getPowerCacheKey(datasetId, targetMetric, alpha, targetPower, targetEffectSize),
    [datasetId, targetMetric, alpha, targetPower, targetEffectSize]
  )

  const [data, setData] = useState<PowerAnalysisResponse | null>(
    () => getCachedPower(cacheKey) ?? null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!apiOnline) return
      if (!forceRefresh) {
        const cached = getCachedPower(cacheKey)
        if (cached) {
          setData(cached)
          return
        }
      }

      setLoading(true)
      setError(null)
      try {
        let res: PowerAnalysisResponse
        if (selectedDatasetFilename) {
          res = await apiClient.getPowerAnalysisFromPath(selectedDatasetFilename, {
            metric: targetMetric,
            alpha,
            target_power: targetPower,
            target_effect_size: targetEffectSize,
          })
        } else if (rawCsv) {
          res = await apiClient.getPowerAnalysisFromCsv(rawCsv, {
            metric: targetMetric,
            alpha,
            target_power: targetPower,
            target_effect_size: targetEffectSize,
          })
        } else {
          setError('No dataset or observations available.')
          return
        }
        setCachedPower(cacheKey, res)
        setData(res)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to calculate statistical power'
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
      targetPower,
      targetEffectSize,
    ]
  )

  useEffect(() => {
    const cached = getCachedPower(cacheKey)
    if (cached) {
      setData(cached)
    } else {
      fetchData()
    }
  }, [cacheKey, fetchData])

  // Plotly chart data for Power Curves
  const plotlyChartData = useMemo(() => {
    if (!data || !data.power_curves) return []

    const traces = data.power_curves.map((curve) => {
      const color = EFFECT_CURVE_COLORS[curve.effect_size_label] || '#9333ea'
      return {
        x: curve.sample_sizes,
        y: curve.power_values,
        type: 'scatter' as const,
        mode: 'lines+markers' as const,
        line: { width: 2.5, color },
        marker: { size: 5, color },
        name: curve.effect_size_label,
        hovertemplate:
          `<b>${curve.effect_size_label}</b><br>` +
          `Sample Size (N): %{x}<br>` +
          `Statistical Power (1-β): %{y:.1%}<extra></extra>`,
      }
    })

    return traces
  }, [data])

  const plotlyLayout = useMemo(() => {
    return {
      title: {
        text: `Statistical Power (1 - β) vs Sample Size (N) at α = ${alpha}`,
        font: { family: 'Inter, sans-serif', size: 14, color: '#1e293b' },
      },
      xaxis: {
        title: {
          text: 'Sample Size per Cell (Repetitions / Runs N)',
          standoff: 12,
          font: { family: 'Inter, sans-serif', size: 12, color: '#334155' },
        },
        gridcolor: '#e2e8f0',
        dtick: 10,
      },
      yaxis: {
        title: 'Statistical Power (1 - β)',
        range: [0, 1.05] as [number, number],
        gridcolor: '#e2e8f0',
        tickformat: '.0%',
      },
      shapes: [
        // 80% Power Benchmark Line
        {
          type: 'line' as const,
          x0: 0,
          x1: 100,
          y0: 0.8,
          y1: 0.8,
          line: { color: '#10b981', width: 1.5, dash: 'dot' as const },
        },
        // Current Dataset Sample Size Line
        {
          type: 'line' as const,
          x0: actualN,
          x1: actualN,
          y0: 0,
          y1: 1.0,
          line: { color: '#ef4444', width: 1.5, dash: 'dash' as const },
        },
      ],
      annotations: [
        {
          x: 95,
          y: 0.83,
          text: 'Standard 80% Power Threshold',
          showarrow: false,
          font: { size: 10, color: '#10b981' },
        },
        {
          x: actualN,
          y: 0.1,
          text: `Current Dataset (N = ${actualN})`,
          showarrow: true,
          arrowhead: 2,
          ax: 40,
          ay: -20,
          font: { size: 10, color: '#ef4444' },
        },
      ],
      legend: {
        orientation: 'h' as const,
        x: 0.5,
        xanchor: 'center' as const,
        y: -0.26,
        yanchor: 'top' as const,
        font: { family: 'Inter, sans-serif', size: 11, color: '#334155' },
      },
      margin: { l: 60, r: 30, t: 50, b: 105 },
    }
  }, [alpha, actualN])

  // Filtered post-hoc audit items
  const filteredAudit = useMemo(() => {
    if (!data?.post_hoc_audit) return []
    return data.post_hoc_audit.filter((item) => {
      // Status filter
      if (statusFilter === 'underpowered' && item.achieved_power >= 0.8) return false
      if (statusFilter === 'optimal' && item.achieved_power < 0.8) return false

      // Search filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase()
        const matchInstance = item.instance.toLowerCase().includes(query)
        const matchAlgo1 = item.algo_1.toLowerCase().includes(query)
        const matchAlgo2 = item.algo_2.toLowerCase().includes(query)
        if (!matchInstance && !matchAlgo1 && !matchAlgo2) return false
      }

      return true
    })
  }, [data?.post_hoc_audit, statusFilter, searchTerm])

  const underpoweredCount = useMemo(() => {
    if (!data?.post_hoc_audit) return 0
    return data.post_hoc_audit.filter((i) => i.achieved_power < 0.8).length
  }, [data?.post_hoc_audit])

  const optimalCount = useMemo(() => {
    if (!data?.post_hoc_audit) return 0
    return data.post_hoc_audit.filter((i) => i.achieved_power >= 0.8).length
  }, [data?.post_hoc_audit])

  // CSV Export handlers
  const handleExportPlanningCsv = () => {
    if (!data?.sample_size_recommendations) return
    const headers = [
      'Effect Size Label',
      'Target Cohens d',
      'Target Power',
      'Significance Alpha',
      'Independent Runs N',
      'Paired Runs N',
      'Non-Parametric N (Hodges-Lehmann)',
    ]
    const rows = data.sample_size_recommendations.map((r) => [
      r.effect_size_label,
      r.effect_size,
      r.target_power,
      r.alpha,
      r.recommended_n_independent,
      r.recommended_n_paired,
      r.recommended_n_nonparametric,
    ])
    exportToCsv(`saes_sample_size_planning_${targetMetric}`, headers, rows)
  }

  const handleExportAuditCsv = () => {
    if (!data?.post_hoc_audit) return
    const headers = [
      'Instance',
      'Algorithm 1',
      'Algorithm 2',
      'Observed Cohens d',
      'Vargha-Delaney A12',
      'Sample Size N',
      'Achieved Power',
      'Status',
      'Recommendation',
    ]
    const rows = filteredAudit.map((a) => [
      a.instance,
      a.algo_1,
      a.algo_2,
      a.cohens_d.toFixed(4),
      a.a12.toFixed(4),
      a.n_samples,
      (a.achieved_power * 100).toFixed(2) + '%',
      a.power_status,
      a.recommendation,
    ])
    exportToCsv(`saes_post_hoc_power_audit_${targetMetric}`, headers, rows)
  }

  return (
    <div className="space-y-5">
      {/* 1. Header & Navigation Controls */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs p-5 space-y-4">
        {/* Top View Subtabs + Actions Row (Matches Statistical Workbench design) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('planning')}
              title="A priori sample size determination across independent, paired, and non-parametric runs"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'planning'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>A Priori Planning</span>
              <span className="text-[10px] opacity-75 font-normal">(Sample Size N)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('curves')}
              title="Sensitivity power curves (1 - β vs N) with reference dataset line"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'curves'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Power Curves &amp; Sensitivity</span>
              <span className="text-[10px] opacity-75 font-normal">(1 - β vs N)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('audit')}
              title="Post-hoc power audit across all pairwise algorithm comparisons in current dataset"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'audit'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Post-Hoc Power Audit</span>
              <span className="text-[10px] opacity-75 font-normal">(Dataset Diagnostics)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            {/* Recalculate */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={loading}
              className="h-8 gap-1.5 text-xs rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          </div>
        </div>

        {/* Subtitle & Health Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              Non-Central Student t &amp; Hodges-Lehmann Formulation
            </span>
            <span>•</span>
            <span>Significance level α = {alpha}</span>
          </div>

          <Badge
            variant="outline"
            className={`text-xs font-mono w-fit ${
              data?.overall_power_health === 'Optimal'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : data?.overall_power_health === 'Adequate'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            Overall Power Health: {data?.overall_power_health || 'Analyzing'}
          </Badge>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex items-center justify-center p-12 rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">
              Computing non-central Student t distribution and post-hoc power audits...
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
          {/* SUBTAB 1: A PRIORI PLANNING */}
          {activeSubTab === 'planning' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  A Priori Sample Size Recommendations (Guaranteed Power{' '}
                  {(targetPower * 100).toFixed(0)}% at α = {alpha})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportPlanningCsv}
                  className="h-8 text-xs gap-1.5 rounded-lg"
                  title="Download CSV table of sample size recommendations"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Export Planning (CSV)
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.sample_size_recommendations.map((rec: SampleSizeRecommendation) => (
                  <div
                    key={rec.effect_size_label}
                    className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-4 hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {rec.effect_size_label}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        d = {rec.effect_size}
                      </Badge>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground">Independent Runs:</span>
                        <span className="text-2xl font-bold font-mono text-foreground">
                          N = {rec.recommended_n_independent}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">Paired Repetitions:</span>
                        <span className="font-mono font-semibold text-foreground text-sm">
                          N = {rec.recommended_n_paired}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">
                          Non-Parametric (Hodges-Lehmann):
                        </span>
                        <span className="font-mono font-semibold text-indigo-600 text-sm">
                          N = {rec.recommended_n_nonparametric}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground/80 border-t border-border/60 pt-3">
                      Guarantees{' '}
                      <strong>{(rec.target_power * 100).toFixed(0)}% statistical power</strong> to
                      detect true effect sizes of d = {rec.effect_size} without false negatives.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBTAB 2: SENSITIVITY CURVES */}
          {activeSubTab === 'curves' && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-foreground">
                    Power Curves &amp; Sample Size Sensitivity
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {/* Target Power Selector */}
                  <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border">
                    <span className="text-muted-foreground font-medium px-1">Power:</span>
                    {[0.8, 0.9, 0.95].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTargetPower(val)}
                        className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition-colors ${
                          targetPower === val
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {(val * 100).toFixed(0)}%
                      </button>
                    ))}
                  </div>

                  {/* Effect Size Selector */}
                  <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border">
                    <span className="text-muted-foreground font-medium px-1">Target d:</span>
                    {[0.2, 0.5, 0.8].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTargetEffectSize(val)}
                        className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition-colors ${
                          targetEffectSize === val
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {val.toFixed(2)}
                      </button>
                    ))}
                  </div>

                  {/* Figure Export Toolbar */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        exportPlotlyImage(chartEl, `power_curve_${targetMetric}`, 'png')
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
                        exportPlotlyImage(chartEl, `power_curve_${targetMetric}`, 'svg')
                      }
                      className="h-7 text-xs gap-1.5"
                      title="Export Scalable Vector Graphics (SVG)"
                    >
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      SVG Vector
                    </Button>
                  </div>
                </div>
              </div>

              <div className="w-full min-h-[440px]">
                <PlotlyChart
                  data={plotlyChartData}
                  layout={plotlyLayout}
                  onPlotlyRef={(el) => setChartEl(el)}
                />
              </div>
            </div>
          )}

          {/* SUBTAB 3: POST-HOC AUDIT */}
          {activeSubTab === 'audit' && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-foreground">
                    Post-Hoc Power Audit (Current Dataset Observations)
                  </h4>
                  <Badge variant="outline" className="text-xs font-mono ml-1">
                    {filteredAudit.length} / {data.post_hoc_audit.length} pairs
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportAuditCsv}
                    className="h-8 text-xs gap-1.5 rounded-lg"
                    title="Download CSV table of post-hoc power audit"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Export Audit (CSV)
                  </Button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/80">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Filter:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        statusFilter === 'all'
                          ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      All ({data.post_hoc_audit.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('underpowered')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        statusFilter === 'underpowered'
                          ? 'bg-rose-600 text-white shadow-xs font-semibold'
                          : 'bg-background hover:bg-muted text-rose-700'
                      }`}
                    >
                      Underpowered &lt; 80% ({underpoweredCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('optimal')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        statusFilter === 'optimal'
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'bg-background hover:bg-muted text-emerald-700'
                      }`}
                    >
                      Optimal ≥ 80% ({optimalCount})
                    </button>
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filter comparison or instance..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/70">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Instance</TableHead>
                      <TableHead className="font-bold text-xs">Comparison</TableHead>
                      <TableHead className="text-center font-bold text-xs">
                        Observed Cohen&apos;s d
                      </TableHead>
                      <TableHead className="text-center font-bold text-xs">
                        Vargha-Delaney A₁₂
                      </TableHead>
                      <TableHead className="text-center font-bold text-xs">Sample N</TableHead>
                      <TableHead className="text-center font-bold text-xs">
                        Achieved Power (1-β)
                      </TableHead>
                      <TableHead className="text-center font-bold text-xs">Status</TableHead>
                      <TableHead className="font-bold text-xs">Actionable Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAudit.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-6 text-xs text-muted-foreground"
                        >
                          No pairwise comparisons matched the current filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAudit.map((audit: PostHocPowerItem, idx: number) => (
                        <TableRow
                          key={`${audit.instance}-${audit.algo_1}-${audit.algo_2}-${idx}`}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="font-mono text-xs font-semibold">
                            {audit.instance}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {audit.algo_1} <span className="text-muted-foreground">vs</span>{' '}
                            {audit.algo_2}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {audit.cohens_d.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {audit.a12.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-bold">
                            {audit.n_samples}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-bold">
                            <span
                              className={
                                audit.achieved_power >= 0.8
                                  ? 'text-emerald-700'
                                  : audit.achieved_power >= 0.7
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                              }
                            >
                              {(audit.achieved_power * 100).toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                audit.power_status === 'Optimal'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : audit.power_status === 'Adequate'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {audit.power_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {audit.recommendation}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
