import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BenchmarkRecord,
  DataExplorationResponse,
  PowerAnalysisResponse,
  PostHocPowerItem,
  SampleSizeRecommendation,
  SensitivityAuditItem,
  TOSTResult,
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
  Info,
  Link2,
  Scale,
  Search,
  SlidersHorizontal,
} from 'lucide-react'

interface PowerAnalysisWorkspaceProps {
  records?: BenchmarkRecord[]
  alpha: number
  apiOnline?: boolean
  selectedDatasetFilename?: string | null
  rawCsv?: string
  initialSubTab?: PowerSubTab
  initialMetric?: string
  exploration?: DataExplorationResponse | null
}

type PowerSubTab = 'planning' | 'curves' | 'audit' | 'sensitivity_tost'

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
  initialSubTab,
  initialMetric,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PowerSubTab>(initialSubTab || 'planning')
  const [targetPower, setTargetPower] = useState<number>(0.8)
  const [targetEffectSize, setTargetEffectSize] = useState<number>(0.5)
  const [selectedMetric, setSelectedMetric] = useState<string | undefined>(initialMetric)
  const [pairedDesign, setPairedDesign] = useState<boolean>(false)
  const [chartEl, setChartEl] = useState<HTMLDivElement | null>(null)

  // Post-hoc audit table filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'underpowered' | 'optimal'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // TOST Equivalence Lab state
  const [tostScope, setTostScope] = useState<'single-instance' | 'all-instances'>('single-instance')
  const [tostInstance, setTostInstance] = useState<string>('')
  const [tostAlgoA, setTostAlgoA] = useState<string>('')
  const [tostAlgoB, setTostAlgoB] = useState<string>('')
  const [tostEqBound, setTostEqBound] = useState<number>(0.05)
  const [tostMode, setTostMode] = useState<'welch' | 'student' | 'paired'>('welch')
  const [tostResult, setTostResult] = useState<TOSTResult | null>(null)
  const [isLoadingTost, setIsLoadingTost] = useState<boolean>(false)
  const [tostError, setTostError] = useState<string | null>(null)

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab)
  }, [initialSubTab])

  useEffect(() => {
    if (initialMetric) setSelectedMetric(initialMetric)
  }, [initialMetric])

  const availableMetrics = useMemo(() => {
    if (!records || records.length === 0) return []
    return Array.from(new Set(records.map((r) => r.metric))).sort()
  }, [records])

  const availableAlgorithms = useMemo(() => {
    if (!records || records.length === 0) return []
    return Array.from(new Set(records.map((r) => r.algorithm))).sort()
  }, [records])

  const availableInstances = useMemo(() => {
    if (!records || records.length === 0) return []
    return Array.from(new Set(records.map((r) => r.instance))).sort()
  }, [records])

  const targetMetric = selectedMetric || availableMetrics[0] || 'HV'
  const activeTostInstance =
    tostInstance && availableInstances.includes(tostInstance)
      ? tostInstance
      : availableInstances[0] || ''
  const activeTostAlgoA =
    tostAlgoA && availableAlgorithms.includes(tostAlgoA) ? tostAlgoA : availableAlgorithms[0] || ''
  const activeTostAlgoB =
    tostAlgoB && availableAlgorithms.includes(tostAlgoB)
      ? tostAlgoB
      : availableAlgorithms[1] || availableAlgorithms[0] || ''

  const actualN = useMemo(() => {
    if (!records || records.length === 0) return 30
    const firstCell = records.filter(
      (r) => r.instance === records[0].instance && r.algorithm === records[0].algorithm
    )
    return firstCell.length || 30
  }, [records])

  const datasetId = selectedDatasetFilename || (rawCsv ? `csv-${rawCsv.length}` : 'default')
  const cacheKey = useMemo(
    () =>
      getPowerCacheKey(datasetId, targetMetric, alpha, targetPower, targetEffectSize, pairedDesign),
    [datasetId, targetMetric, alpha, targetPower, targetEffectSize, pairedDesign]
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
            paired: pairedDesign,
          })
        } else if (rawCsv) {
          res = await apiClient.getPowerAnalysisFromCsv(rawCsv, {
            metric: targetMetric,
            alpha,
            target_power: targetPower,
            target_effect_size: targetEffectSize,
            paired: pairedDesign,
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
      pairedDesign,
    ]
  )

  const runTost = useCallback(async () => {
    if (
      activeSubTab !== 'sensitivity_tost' ||
      !apiOnline ||
      !activeTostAlgoA ||
      !activeTostAlgoB ||
      activeTostAlgoA === activeTostAlgoB ||
      (!selectedDatasetFilename && !rawCsv)
    ) {
      return
    }
    setIsLoadingTost(true)
    setTostError(null)
    try {
      const bound = Math.max(1e-9, Math.abs(tostEqBound))
      const params = {
        metric: targetMetric,
        algo_a: activeTostAlgoA,
        algo_b: activeTostAlgoB,
        low_eqbound: -bound,
        high_eqbound: bound,
        scope: tostScope,
        instance: tostScope === 'single-instance' ? activeTostInstance : undefined,
        alpha,
        paired: tostMode === 'paired',
        equal_var: tostMode === 'student',
      }
      const res = selectedDatasetFilename
        ? await apiClient.getTostFromPath(selectedDatasetFilename, params)
        : await apiClient.getTostFromCsv(rawCsv || '', params)
      setTostResult(res)
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : 'Failed to compute TOST equivalence test.')
      setTostError(detail)
      setTostResult(null)
    } finally {
      setIsLoadingTost(false)
    }
  }, [
    activeSubTab,
    apiOnline,
    activeTostAlgoA,
    activeTostAlgoB,
    tostEqBound,
    targetMetric,
    tostScope,
    activeTostInstance,
    alpha,
    tostMode,
    selectedDatasetFilename,
    rawCsv,
  ])

  useEffect(() => {
    runTost()
  }, [runTost])

  const handleExportSensitivityCsv = () => {
    if (!data?.sensitivity_audit) return
    const headers = [
      'Instance',
      'Algorithm 1',
      'Algorithm 2',
      'Sample N',
      'Target Power',
      'Alpha',
      'Paired',
      'MDES Cohens d',
      'Observed Cohens d',
      'Observed A12',
      'Recommendation',
    ]
    const rows = data.sensitivity_audit.map((s) => [
      s.instance,
      s.algo_1,
      s.algo_2,
      s.n_samples,
      s.target_power,
      s.alpha,
      s.paired ? 'Yes' : 'No',
      s.mdes_cohens_d.toFixed(4),
      s.observed_cohens_d.toFixed(4),
      s.observed_a12.toFixed(4),
      s.recommendation,
    ])
    exportToCsv(`saes_sensitivity_mdes_${targetMetric}`, headers, rows)
  }

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
        {/* Top View Subtabs + Actions Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/60 gap-1 overflow-x-auto max-w-full shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('planning')}
              title="A priori sample size determination across independent, paired, and non-parametric runs"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'planning'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>A Priori Planning</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('curves')}
              title="Sensitivity power curves (1 - β vs N) with reference dataset line"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'curves'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Power Curves</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('audit')}
              title="Post-hoc power audit across all pairwise algorithm comparisons in current dataset"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'audit'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Power Audit</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('sensitivity_tost')}
              title="Minimum Detectable Effect Size (MDES) sensitivity audit and Schuirmann TOST Equivalence Testing"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === 'sensitivity_tost'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Sensitivity &amp; TOST</span>
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

            {/* Paired Design Toggle */}
            <Button
              type="button"
              variant={pairedDesign ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setPairedDesign((p) => !p)}
              className="h-8 gap-1.5 text-xs rounded-lg"
              title="Default is Independent Runs. Enable Paired only when run_id indices represent matched CV folds or Common Random Numbers (CRN)."
            >
              <Link2 className="w-3.5 h-3.5" />
              {pairedDesign ? 'Paired Design' : 'Independent Runs'}
            </Button>
          </div>
        </div>

        {/* Subtitle, Health Status Badge & Recalculate Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              Non-Central Student t &amp; Hodges-Lehmann Formulation
            </span>
            <span>•</span>
            <span>Significance level α = {alpha}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

            {/* Recalculate Button placed here */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={loading}
              className="h-7 px-2.5 gap-1.5 text-xs rounded-lg cursor-pointer"
              title="Recalculate statistical power and sample size estimations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Recalculate
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
                  className="h-8 text-xs gap-1.5 rounded-lg ml-auto shrink-0"
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

                <div className="flex flex-wrap items-center gap-2 ml-auto shrink-0 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportAuditCsv}
                    className="h-8 text-xs gap-1.5 rounded-lg shrink-0"
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

          {/* SUBTAB 4: SENSITIVITY (MDES) & TOST EQUIVALENCE TESTING */}
          {activeSubTab === 'sensitivity_tost' && (
            <div className="space-y-5">
              {/* Interactive TOST Equivalence Testing Lab (Schuirmann 1987; Lakens 2017) */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Scale className="w-4 h-4 text-primary" />
                      <span>TOST Statistical Equivalence Test (Schuirmann 1987; Lakens 2017)</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tests whether two algorithms are practically equivalent within [−Δ, +Δ] by
                      checking if the {(1 - 2 * alpha) * 100}% CI falls strictly inside the
                      equivalence bounds.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={runTost}
                    disabled={isLoadingTost}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTost ? 'animate-spin' : ''}`} />
                    Run TOST
                  </Button>
                </div>

                {/* TOST Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground block">
                      Algorithm A
                    </label>
                    <SelectDropdown
                      value={activeTostAlgoA}
                      options={availableAlgorithms.map((a) => ({ value: a, label: a }))}
                      onChange={setTostAlgoA}
                      fullWidth
                      triggerClassName="h-9 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground block">
                      Algorithm B
                    </label>
                    <SelectDropdown
                      value={activeTostAlgoB}
                      options={availableAlgorithms.map((a) => ({ value: a, label: a }))}
                      onChange={setTostAlgoB}
                      fullWidth
                      triggerClassName="h-9 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground block">
                      Scope
                    </label>
                    <SelectDropdown
                      value={tostScope}
                      options={[
                        { value: 'single-instance', label: 'Single Instance' },
                        ...(availableInstances.length > 1
                          ? [{ value: 'all-instances', label: 'All Instances' }]
                          : []),
                      ]}
                      onChange={(v) => setTostScope(v as 'single-instance' | 'all-instances')}
                      fullWidth
                      triggerClassName="h-9"
                    />
                  </div>
                  {tostScope === 'single-instance' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground block">
                        Instance
                      </label>
                      <SelectDropdown
                        value={activeTostInstance}
                        options={availableInstances.map((i) => ({ value: i, label: i }))}
                        onChange={setTostInstance}
                        fullWidth
                        triggerClassName="h-9 font-mono"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground block">
                      Equivalence Bound (±Δ)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.0001"
                      value={tostEqBound}
                      onChange={(e) => setTostEqBound(Math.max(0.0001, Number(e.target.value) || 0.05))}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground block">
                      t-Test Variant
                    </label>
                    <SelectDropdown
                      value={tostMode}
                      options={[
                        { value: 'welch', label: 'Welch (Independent)' },
                        { value: 'student', label: 'Student (Equal Var)' },
                        { value: 'paired', label: 'Paired (Matched)' },
                      ]}
                      onChange={(v) => setTostMode(v as 'welch' | 'student' | 'paired')}
                      fullWidth
                      triggerClassName="h-9"
                    />
                  </div>
                </div>

                {tostError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{tostError}</span>
                  </div>
                )}

                {tostResult && (
                  <div className="space-y-4">
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                        tostResult.is_equivalent
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            tostResult.is_equivalent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 text-white'
                          }
                        >
                          {tostResult.is_equivalent
                            ? 'STATISTICALLY EQUIVALENT'
                            : 'EQUIVALENCE NOT ESTABLISHED'}
                        </Badge>
                        <span className="font-mono font-semibold">
                          p_TOST ={' '}
                          {tostResult.p_value < 0.0001
                            ? '< 0.0001'
                            : tostResult.p_value.toFixed(4)}
                        </span>
                        <span className="font-mono">
                          • Δ = {tostResult.mean_diff.toFixed(4)} ({(1 - 2 * tostResult.alpha) * 100}
                          % CI [{tostResult.ci_lower.toFixed(4)}, {tostResult.ci_upper.toFixed(4)}])
                        </span>
                      </div>
                      <span className="font-mono text-[11px]">
                        Bounds: [{tostResult.low_eqbound.toFixed(4)},{' '}
                        {tostResult.high_eqbound.toFixed(4)}] • df ={' '}
                        {tostResult.degrees_of_freedom.toFixed(1)}
                      </span>
                    </div>

                    {/* Visual TOST Equivalence Interval Chart */}
                    <div className="rounded-lg border border-border/70 bg-background p-2">
                      <PlotlyChart
                        data={[
                          {
                            type: 'scatter',
                            mode: 'markers',
                            x: [tostResult.mean_diff],
                            y: [`${tostResult.group_1} − ${tostResult.group_2}`],
                            marker: {
                              size: 12,
                              color: tostResult.is_equivalent ? '#10b981' : '#f59e0b',
                              line: { color: '#0f172a', width: 1.5 },
                            },
                            error_x: {
                              type: 'data',
                              symmetric: false,
                              array: [Math.max(0, tostResult.ci_upper - tostResult.mean_diff)],
                              arrayminus: [Math.max(0, tostResult.mean_diff - tostResult.ci_lower)],
                              color: tostResult.is_equivalent ? '#059669' : '#d97706',
                              thickness: 3,
                              width: 8,
                            },
                            hovertemplate:
                              `Mean Diff: %{x:.4f}<br>` +
                              `CI: [${tostResult.ci_lower.toFixed(4)}, ${tostResult.ci_upper.toFixed(4)}]<extra></extra>`,
                            showlegend: false,
                          },
                        ]}
                        layout={{
                          height: 170,
                          margin: { l: 140, r: 30, t: 30, b: 44 },
                          title: {
                            text: `TOST ${(1 - 2 * tostResult.alpha) * 100}% Equivalence Confidence Interval vs [−Δ, +Δ]`,
                            font: { size: 12 },
                          },
                          xaxis: {
                            title: { text: `Difference (${targetMetric})`, font: { size: 11 } },
                            zeroline: true,
                            zerolinecolor: '#94a3b8',
                            gridcolor: '#e2e8f0',
                          },
                          yaxis: { automargin: true },
                          shapes: [
                            {
                              type: 'rect',
                              xref: 'x',
                              yref: 'paper',
                              x0: tostResult.low_eqbound,
                              x1: tostResult.high_eqbound,
                              y0: 0,
                              y1: 1,
                              fillcolor: 'rgba(16, 185, 129, 0.14)',
                              line: { color: '#10b981', width: 1.5, dash: 'dash' },
                            },
                          ],
                          paper_bgcolor: 'transparent',
                          plot_bgcolor: 'transparent',
                        }}
                        style={{ width: '100%', height: '170px' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sensitivity Analysis (MDES) Table */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Sensitivity Analysis — Minimum Detectable Effect Size (MDES)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Smallest true Cohen&apos;s d detectable at {(targetPower * 100).toFixed(0)}%
                      power and α = {alpha} given your dataset&apos;s actual sample size N.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportSensitivityCsv}
                    disabled={!data.sensitivity_audit || data.sensitivity_audit.length === 0}
                    className="h-8 text-xs gap-1.5 rounded-lg ml-auto shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Export MDES (CSV)
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Methodological Note (Hoenig &amp; Heisey, 2001):</strong> Sensitivity
                    analysis (MDES) is statistically preferred over observed post-hoc power because
                    it reports the exact effect size your current experimental budget can reliably
                    detect without circular dependence on the observed p-value.
                  </span>
                </div>

                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/70">
                      <TableRow>
                        <TableHead className="font-bold text-xs">Instance</TableHead>
                        <TableHead className="font-bold text-xs">Comparison</TableHead>
                        <TableHead className="text-center font-bold text-xs">Sample N</TableHead>
                        <TableHead className="text-center font-bold text-xs">
                          MDES (Min Detectable d)
                        </TableHead>
                        <TableHead className="text-center font-bold text-xs">
                          Observed |d|
                        </TableHead>
                        <TableHead className="text-center font-bold text-xs">
                          Observed A₁₂
                        </TableHead>
                        <TableHead className="font-bold text-xs">Guidance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data.sensitivity_audit || []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-6 text-xs text-muted-foreground"
                          >
                            No sensitivity audit rows available for this dataset slice.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (data.sensitivity_audit || []).map(
                          (item: SensitivityAuditItem, idx: number) => (
                            <TableRow
                              key={`${item.instance}-${item.algo_1}-${item.algo_2}-${idx}`}
                              className="hover:bg-muted/30"
                            >
                              <TableCell className="font-mono text-xs font-semibold">
                                {item.instance}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {item.algo_1} <span className="text-muted-foreground">vs</span>{' '}
                                {item.algo_2}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-bold">
                                {item.n_samples}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-bold text-primary">
                                d ≥ {item.mdes_cohens_d.toFixed(3)}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {item.observed_cohens_d.toFixed(3)}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {item.observed_a12.toFixed(3)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {item.recommendation}
                              </TableCell>
                            </TableRow>
                          )
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
