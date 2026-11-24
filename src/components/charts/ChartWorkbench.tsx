import React, { useState, useMemo, useRef, useEffect } from 'react'
import Plotly, { Data, Layout, Annotations, Shape } from 'plotly.js-dist-min'
import {
  BayesianCorrelatedTResult,
  BenchmarkRecord,
  DataExplorationResponse,
  EffectSizeForestResult,
  RankingAnalysisResponse,
} from '../../api/types'
import { apiClient } from '../../api/client'
import { PlotlyChart } from './PlotlyChart'
import { PaletteSelector, PaletteColorPicker, SCIENTIFIC_PALETTES } from './PaletteSelector'
import { ExportToolbar } from './ExportToolbar'
import { SelectDropdown } from '../ui/select-dropdown'
import { Button } from '../ui/button'
import {
  AlertTriangle,
  BarChart2,
  BarChart3,
  Box,
  Activity,
  Type,
  CircleDot,
  RectangleHorizontal,
  Columns2,
  Square,
  MonitorPlay,
  BookOpen,
  RotateCcw,
  ListFilter,
  GitCommitHorizontal,
  Sparkles,
  Layers,
  Loader2,
  TrendingUp,
  Trophy,
  SlidersHorizontal,
  LineChart,
} from 'lucide-react'
import { useAppearance } from '../../context/AppearanceContext'

interface ChartWorkbenchProps {
  records: BenchmarkRecord[]
  alpha: number
  apiOnline?: boolean
  selectedDatasetFilename?: string | null
  rawCsv?: string
  initialGraphType?: string
  initialMetric?: string
  exploration?: DataExplorationResponse | null
}

type GraphType =
  | 'boxplot'
  | 'violin'
  | 'ecdf'
  | 'barplot'
  | 'critical-distance'
  | 'bayesian-sign'
  | 'bayesian-rank'
  | 'plackett-luce'
  | 'effect-size-forest'
  | 'bayesian-correlated-t'
type ForestMetricType = 'hedges_g' | 'cohens_d' | 'a12' | 'cliffs_delta'
type LegendPlacement = 'top' | 'bottom' | 'right' | 'inside' | 'none'
type RankingScope = 'all-instances' | 'single-instance'
type BoldMode = 'none' | 'all' | 'title-axes' | 'algorithms' | 'values' | 'title-algorithms'
type TitleMode = 'top-full' | 'top-context' | 'top-params' | 'top-metric' | 'none'
type LabelMode = 'all' | 'first' | 'second' | 'third' | 'ticks-only' | 'none'

interface ChartTypeOption {
  id: GraphType
  label: string
  icon: React.ComponentType<{ className?: string }>
  title: string
}

const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  // Row 1: Distribution & Baseline Ranking Plots (5 items)
  {
    id: 'boxplot',
    label: 'Boxplot',
    icon: Box,
    title: 'Tukey boxplot showing median, IQR, whiskers, and individual data points',
  },
  {
    id: 'violin',
    label: 'Violin Plot',
    icon: Activity,
    title: 'Violin plot combining kernel density estimation with boxplot summary',
  },
  {
    id: 'ecdf',
    label: 'ECDF',
    icon: TrendingUp,
    title: 'Empirical Cumulative Distribution Function (ECDF) across algorithms',
  },
  {
    id: 'barplot',
    label: 'Mean ± SD Bar',
    icon: BarChart2,
    title: 'Mean ± SD Bar Chart computed by SAES backend',
  },
  {
    id: 'critical-distance',
    label: 'Critical Distance',
    icon: GitCommitHorizontal,
    title: 'Demšar (2006) Friedman + Nemenyi Critical Distance Diagram (computed by SAES backend)',
  },

  // Row 2: Advanced Multi-Algorithm & Bayesian Plots (5 items)
  {
    id: 'plackett-luce',
    label: 'Plackett-Luce',
    icon: Trophy,
    title: 'Calvo et al. (2018) Bayesian Plackett-Luce joint multi-algorithm ranking (P(best) + 95% CrI)',
  },
  {
    id: 'effect-size-forest',
    label: 'Effect-Size Forest',
    icon: SlidersHorizontal,
    title: "Standardized Effect-Size Forest Plot (Hedges' g, Cohen's d, Vargha-Delaney A12, Cliff's δ) with exact 95% CIs",
  },
  {
    id: 'bayesian-sign',
    label: 'Bayes Sign',
    icon: Sparkles,
    title: 'Benavoli et al. (2017) Bayesian Sign Test Simplex (ROPE)',
  },
  {
    id: 'bayesian-rank',
    label: 'Bayes Signed-Rank',
    icon: Sparkles,
    title: 'Benavoli et al. (2017) Bayesian Signed-Rank Test Simplex (ROPE)',
  },
  {
    id: 'bayesian-correlated-t',
    label: 'Bayes Correlated t',
    icon: LineChart,
    title: 'Benavoli et al. (2017) / Nadeau & Bengio (2003) Bayesian Correlated t-Test Posterior Density',
  },
]

interface PaperPreset {
  id: string
  label: string
  shortLabel: string
  ratioLabel: string
  description: string
  width: number
  height: number
  icon: typeof Columns2
}

const PAPER_PRESETS: PaperPreset[] = [
  {
    id: 'single-col',
    label: 'Single Column (4:3)',
    shortLabel: '1-Col (4:3)',
    ratioLabel: '4:3 • 88mm (IEEE / Springer / ACM)',
    description: 'Standard single-column journal figure (4:3 aspect ratio)',
    width: 680,
    height: 510,
    icon: Columns2,
  },
  {
    id: 'golden',
    label: 'Scientific Golden (1.6:1)',
    shortLabel: 'Golden (1.6:1)',
    ratioLabel: '1.618:1 • Classic Academic Figure',
    description: 'Golden ratio preferred by Nature, Science & Elsevier',
    width: 800,
    height: 495,
    icon: BookOpen,
  },
  {
    id: 'double-col',
    label: 'Double Column (16:9)',
    shortLabel: '2-Col (16:9)',
    ratioLabel: '16:9 • 180mm Full Page Width',
    description: 'Wide two-column figure spanning full journal page width',
    width: 960,
    height: 540,
    icon: RectangleHorizontal,
  },
  {
    id: 'square',
    label: 'Square Panel (1:1)',
    shortLabel: 'Square (1:1)',
    ratioLabel: '1:1 • Multi-panel Subfigure (a, b, c)',
    description: 'Square proportion ideal for side-by-side LaTeX subfigures',
    width: 600,
    height: 600,
    icon: Square,
  },
  {
    id: 'compact',
    label: 'Compact Strip (2:1)',
    shortLabel: 'Compact (2:1)',
    ratioLabel: '2:1 • Low-profile CD / Rank Figure',
    description: 'Saves vertical space in strict page-limit conferences (ideal for CD diagrams)',
    width: 920,
    height: 440,
    icon: MonitorPlay,
  },
]

const FONT_FAMILIES = [
  { value: 'Times New Roman, Times, serif', label: 'Times / LaTeX Serif' },
  { value: 'Inter, -apple-system, sans-serif', label: 'Inter / Sans-Serif (Nature)' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial / Helvetica (IEEE)' },
  { value: 'Georgia, serif', label: 'Georgia Serif' },
]

const LEGEND_PLACEMENTS: { value: LegendPlacement; label: string }[] = [
  { value: 'top', label: 'Top (Above Plot)' },
  { value: 'right', label: 'Right (Outside)' },
  { value: 'bottom', label: 'Bottom (Below Axis)' },
  { value: 'inside', label: 'Inside (Top-Right)' },
  { value: 'none', label: 'Hidden (No Legend)' },
]

const X_TICK_ANGLES = [
  { value: 'auto', label: 'Auto' },
  { value: '0', label: '0° (Horizontal)' },
  { value: '-30', label: '-30° (Tilted)' },
  { value: '-45', label: '-45° (Diagonal)' },
  { value: '-90', label: '-90° (Vertical)' },
]

const BOLD_OPTIONS: { value: BoldMode; label: string }[] = [
  { value: 'none', label: 'None (No Bold)' },
  { value: 'all', label: 'All (Titles, Algorithms & Values)' },
  { value: 'title-axes', label: 'Titles & Axis Headers Only' },
  { value: 'algorithms', label: 'Algorithm Names Only' },
  { value: 'values', label: 'Values, Ranks & Probabilities Only' },
  { value: 'title-algorithms', label: 'Titles & Algorithm Names' },
]

const TITLE_OPTIONS: { value: TitleMode; label: string }[] = [
  { value: 'top-full', label: 'Full (Metrics, Instances & Params)' },
  { value: 'top-context', label: 'Metrics & Instances Only' },
  { value: 'top-params', label: 'Parameters Only' },
  { value: 'top-metric', label: 'Metric(s) Only' },
  { value: 'none', label: 'Hidden (No Title)' },
]

export const ChartWorkbench = ({
  records,
  alpha,
  apiOnline = true,
  selectedDatasetFilename,
  rawCsv,
  initialGraphType,
  initialMetric,
  exploration: sharedExploration,
}: ChartWorkbenchProps) => {
  const { theme } = useAppearance()
  const isDark = theme === 'dark'
  const [graphType, setGraphType] = useState<GraphType>(() => {
    if (initialGraphType && CHART_TYPE_OPTIONS.some((o) => o.id === initialGraphType)) {
      return initialGraphType as GraphType
    }
    return 'boxplot'
  })
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('academic')
  const [fontScale, setFontScale] = useState<number>(13)
  const [fontFamily, setFontFamily] = useState<string>('Inter, -apple-system, sans-serif')
  const [boldMode, setBoldMode] = useState<BoldMode>('title-algorithms')
  const [titleMode, setTitleMode] = useState<TitleMode>('top-full')
  const [labelMode, setLabelMode] = useState<LabelMode>('all')
  const [presetId, setPresetId] = useState<string>('golden')
  const [figureWidth, setFigureWidth] = useState<number>(800)
  const [figureHeight, setFigureHeight] = useState<number>(495)
  const [paperWhiteBg, setPaperWhiteBg] = useState<boolean>(true)
  const [showOverlayPoints, setShowOverlayPoints] = useState<boolean>(true)
  const [legendPlacement, setLegendPlacement] = useState<LegendPlacement>('top')
  const [xTickAngle, setXTickAngle] = useState<string>('auto')
  const [rankingScope, setRankingScope] = useState<RankingScope>('all-instances')
  const [ropePercent, setRopePercent] = useState<number>(1.0)
  const [ropeMode, setRopeMode] = useState<'relative' | 'absolute'>('relative')
  const [ropeAbsolute, setRopeAbsolute] = useState<number>(0.01)
  const [priorStrength, setPriorStrength] = useState<number>(1.0)
  const [selectedAlgoA, setSelectedAlgoA] = useState<string>('')
  const [selectedAlgoB, setSelectedAlgoB] = useState<string>('')
  const [rankingData, setRankingData] = useState<RankingAnalysisResponse | null>(null)
  const [isLoadingRanking, setIsLoadingRanking] = useState<boolean>(false)
  const [rankingError, setRankingError] = useState<string | null>(null)

  // Effect-Size Forest Plot state
  const [forestMetric, setForestMetric] = useState<ForestMetricType>('hedges_g')
  const [forestScope, setForestScope] = useState<RankingScope>('single-instance')
  const [forestReference, setForestReference] = useState<string>('')
  const [forestPaired, setForestPaired] = useState<boolean>(false)
  const [forestData, setForestData] = useState<EffectSizeForestResult | null>(null)
  const [isLoadingForest, setIsLoadingForest] = useState<boolean>(false)
  const [forestError, setForestError] = useState<string | null>(null)

  // Bayesian Correlated t-test state (CV folds / paired observations)
  const [corrTRho, setCorrTRho] = useState<string>('auto')
  const [corrTRope, setCorrTRope] = useState<number>(0.01)
  const [corrTScope, setCorrTScope] = useState<RankingScope>('single-instance')
  const [corrTData, setCorrTData] = useState<BayesianCorrelatedTResult | null>(null)
  const [isLoadingCorrT, setIsLoadingCorrT] = useState<boolean>(false)
  const [corrTError, setCorrTError] = useState<string | null>(null)

  // Exploration diagnostics for dataset-aware barplot stats & suitability guards
  const [localExploration, setLocalExploration] = useState<DataExplorationResponse | null>(null)

  const [isExporting, setIsExporting] = useState(false)
  const chartRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!initialGraphType) return
    const valid: GraphType[] = [
      'boxplot',
      'violin',
      'ecdf',
      'barplot',
      'critical-distance',
      'bayesian-sign',
      'bayesian-rank',
      'plackett-luce',
      'effect-size-forest',
      'bayesian-correlated-t',
    ]
    if (valid.includes(initialGraphType as GraphType)) {
      setGraphType(initialGraphType as GraphType)
    }
  }, [initialGraphType])

  useEffect(() => {
    if (sharedExploration || !apiOnline || (!selectedDatasetFilename && !rawCsv)) return
    let cancelled = false
    const loadExplore = async () => {
      try {
        const res = selectedDatasetFilename
          ? await apiClient.exploreDatasetFromPath(selectedDatasetFilename, { alpha })
          : await apiClient.exploreDatasetFromCsv(rawCsv || '', { alpha })
        if (!cancelled) setLocalExploration(res)
      } catch {
        // Non-blocking
      }
    }
    loadExplore()
    return () => {
      cancelled = true
    }
  }, [sharedExploration, apiOnline, selectedDatasetFilename, rawCsv, alpha])

  const effectiveExploration = sharedExploration ?? localExploration
  const contextDiag = effectiveExploration?.context_diagnostics

  const activePreset = useMemo(
    () => PAPER_PRESETS.find((p) => p.id === presetId) || null,
    [presetId]
  )

  const handleSelectPreset = (preset: PaperPreset) => {
    setPresetId(preset.id)
    setFigureWidth(preset.width)
    setFigureHeight(preset.height)
  }

  // Decide whether figure canvas uses crisp publication white or dark UI theme
  const useLightCanvas = paperWhiteBg || !isDark

  // Instances & Metrics
  const instances = useMemo(() => Array.from(new Set(records.map((r) => r.instance))), [records])
  const metrics = useMemo(() => Array.from(new Set(records.map((r) => r.metric))), [records])

  const [selectedInstance, setSelectedInstance] = useState<string>('')
  const [selectedMetric, setSelectedMetric] = useState<string>(initialMetric || '')
  const [selectedRightMetric, setSelectedRightMetric] = useState<string>('none')
  const [leftColorIndex, setLeftColorIndex] = useState<number>(0)
  const [rightColorIndex, setRightColorIndex] = useState<number>(1)

  useEffect(() => {
    if (initialMetric && metrics.includes(initialMetric)) {
      setSelectedMetric(initialMetric)
    }
  }, [initialMetric, metrics])

  const isDistributionChart = graphType === 'boxplot' || graphType === 'violin'
  const isCellPlot =
    graphType === 'boxplot' ||
    graphType === 'violin' ||
    graphType === 'ecdf' ||
    graphType === 'barplot'
  const isBayesianChart = graphType === 'bayesian-sign' || graphType === 'bayesian-rank'
  const isRankingChart =
    graphType === 'critical-distance' || isBayesianChart || graphType === 'plackett-luce'
  const isForestChart = graphType === 'effect-size-forest'
  const isCorrTChart = graphType === 'bayesian-correlated-t'
  const isBackendComputedChart = isRankingChart || isForestChart || isCorrTChart

  const activeInstance = instances.includes(selectedInstance)
    ? selectedInstance
    : instances[0] || ''
  const singleMetric = metrics.includes(selectedMetric) ? selectedMetric : metrics[0] || ''
  const rightMetric =
    selectedRightMetric !== 'none' && metrics.includes(selectedRightMetric)
      ? selectedRightMetric
      : 'none'
  const hasRightMetric = isDistributionChart && rightMetric !== 'none'
  const activeMetric =
    isRankingChart && selectedMetric === 'all-metrics' ? 'all-metrics' : singleMetric

  // Active palette & metric colors for Boxplot / Violin
  const activePalette = useMemo(() => {
    return (
      SCIENTIFIC_PALETTES.find((p) => p.id === selectedPaletteId)?.colors ||
      SCIENTIFIC_PALETTES[0].colors
    )
  }, [selectedPaletteId])

  const activeLeftColorIdx = leftColorIndex < activePalette.length ? leftColorIndex : 0
  const activeRightColorIdx =
    rightColorIndex < activePalette.length ? rightColorIndex : 1 % activePalette.length
  const leftMetricColor = activePalette[activeLeftColorIdx]
  const rightMetricColor = activePalette[activeRightColorIdx]

  // Filter records by instance and metric(s)
  const filteredRecords = useMemo(() => {
    if (!activeInstance || !singleMetric) return []
    return records.filter((r) => r.instance === activeInstance && r.metric === singleMetric)
  }, [records, activeInstance, singleMetric])

  const rightFilteredRecords = useMemo(() => {
    if (!activeInstance || !hasRightMetric) return []
    return records.filter((r) => r.instance === activeInstance && r.metric === rightMetric)
  }, [records, activeInstance, hasRightMetric, rightMetric])

  // Unique algorithms in selected cell (across left & optional right metric)
  const algorithms = useMemo(() => {
    const combined = hasRightMetric
      ? [...filteredRecords, ...rightFilteredRecords]
      : filteredRecords
    return Array.from(new Set(combined.map((r) => r.algorithm)))
  }, [filteredRecords, rightFilteredRecords, hasRightMetric])

  // Fetch Friedman + Nemenyi CD and Bayesian Simplex ROPE test from SAES Backend API
  useEffect(() => {
    if (!isRankingChart || !activeMetric || !apiOnline) return

    let cancelled = false
    const fetchRankingFromBackend = async () => {
      setIsLoadingRanking(true)
      setRankingError(null)
      try {
        let res: RankingAnalysisResponse
        const resolvedRope = isBayesianChart && ropeMode === 'absolute' ? ropeAbsolute : undefined
        const resolvedPrior = isBayesianChart ? priorStrength : undefined
        const resolvedBayesMethod: 'sign' | 'signed-rank' =
          graphType === 'bayesian-sign' ? 'sign' : 'signed-rank'
        if (selectedDatasetFilename) {
          res = await apiClient.getRankingFromPath(
            selectedDatasetFilename,
            activeMetric,
            alpha,
            rankingScope,
            activeInstance,
            ropePercent,
            selectedAlgoA || undefined,
            selectedAlgoB || undefined,
            resolvedBayesMethod,
            resolvedRope,
            resolvedPrior
          )
        } else if (rawCsv) {
          res = await apiClient.getRankingFromCsv(
            rawCsv,
            activeMetric,
            alpha,
            rankingScope,
            activeInstance,
            ropePercent,
            selectedAlgoA || undefined,
            selectedAlgoB || undefined,
            'data.csv',
            resolvedBayesMethod,
            resolvedRope,
            resolvedPrior
          )
        } else {
          return
        }
        if (!cancelled) {
          setRankingData(res)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const detail =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            (err instanceof Error ? err.message : String(err))
          setRankingError(detail)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRanking(false)
        }
      }
    }

    fetchRankingFromBackend()
    return () => {
      cancelled = true
    }
  }, [
    isRankingChart,
    activeMetric,
    alpha,
    rankingScope,
    activeInstance,
    ropePercent,
    ropeMode,
    ropeAbsolute,
    priorStrength,
    isBayesianChart,
    graphType,
    selectedAlgoA,
    selectedAlgoB,
    apiOnline,
    selectedDatasetFilename,
    rawCsv,
  ])

  // Fetch Standardized Effect-Size Forest Plot data from SAES Backend API
  useEffect(() => {
    if (!isForestChart || !singleMetric || !apiOnline) return
    let cancelled = false
    const loadForest = async () => {
      setIsLoadingForest(true)
      setForestError(null)
      try {
        const params = {
          metric: singleMetric,
          scope: forestScope,
          instance: forestScope === 'single-instance' ? activeInstance : undefined,
          reference_algorithm: forestReference || undefined,
          alpha,
          paired: forestPaired,
          p_adjust: 'holm',
        }
        const res = selectedDatasetFilename
          ? await apiClient.getEffectSizesFromPath(selectedDatasetFilename, params)
          : await apiClient.getEffectSizesFromCsv(rawCsv || '', params)
        if (!cancelled) setForestData(res)
      } catch (err: unknown) {
        if (!cancelled) {
          const detail =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            (err instanceof Error ? err.message : String(err))
          setForestError(detail)
        }
      } finally {
        if (!cancelled) setIsLoadingForest(false)
      }
    }
    loadForest()
    return () => {
      cancelled = true
    }
  }, [
    isForestChart,
    singleMetric,
    forestScope,
    activeInstance,
    forestReference,
    forestPaired,
    alpha,
    apiOnline,
    selectedDatasetFilename,
    rawCsv,
  ])

  // Fetch Bayesian Correlated t-test Posterior Density from SAES Backend API
  useEffect(() => {
    if (!isCorrTChart || !singleMetric || !apiOnline) return
    let cancelled = false
    const loadCorrT = async () => {
      setIsLoadingCorrT(true)
      setCorrTError(null)
      try {
        const parsedRho = corrTRho === 'auto' ? undefined : Number(corrTRho)
        const params = {
          metric: singleMetric,
          algo_a: selectedAlgoA || algorithms[0] || undefined,
          algo_b: selectedAlgoB || algorithms[1] || undefined,
          scope: corrTScope,
          instance: corrTScope === 'single-instance' ? activeInstance : undefined,
          rope: corrTRope,
          rho: parsedRho !== undefined && !Number.isNaN(parsedRho) ? parsedRho : undefined,
        }
        const res = selectedDatasetFilename
          ? await apiClient.getBayesianCorrelatedTFromPath(selectedDatasetFilename, params)
          : await apiClient.getBayesianCorrelatedTFromCsv(rawCsv || '', params)
        if (!cancelled) setCorrTData(res)
      } catch (err: unknown) {
        if (!cancelled) {
          const detail =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            (err instanceof Error ? err.message : String(err))
          setCorrTError(detail)
        }
      } finally {
        if (!cancelled) setIsLoadingCorrT(false)
      }
    }
    loadCorrT()
    return () => {
      cancelled = true
    }
  }, [
    isCorrTChart,
    singleMetric,
    selectedAlgoA,
    selectedAlgoB,
    algorithms,
    corrTScope,
    activeInstance,
    corrTRope,
    corrTRho,
    apiOnline,
    selectedDatasetFilename,
    rawCsv,
  ])

  const cdResult = rankingData?.critical_distance || null
  const plackettLuceResult = rankingData?.bayesian_plackett_luce || null
  const bayesianResult = useMemo(() => {
    if (!rankingData) return null
    if (graphType === 'bayesian-sign') {
      return rankingData.bayesian_sign || rankingData.bayesian_ranking || null
    }
    return rankingData.bayesian_signed_rank || rankingData.bayesian_ranking || null
  }, [rankingData, graphType])

  // Construct Plotly Traces based on graphType
  const plotData = useMemo<Data[]>(() => {
    if (filteredRecords.length === 0 && rightFilteredRecords.length === 0) return []

    switch (graphType) {
      case 'boxplot': {
        const traces: Data[] = []
        let shownLeftLegend = false

        algorithms.forEach((algo) => {
          const values = filteredRecords.filter((r) => r.algorithm === algo).map((r) => r.value)
          if (values.length === 0) return
          const showInLegend = !shownLeftLegend
          shownLeftLegend = true

          traces.push({
            type: 'box',
            x0: algo,
            name: hasRightMetric ? `${singleMetric} (Left)` : singleMetric,
            legendgroup: 'metric-left',
            showlegend: showInLegend,
            y: values,
            yaxis: 'y',
            boxpoints: showOverlayPoints ? 'all' : 'outliers',
            jitter: 0.28,
            pointpos: 0,
            marker: {
              color: leftMetricColor,
              size: 5,
              opacity: 0.78,
              line: {
                color: useLightCanvas ? '#ffffff' : '#0f172a',
                width: 0.8,
              },
            },
            line: {
              color: leftMetricColor,
              width: 1.8,
            },
            fillcolor: `${leftMetricColor}33`,
            cliponaxis: true,
          } as unknown as Data)
        })

        if (hasRightMetric) {
          let shownRightLegend = false
          algorithms.forEach((algo) => {
            const values = rightFilteredRecords
              .filter((r) => r.algorithm === algo)
              .map((r) => r.value)
            if (values.length === 0) return
            const showInLegend = !shownRightLegend
            shownRightLegend = true

            traces.push({
              type: 'box',
              x0: algo,
              name: `${rightMetric} (Right)`,
              legendgroup: 'metric-right',
              showlegend: showInLegend,
              y: values,
              yaxis: 'y2',
              boxpoints: showOverlayPoints ? 'all' : 'outliers',
              jitter: 0.28,
              pointpos: 0,
              marker: {
                color: rightMetricColor,
                size: 5,
                opacity: 0.78,
                line: {
                  color: useLightCanvas ? '#ffffff' : '#0f172a',
                  width: 0.8,
                },
              },
              line: {
                color: rightMetricColor,
                width: 1.8,
              },
              fillcolor: `${rightMetricColor}33`,
              cliponaxis: true,
            } as unknown as Data)
          })
        }

        return traces
      }

      case 'violin': {
        const traces: Data[] = []
        let shownLeftLegend = false

        algorithms.forEach((algo) => {
          const values = filteredRecords.filter((r) => r.algorithm === algo).map((r) => r.value)
          if (values.length === 0) return
          const showInLegend = !shownLeftLegend
          shownLeftLegend = true

          traces.push({
            type: 'violin',
            x0: algo,
            name: hasRightMetric ? `${singleMetric} (Left)` : singleMetric,
            legendgroup: 'metric-left',
            showlegend: showInLegend,
            scalegroup: `${algo}-left`,
            y: values,
            yaxis: 'y',
            box: {
              visible: true,
              width: 0.25,
            },
            meanline: {
              visible: true,
            },
            points: showOverlayPoints ? 'all' : false,
            jitter: 0.22,
            pointpos: 0,
            marker: {
              color: leftMetricColor,
              size: 4.5,
              opacity: 0.78,
              line: {
                color: useLightCanvas ? '#ffffff' : '#0f172a',
                width: 0.8,
              },
            },
            line: {
              color: leftMetricColor,
              width: 1.8,
            },
            fillcolor: `${leftMetricColor}33`,
            cliponaxis: true,
          } as unknown as Data)
        })

        if (hasRightMetric) {
          let shownRightLegend = false
          algorithms.forEach((algo) => {
            const values = rightFilteredRecords
              .filter((r) => r.algorithm === algo)
              .map((r) => r.value)
            if (values.length === 0) return
            const showInLegend = !shownRightLegend
            shownRightLegend = true

            traces.push({
              type: 'violin',
              x0: algo,
              name: `${rightMetric} (Right)`,
              legendgroup: 'metric-right',
              showlegend: showInLegend,
              scalegroup: `${algo}-right`,
              y: values,
              yaxis: 'y2',
              box: {
                visible: true,
                width: 0.25,
              },
              meanline: {
                visible: true,
              },
              points: showOverlayPoints ? 'all' : false,
              jitter: 0.22,
              pointpos: 0,
              marker: {
                color: rightMetricColor,
                size: 4.5,
                opacity: 0.78,
                line: {
                  color: useLightCanvas ? '#ffffff' : '#0f172a',
                  width: 0.8,
                },
              },
              line: {
                color: rightMetricColor,
                width: 1.8,
              },
              fillcolor: `${rightMetricColor}33`,
              cliponaxis: true,
            } as unknown as Data)
          })
        }

        return traces
      }

      case 'ecdf': {
        return algorithms.map((algo, idx) => {
          const values = filteredRecords.filter((r) => r.algorithm === algo).map((r) => r.value)
          const color = activePalette[idx % activePalette.length]
          return {
            type: 'histogram',
            name: algo,
            x: values,
            cumulative: { enabled: true },
            histnorm: 'probability',
            opacity: 0.45,
            marker: { color, line: { color, width: 1.5 } },
            hovertemplate: `<b>${algo}</b><br>${singleMetric}: %{x:.4f}<br>ECDF: %{y:.2%}<extra></extra>`,
          } as unknown as Data
        })
      }

      case 'barplot': {
        const profiles = (effectiveExploration?.distribution_profiles || []).filter(
          (p) => p.instance === activeInstance && p.metric === singleMetric
        )
        const profMap = new Map(profiles.map((p) => [p.algorithm, p]))
        const xAlgos = algorithms.filter((a) => profMap.has(a))
        const means = xAlgos.map((a) => profMap.get(a)?.mean ?? 0)
        const stds = xAlgos.map((a) => profMap.get(a)?.std ?? 0)
        const barColors = xAlgos.map((_, idx) => activePalette[idx % activePalette.length])
        return [
          {
            type: 'bar',
            name: `${singleMetric} (Mean ± SD)`,
            x: xAlgos,
            y: means,
            error_y: {
              type: 'data',
              array: stds,
              visible: true,
              color: useLightCanvas ? '#334155' : '#cbd5e1',
              thickness: 1.8,
              width: 5,
            },
            marker: {
              color: barColors,
              line: { color: useLightCanvas ? '#1e293b' : '#f8fafc', width: 1 },
            },
            hovertemplate:
              `<b>%{x}</b><br>Mean ${singleMetric}: %{y:.4f}<br>± SD: %{error_y.array:.4f}<extra></extra>`,
          } as unknown as Data,
        ]
      }

      case 'plackett-luce': {
        if (!plackettLuceResult || plackettLuceResult.items.length === 0) return []
        const algos = plackettLuceResult.items.map((it) => it.algorithm)
        const colors = algos.map((_, idx) => activePalette[idx % activePalette.length])
        return [
          {
            type: 'bar',
            orientation: 'h',
            xaxis: 'x',
            yaxis: 'y',
            y: algos,
            x: plackettLuceResult.items.map((it) => it.prob_best),
            text: plackettLuceResult.items.map((it) => `${(it.prob_best * 100).toFixed(1)}%`),
            textposition: 'outside',
            marker: {
              color: colors,
              line: { color: useLightCanvas ? '#1e293b' : '#e2e8f0', width: 1 },
            },
            name: 'P(Best)',
            hovertemplate: '<b>%{y}</b><br>P(Best): %{x:.1%}<extra></extra>',
          } as unknown as Data,
          {
            type: 'scatter',
            mode: 'markers',
            xaxis: 'x2',
            yaxis: 'y',
            y: algos,
            x: plackettLuceResult.items.map((it) => it.expected_rank),
            marker: {
              size: 11,
              color: colors,
              line: { color: useLightCanvas ? '#0f172a' : '#f8fafc', width: 1.2 },
            },
            error_x: {
              type: 'data',
              symmetric: false,
              array: plackettLuceResult.items.map((it) => it.rank_ci_upper - it.expected_rank),
              arrayminus: plackettLuceResult.items.map((it) => it.expected_rank - it.rank_ci_lower),
              color: useLightCanvas ? '#475569' : '#cbd5e1',
              thickness: 2,
              width: 5,
            },
            name: 'Expected Rank (95% CrI)',
            hovertemplate: '<b>%{y}</b><br>E[Rank]: %{x:.2f}<extra></extra>',
          } as unknown as Data,
        ]
      }

      case 'effect-size-forest': {
        if (!forestData || forestData.items.length === 0) return []
        const isA12 = forestMetric === 'a12'
        const nullVal = isA12 ? 0.5 : 0.0
        const algos = forestData.items.map((it) => it.algorithm)
        const vals = forestData.items.map((it) =>
          forestMetric === 'hedges_g'
            ? it.hedges_g
            : forestMetric === 'cohens_d'
              ? it.cohens_d
              : forestMetric === 'a12'
                ? it.a12
                : it.cliffs_delta
        )
        const lowers = forestData.items.map((it) =>
          forestMetric === 'hedges_g'
            ? it.hedges_g_ci_lower
            : forestMetric === 'cohens_d'
              ? it.cohens_d_ci_lower
              : forestMetric === 'a12'
                ? it.a12_ci_lower
                : it.cliffs_delta_ci_lower
        )
        const uppers = forestData.items.map((it) =>
          forestMetric === 'hedges_g'
            ? it.hedges_g_ci_upper
            : forestMetric === 'cohens_d'
              ? it.cohens_d_ci_upper
              : forestMetric === 'a12'
                ? it.a12_ci_upper
                : it.cliffs_delta_ci_upper
        )
        const colors = forestData.items.map((it, i) => {
          if (!it.is_significant) return '#64748b'
          const delta = vals[i] - nullVal
          const favorable = forestData.maximize ? delta > 0 : delta < 0
          return favorable ? '#10b981' : '#e11d48'
        })
        const customdata = forestData.items.map((it, i) => [
          lowers[i],
          uppers[i],
          it.p_adjusted,
          isA12 ? it.a12_magnitude : it.cohens_d_magnitude,
        ])
        return [
          {
            type: 'scatter',
            mode: 'markers',
            y: algos,
            x: vals,
            customdata,
            marker: {
              size: 11,
              color: colors,
              line: { color: useLightCanvas ? '#0f172a' : '#f8fafc', width: 1.2 },
            },
            error_x: {
              type: 'data',
              symmetric: false,
              array: uppers.map((u, i) => Math.max(0, u - vals[i])),
              arrayminus: lowers.map((l, i) => Math.max(0, vals[i] - l)),
              color: useLightCanvas ? '#334155' : '#cbd5e1',
              thickness: 2.2,
              width: 6,
            },
            hovertemplate:
              `<b>%{y} vs ${forestData.reference_algorithm}</b><br>` +
              `Estimate: <b>%{x:.3f}</b> [%{customdata[0]:.3f}, %{customdata[1]:.3f}]<br>` +
              `Magnitude: %{customdata[3]} • p_adj = %{customdata[2]:.4f}<extra></extra>`,
            showlegend: false,
          } as unknown as Data,
        ]
      }

      case 'bayesian-correlated-t': {
        if (!corrTData || corrTData.curve_x.length === 0) return []
        const { curve_x, curve_y, rope_low, rope_high, algo_a, algo_b } = corrTData
        const leftX: number[] = []
        const leftY: number[] = []
        const ropeX: number[] = []
        const ropeY: number[] = []
        const rightX: number[] = []
        const rightY: number[] = []
        curve_x.forEach((x, i) => {
          const y = curve_y[i] ?? 0
          if (x <= rope_low) {
            leftX.push(x)
            leftY.push(y)
          }
          if (x >= rope_low && x <= rope_high) {
            ropeX.push(x)
            ropeY.push(y)
          }
          if (x >= rope_high) {
            rightX.push(x)
            rightY.push(y)
          }
        })
        return [
          {
            type: 'scatter',
            mode: 'lines',
            name: `P(${algo_b} > ${algo_a}) = ${(corrTData.p_right * 100).toFixed(1)}%`,
            x: leftX,
            y: leftY,
            fill: 'tozeroy',
            fillcolor: 'rgba(225, 29, 72, 0.28)',
            line: { color: '#e11d48', width: 1.5 },
          } as unknown as Data,
          {
            type: 'scatter',
            mode: 'lines',
            name: `P(ROPE) = ${(corrTData.p_rope * 100).toFixed(1)}%`,
            x: ropeX,
            y: ropeY,
            fill: 'tozeroy',
            fillcolor: 'rgba(245, 158, 11, 0.35)',
            line: { color: '#d97706', width: 1.5 },
          } as unknown as Data,
          {
            type: 'scatter',
            mode: 'lines',
            name: `P(${algo_a} > ${algo_b}) = ${(corrTData.p_left * 100).toFixed(1)}%`,
            x: rightX,
            y: rightY,
            fill: 'tozeroy',
            fillcolor: 'rgba(16, 185, 129, 0.28)',
            line: { color: '#10b981', width: 1.5 },
          } as unknown as Data,
          {
            type: 'scatter',
            mode: 'lines',
            name: 'Posterior Student-t Density',
            x: curve_x,
            y: curve_y,
            line: { color: useLightCanvas ? '#0f172a' : '#f8fafc', width: 2.2 },
            hovertemplate: 'Δ = %{x:.4f}<br>Density = %{y:.3f}<extra></extra>',
          } as unknown as Data,
        ]
      }

      case 'critical-distance': {
        if (!cdResult) return []
        const { ranks, cliques } = cdResult
        const nLeft = Math.ceil(ranks.length / 2)
        const maxRowIdx = Math.max(0, nLeft - 1)
        const yFirstLeader = -0.15 - cliques.length * 0.06
        const yStep = maxRowIdx > 0 ? Math.max(0.14, 0.36 / maxRowIdx) : 0.15

        // Plot each algorithm as an interactive marker on the top rank axis (y = 0) and at its elbow node
        return ranks.map((item, idx) => {
          const color = activePalette[idx % activePalette.length]
          const isLeft = idx < nLeft
          const rowIdx = isLeft ? idx : ranks.length - 1 - idx
          const yLeader = yFirstLeader - rowIdx * yStep

          return {
            type: 'scatter',
            mode: 'markers',
            name: `${item.algorithm} (Rank ${item.avg_rank.toFixed(2)})`,
            x: [item.avg_rank, item.avg_rank],
            y: [0, yLeader],
            marker: {
              color,
              size: [10, 7],
              symbol: ['circle', 'diamond'],
              line: {
                color: useLightCanvas ? '#ffffff' : '#0f172a',
                width: 1.5,
              },
            },
            hovertemplate:
              `<b>${item.algorithm}</b><br>` +
              `Average Rank: <b>${item.avg_rank.toFixed(3)}</b><br>` +
              `Mean ${activeMetric}: ${item.mean_value.toFixed(4)}<extra></extra>`,
          } as unknown as Data
        })
      }

      case 'bayesian-sign':
      case 'bayesian-rank': {
        if (!bayesianResult) return []

        const customdata = bayesianResult.points_x.map((_, i) => [
          bayesianResult.points_p_left[i] ?? 0,
          bayesianResult.points_p_rope[i] ?? 0,
          bayesianResult.points_p_right[i] ?? 0,
        ])

        const traces: Data[] = [
          {
            type: 'scatter',
            mode: 'markers',
            name: 'Posterior Samples',
            x: bayesianResult.points_x,
            y: bayesianResult.points_y,
            customdata,
            marker: {
              size: 5.5,
              color: bayesianResult.points_density,
              colorscale: [
                [0.0, '#08306b'],
                [0.25, '#08519c'],
                [0.5, '#2171b5'],
                [0.72, '#4292c6'],
                [0.88, '#9ecae1'],
                [1.0, '#e0f3f8'],
              ],
              cmin: 0.0,
              cmax: 1.0,
              opacity: 0.9,
              showscale: false,
            },
            hovertemplate:
              `<b>Posterior Dirichlet Sample</b><br>` +
              `p(${bayesianResult.algo_a}): <b>%{customdata[0]:.3f}</b><br>` +
              `p(rope): <b>%{customdata[1]:.3f}</b><br>` +
              `p(${bayesianResult.algo_b}): <b>%{customdata[2]:.3f}</b><extra></extra>`,
            showlegend: false,
          } as unknown as Data,
        ]

        // Internal orange ROPE decision boundary segments from API
        bayesianResult.boundary_lines.forEach(([x0, y0, x1, y1]) => {
          traces.push({
            type: 'scatter',
            mode: 'lines',
            x: [x0, x1],
            y: [y0, y1],
            line: {
              color: '#FFA500',
              width: 3.6,
            },
            hoverinfo: 'skip',
            showlegend: false,
          } as unknown as Data)
        })

        // Outer equilateral triangle border in orange from API
        traces.push({
          type: 'scatter',
          mode: 'lines',
          x: bayesianResult.triangle_x,
          y: bayesianResult.triangle_y,
          line: {
            color: '#FFA500',
            width: 4.2,
          },
          hoverinfo: 'skip',
          showlegend: false,
        } as unknown as Data)

        return traces
      }
    }
  }, [
    filteredRecords,
    rightFilteredRecords,
    graphType,
    algorithms,
    activePalette,
    leftMetricColor,
    rightMetricColor,
    hasRightMetric,
    singleMetric,
    rightMetric,
    showOverlayPoints,
    useLightCanvas,
    cdResult,
    bayesianResult,
    plackettLuceResult,
    forestData,
    forestMetric,
    corrTData,
    effectiveExploration,
    activeInstance,
    activeMetric,
  ])

  // Plotly Layout configuration with explicit width & height for WYSIWYG scientific paper proportion
  const plotLayout = useMemo<Partial<Layout>>(() => {
    const fgPrimary = useLightCanvas ? '#0f172a' : '#f8fafc'
    const fgSecondary = useLightCanvas ? '#334155' : '#cbd5e1'
    const gridColor = useLightCanvas ? '#e2e8f0' : '#334155'
    const borderColor = useLightCanvas ? '#94a3b8' : '#475569'

    const boldTitle =
      boldMode === 'all' || boldMode === 'title-axes' || boldMode === 'title-algorithms'
    const boldAxes = boldMode === 'all' || boldMode === 'title-axes'
    const boldAlgorithms =
      boldMode === 'all' || boldMode === 'algorithms' || boldMode === 'title-algorithms'
    const boldValues = boldMode === 'all' || boldMode === 'values'
    const b = (text: string | number, enabled: boolean) => (enabled ? `<b>${text}</b>` : `${text}`)

    const buildTitleLayout = (
      metricsText: string,
      instancesText: string,
      paramsText: string,
      titleSize: number
    ): {
      titleObj: Partial<Layout['title']> | undefined
      hasTitle: boolean
      isTwoLine: boolean
      topMargin: number
    } => {
      if (titleMode === 'none') {
        return { titleObj: undefined, hasTitle: false, isTwoLine: false, topMargin: 28 }
      }
      const contentKind = titleMode.replace(/^top-/, '')

      let text: string
      let isTwoLine = false
      if (contentKind === 'full') {
        text =
          `${b(metricsText, boldTitle)}  •  ${b(instancesText, boldTitle)}<br>` +
          `<span style="font-size:${Math.max(9, fontScale - 1)}px;color:${fgSecondary}">${b(paramsText, boldValues)}</span>`
        isTwoLine = true
      } else if (contentKind === 'context') {
        text = `${b(metricsText, boldTitle)}  •  ${b(instancesText, boldTitle)}`
      } else if (contentKind === 'params') {
        text = `<span style="font-size:${fontScale}px;color:${fgPrimary}">${b(paramsText, boldTitle || boldValues)}</span>`
      } else {
        text = b(metricsText, boldTitle)
      }

      const topMargin = isTwoLine
        ? Math.round(48 + titleSize * 2.3)
        : Math.round(36 + titleSize * 1.4)
      // Center title vertically inside the top margin band with balanced padding above and below
      const titleY = 1 - (topMargin * 0.48) / Math.max(320, figureHeight)

      return {
        titleObj: {
          text,
          x: 0.5,
          xanchor: 'center',
          y: titleY,
          yanchor: 'middle',
          font: { family: fontFamily, size: titleSize, color: fgPrimary },
        },
        hasTitle: true,
        isTwoLine,
        topMargin,
      }
    }

    // ── Specialized Layout 1: Critical Distance (CD) Diagram (Demšar 2006) ──
    if (graphType === 'critical-distance' && cdResult) {
      const { k, cd, ranks, cliques, metrics_label, instances_label, params_label } = cdResult
      const shapes: Partial<Shape>[] = []
      const annotations: Partial<Annotations>[] = []

      const showAlgoLabels = labelMode === 'all' || labelMode === 'first'
      const showCdLabel = labelMode === 'all' || labelMode === 'second'
      const showBetterLabel = labelMode === 'all' || labelMode === 'third'
      const showAxisNumbers = labelMode !== 'none'

      // Calculate pixel space needed for left & right algorithm labels so they NEVER get clipped
      const maxAlgoChars = ranks.reduce((m, r) => Math.max(m, r.algorithm.length), 8)
      const labelTotalChars = maxAlgoChars + 9 // "AlgoName (3.25) "
      const approxCharPx = fontScale * 0.65
      const requiredSidePx = showAlgoLabels
        ? Math.max(165, Math.ceil(labelTotalChars * approxCharPx) + 28)
        : 60

      // Reserve side padding in data units proportional to figureWidth
      const plotInnerWidthPx = Math.max(240, figureWidth - 2 * requiredSidePx - 48)
      const unitsPerPx = Math.max(1, k - 1) / plotInnerWidthPx
      const sidePadUnits = requiredSidePx * unitsPerPx
      const leaderGapUnits = Math.max(0.18, 22 * unitsPerPx)
      const leftEdgeX = 1 - leaderGapUnits
      const rightEdgeX = k + leaderGapUnits

      // Main horizontal rank axis line at y = 0 from 1 to k
      shapes.push({
        type: 'line',
        x0: 1,
        x1: k,
        y0: 0,
        y1: 0,
        line: { color: fgPrimary, width: 2.2 },
      })

      // Major integer ticks & minor 0.5 ticks along the rank axis
      for (let t = 1; t <= k; t += 0.5) {
        const isMajor = Number.isInteger(t)
        shapes.push({
          type: 'line',
          x0: t,
          x1: t,
          y0: 0,
          y1: isMajor ? 0.055 : 0.03,
          line: { color: fgPrimary, width: isMajor ? 1.8 : 1 },
        })
        if (isMajor && showAxisNumbers) {
          annotations.push({
            x: t,
            y: 0.07,
            text: b(t, boldValues),
            showarrow: false,
            yanchor: 'bottom',
            font: { family: fontFamily, size: fontScale, color: fgPrimary },
          })
        }
      }

      // Direction indicator ("← Better (Rank 1)") above Rank 1 on its own tier below the CD bar
      if (showBetterLabel) {
        annotations.push({
          x: 1,
          y: 0.165,
          text: b('← Better (Rank 1)', boldAxes),
          showarrow: false,
          xanchor: 'left',
          yanchor: 'bottom',
          font: { family: fontFamily, size: Math.max(9, fontScale - 1), color: fgSecondary },
        })
      }

      // Reference Critical Distance (CD) scale bar on top tier so it never collides with "← Better (Rank 1)"
      const cdSpan = Math.min(cd, k - 1)
      const cdStart = Math.max(1, k - cdSpan)
      const cdEnd = k
      const yCdBar = 0.29
      shapes.push(
        {
          type: 'line',
          x0: cdStart,
          x1: cdEnd,
          y0: yCdBar,
          y1: yCdBar,
          line: { color: '#ef4444', width: 3 },
        },
        {
          type: 'line',
          x0: cdStart,
          x1: cdStart,
          y0: yCdBar - 0.025,
          y1: yCdBar + 0.025,
          line: { color: '#ef4444', width: 2 },
        },
        {
          type: 'line',
          x0: cdEnd,
          x1: cdEnd,
          y0: yCdBar - 0.025,
          y1: yCdBar + 0.025,
          line: { color: '#ef4444', width: 2 },
        }
      )
      if (showCdLabel) {
        annotations.push({
          x: (cdStart + cdEnd) / 2,
          y: yCdBar + 0.032,
          text: `${b(`CD = ${cd.toFixed(2)}`, boldValues)} (α = ${alpha})`,
          showarrow: false,
          yanchor: 'bottom',
          font: { family: fontFamily, size: Math.max(9, fontScale - 1), color: '#ef4444' },
        })
      }

      // Thick horizontal clique bars connecting statistically indistinguishable algorithms
      cliques.forEach(([rStart, rEnd], cIdx) => {
        const yClique = -0.08 - cIdx * 0.055
        shapes.push({
          type: 'line',
          x0: rStart - 0.03,
          x1: rEnd + 0.03,
          y0: yClique,
          y1: yClique,
          line: {
            color: useLightCanvas ? '#0f172a' : '#f8fafc',
            width: 5.5,
          },
        })
      })

      // L-shaped leader lines & callout labels for each algorithm (left half vs right half)
      const nLeft = Math.ceil(ranks.length / 2)
      const maxRowIdx = Math.max(0, nLeft - 1)
      const yFirstLeader = -0.15 - cliques.length * 0.06
      const yStep = maxRowIdx > 0 ? Math.max(0.14, 0.36 / maxRowIdx) : 0.15

      ranks.forEach((item, idx) => {
        const color = activePalette[idx % activePalette.length]
        const isLeft = idx < nLeft
        const rowIdx = isLeft ? idx : ranks.length - 1 - idx
        const yLeader = yFirstLeader - rowIdx * yStep
        const xEnd = isLeft ? leftEdgeX : rightEdgeX

        // Vertical drop line from axis to yLeader
        shapes.push({
          type: 'line',
          x0: item.avg_rank,
          x1: item.avg_rank,
          y0: 0,
          y1: yLeader,
          line: { color, width: 1.5, dash: 'dot' },
        })
        // Horizontal leader line to outer callout anchor
        shapes.push({
          type: 'line',
          x0: item.avg_rank,
          x1: xEnd,
          y0: yLeader,
          y1: yLeader,
          line: { color, width: 1.6 },
        })

        if (showAlgoLabels) {
          // Algorithm name + Average rank label respecting boldMode
          const algoPart = b(item.algorithm, boldAlgorithms)
          const rankPart = b(`(${item.avg_rank.toFixed(2)})`, boldValues)
          const labelHtml = isLeft ? `${algoPart} ${rankPart}` : `${rankPart} ${algoPart}`

          annotations.push({
            x: xEnd,
            y: yLeader,
            text: labelHtml,
            xshift: isLeft ? -6 : 6,
            showarrow: false,
            xanchor: isLeft ? 'right' : 'left',
            yanchor: 'middle',
            font: { family: fontFamily, size: fontScale, color: fgPrimary },
          })
        }
      })

      const lowestYLeader = yFirstLeader - maxRowIdx * yStep
      const minBottomY = lowestYLeader - 0.06
      const { titleObj, topMargin: cdTopMargin } = buildTitleLayout(
        metrics_label,
        instances_label,
        params_label,
        fontScale
      )

      return {
        width: figureWidth,
        height: figureHeight,
        autosize: false,
        title: titleObj,
        font: { family: fontFamily, size: fontScale, color: fgSecondary },
        paper_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        plot_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        xaxis: {
          range: [1 - sidePadUnits, k + sidePadUnits],
          visible: false,
          fixedrange: true,
        },
        yaxis: {
          range: [minBottomY, 0.38],
          visible: false,
          fixedrange: true,
        },
        shapes,
        annotations,
        showlegend: false,
        margin: {
          l: 24,
          r: 24,
          t: cdTopMargin,
          b: 22,
        },
      }
    }

    // ── Specialized Layout 2: Bayesian Simplex (Ternary ROPE) Triangle Plot (Benavoli et al. 2017) ──
    if (isBayesianChart && bayesianResult) {
      const topY = bayesianResult.triangle_y[2] ?? 0.866025
      const labelColor = useLightCanvas ? '#262626' : '#f8fafc'

      const ropeText = `${b('p(rope)', boldAlgorithms)} = ${b(bayesianResult.p_rope.toFixed(3), boldValues)}`
      const leftText = `${b(`p(${bayesianResult.algo_a})`, boldAlgorithms)} = ${b(bayesianResult.p_left.toFixed(3), boldValues)}`
      const rightText = `${b(`p(${bayesianResult.algo_b})`, boldAlgorithms)} = ${b(bayesianResult.p_right.toFixed(3), boldValues)}`

      const showLeftLabel = labelMode === 'all' || labelMode === 'first'
      const showRopeLabel = labelMode === 'all' || labelMode === 'second'
      const showRightLabel = labelMode === 'all' || labelMode === 'third'

      const annotations: Partial<Annotations>[] = []
      if (showRopeLabel) {
        annotations.push({
          x: 0.5,
          y: topY + 0.026,
          text: ropeText,
          showarrow: false,
          xanchor: 'center',
          yanchor: 'bottom',
          font: { family: fontFamily, size: fontScale + 2, color: labelColor },
        })
      }
      if (showLeftLabel) {
        annotations.push({
          x: 0.0,
          y: -0.032,
          text: leftText,
          showarrow: false,
          xanchor: 'center',
          yanchor: 'top',
          font: { family: fontFamily, size: fontScale + 2, color: labelColor },
        })
      }
      if (showRightLabel) {
        annotations.push({
          x: 1.0,
          y: -0.032,
          text: rightText,
          showarrow: false,
          xanchor: 'center',
          yanchor: 'top',
          font: { family: fontFamily, size: fontScale + 2, color: labelColor },
        })
      }

      const { titleObj, topMargin: bayesTopMargin } = buildTitleLayout(
        bayesianResult.metrics_label,
        bayesianResult.instances_label,
        bayesianResult.params_label,
        fontScale
      )

      const bayesBottomMargin = 24
      const plotW = Math.max(200, figureWidth - 48)
      const plotH = Math.max(200, figureHeight - bayesTopMargin - bayesBottomMargin)
      const yMax = topY + 0.095
      const baseSpanY = yMax - -0.095
      const minSpanX = Math.max(1.32, 1.14 + fontScale * 0.014)
      let spanY = baseSpanY
      let spanX = spanY * (plotW / plotH)
      if (spanX < minSpanX) {
        spanX = minSpanX
        spanY = spanX * (plotH / plotW)
      }

      return {
        width: figureWidth,
        height: figureHeight,
        autosize: false,
        title: titleObj,
        font: { family: fontFamily, size: fontScale, color: labelColor },
        paper_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        plot_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        xaxis: {
          range: [0.5 - spanX / 2, 0.5 + spanX / 2],
          visible: false,
          fixedrange: true,
        },
        yaxis: {
          range: [yMax - spanY, yMax],
          visible: false,
          fixedrange: true,
        },
        annotations,
        showlegend: false,
        margin: {
          l: 24,
          r: 24,
          t: bayesTopMargin,
          b: bayesBottomMargin,
        },
      }
    }

    // ── Specialized Layout 3: Bayesian Plackett-Luce Dual-Panel Ranking (Calvo et al. 2018) ──
    if (graphType === 'plackett-luce' && plackettLuceResult) {
      const { titleObj, topMargin: plTopMargin } = buildTitleLayout(
        `Metric: ${plackettLuceResult.metric}`,
        `Bayesian Plackett-Luce Ranking (k=${plackettLuceResult.k}, N=${plackettLuceResult.n_blocks} blocks)`,
        `MCMC/Bootstrap Samples = ${plackettLuceResult.num_samples}`,
        fontScale
      )
      return {
        width: figureWidth,
        height: figureHeight,
        autosize: false,
        title: titleObj,
        font: { family: fontFamily, size: fontScale, color: fgSecondary },
        paper_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        plot_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        yaxis: {
          autorange: 'reversed',
          tickfont: { family: fontFamily, size: fontScale, color: fgPrimary },
          automargin: true,
        },
        xaxis: {
          domain: [0, 0.44],
          title: { text: b('Posterior P(Best)', boldAxes), font: { size: fontScale, color: fgPrimary } },
          range: [0, 1.15],
          tickformat: '.0%',
          gridcolor: gridColor,
        },
        xaxis2: {
          domain: [0.54, 1.0],
          title: {
            text: b('Expected Rank (95% CrI, lower = better)', boldAxes),
            font: { size: fontScale, color: fgPrimary },
          },
          range: [0.7, plackettLuceResult.k + 0.4],
          gridcolor: gridColor,
        },
        showlegend: false,
        margin: { l: 115, r: 28, t: plTopMargin, b: 64 },
      }
    }

    // ── Specialized Layout 4: Standardized Effect-Size Forest Plot (95% CI) ──
    if (graphType === 'effect-size-forest' && forestData) {
      const metricTitles: Record<ForestMetricType, string> = {
        hedges_g: "Hedges' g (95% Noncentral-t CI)",
        cohens_d: "Cohen's d (95% Noncentral-t CI)",
        a12: 'Vargha-Delaney A₁₂ (95% Logit CI)',
        cliffs_delta: "Cliff's δ (95% Logit CI)",
      }
      const nullVal = forestMetric === 'a12' ? 0.5 : 0.0
      const { titleObj, topMargin: forestTop } = buildTitleLayout(
        `Effect-Size Forest: ${forestData.metric}`,
        forestData.instance
          ? `Instance: ${forestData.instance} vs ${forestData.reference_algorithm}`
          : `All Instances vs ${forestData.reference_algorithm}`,
        `${metricTitles[forestMetric]} • α = ${forestData.alpha}`,
        fontScale
      )
      return {
        width: figureWidth,
        height: figureHeight,
        autosize: false,
        title: titleObj,
        font: { family: fontFamily, size: fontScale, color: fgSecondary },
        paper_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        plot_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        xaxis: {
          title: { text: b(metricTitles[forestMetric], boldAxes), font: { size: fontScale, color: fgPrimary } },
          gridcolor: gridColor,
          zeroline: false,
          ...(forestMetric === 'a12' ? { range: [0, 1] } : {}),
        },
        yaxis: {
          autorange: 'reversed',
          tickfont: { family: fontFamily, size: fontScale, color: fgPrimary },
          automargin: true,
        },
        shapes: [
          {
            type: 'line',
            x0: nullVal,
            x1: nullVal,
            y0: -0.5,
            y1: Math.max(0.5, forestData.items.length - 0.5),
            line: { color: '#ef4444', width: 1.8, dash: 'dash' },
          },
        ],
        showlegend: false,
        margin: { l: 120, r: 32, t: forestTop, b: 64 },
      }
    }

    // ── Specialized Layout 5: Bayesian Correlated t-Test Posterior Density ──
    if (graphType === 'bayesian-correlated-t' && corrTData) {
      const { titleObj, topMargin: ctTop } = buildTitleLayout(
        `Bayesian Correlated t-Test: ${corrTData.algo_a} vs ${corrTData.algo_b}`,
        `Metric: ${singleMetric} (n=${corrTData.n_observations}, ρ=${corrTData.rho.toFixed(3)})`,
        `ROPE = [${corrTData.rope_low}, ${corrTData.rope_high}] • Mean Δ = ${corrTData.mean_diff.toFixed(4)}`,
        fontScale
      )
      const maxY = Math.max(...corrTData.curve_y, 0.1)
      return {
        width: figureWidth,
        height: figureHeight,
        autosize: false,
        title: titleObj,
        font: { family: fontFamily, size: fontScale, color: fgSecondary },
        paper_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        plot_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        xaxis: {
          title: {
            text: b(`Mean Difference (${corrTData.algo_a} − ${corrTData.algo_b})`, boldAxes),
            font: { size: fontScale, color: fgPrimary },
          },
          gridcolor: gridColor,
        },
        yaxis: {
          title: { text: b('Posterior Density', boldAxes), font: { size: fontScale, color: fgPrimary } },
          gridcolor: gridColor,
          rangemode: 'tozero',
        },
        shapes: [
          {
            type: 'line',
            x0: corrTData.rope_low,
            x1: corrTData.rope_low,
            y0: 0,
            y1: maxY * 1.05,
            line: { color: '#d97706', width: 1.8, dash: 'dash' },
          },
          {
            type: 'line',
            x0: corrTData.rope_high,
            x1: corrTData.rope_high,
            y0: 0,
            y1: maxY * 1.05,
            line: { color: '#d97706', width: 1.8, dash: 'dash' },
          },
        ],
        legend: {
          orientation: 'h',
          x: 0.5,
          xanchor: 'center',
          y: -0.22,
          yanchor: 'top',
          font: { family: fontFamily, size: Math.max(10, fontScale - 1), color: fgPrimary },
        },
        showlegend: true,
        margin: { l: 70, r: 32, t: ctTop, b: 96 },
      }
    }

    // ── Specialized Layout 6: ECDF Cumulative Step Distribution ──
    if (graphType === 'ecdf') {
      const { titleObj, topMargin: ecdfTop } = buildTitleLayout(
        `Empirical CDF (ECDF): ${singleMetric}`,
        `Instance: ${activeInstance}`,
        `α = ${alpha}`,
        fontScale
      )
      return {
        width: figureWidth,
        height: figureHeight,
        autosize: false,
        barmode: 'overlay',
        title: titleObj,
        font: { family: fontFamily, size: fontScale, color: fgSecondary },
        paper_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        plot_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
        xaxis: {
          title: { text: b(`${singleMetric} Value`, boldAxes), font: { size: fontScale, color: fgPrimary } },
          gridcolor: gridColor,
        },
        yaxis: {
          title: { text: b('Cumulative Probability F(x)', boldAxes), font: { size: fontScale, color: fgPrimary } },
          range: [0, 1.04],
          tickformat: '.0%',
          gridcolor: gridColor,
        },
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.03, yanchor: 'bottom' },
        showlegend: legendPlacement !== 'none',
        margin: { l: 74, r: 32, t: ecdfTop + 26, b: 64 },
      }
    }

    // ── Standard Layout (Boxplot, Violin & Mean±SD Barplot) ──
    const maxAlgoLen = algorithms.reduce((max, a) => Math.max(max, a.length), 0)
    const computedTickAngle: number | undefined =
      xTickAngle !== 'auto'
        ? Number(xTickAngle)
        : maxAlgoLen > 10 || (algorithms.length >= 5 && figureWidth < 720)
          ? -30
          : 0

    // Extra bottom clearance when X labels are rotated so they never collide with the X-axis title or bottom legend
    const angleExtraBottom =
      computedTickAngle && Math.abs(computedTickAngle) >= 45
        ? Math.min(75, Math.round(maxAlgoLen * 4.2))
        : computedTickAngle && Math.abs(computedTickAngle) >= 25
          ? Math.min(48, Math.round(maxAlgoLen * 2.8))
          : 0

    const xTitleStandoff = 16 + Math.round(angleExtraBottom * 0.45)

    const stdTitle = buildTitleLayout(
      hasRightMetric ? `Metrics: ${singleMetric} vs ${rightMetric}` : `Metric: ${singleMetric}`,
      `Instance: ${activeInstance}`,
      `α = ${alpha}`,
      fontScale + 1
    )

    // Configure non-overlapping Legend Placement
    const showLegend = legendPlacement !== 'none'
    let legendConfig: Partial<Layout['legend']> = {}
    const topMargin = !stdTitle.hasTitle
      ? legendPlacement === 'top'
        ? Math.round(44 + fontScale * 1.2)
        : 28
      : legendPlacement === 'top'
        ? stdTitle.topMargin + Math.round(22 + fontScale * 1.1)
        : stdTitle.topMargin + 8
    let bottomMargin = Math.max(64, Math.round(42 + fontScale * 1.8)) + angleExtraBottom

    const showXAxisTitle = labelMode === 'all' || labelMode === 'first'
    const showYAxisTitle = labelMode === 'all' || labelMode === 'second'
    const showXTickLabels = labelMode !== 'none' && labelMode !== 'second'
    const showYTickLabels = labelMode !== 'none' && labelMode !== 'first'

    const baseSideMargin =
      showYAxisTitle || showYTickLabels ? Math.max(74, Math.round(46 + fontScale * 2.2)) : 36
    let rightMargin = hasRightMetric ? baseSideMargin : 32

    if (legendPlacement === 'top') {
      legendConfig = {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: 1.03,
        yanchor: 'bottom',
        font: { family: fontFamily, size: fontScale - 1, color: fgPrimary },
        bgcolor: 'transparent',
      }
    } else if (legendPlacement === 'bottom') {
      const legendItemsCount = hasRightMetric ? 2 : 1
      const legendRows = Math.max(
        1,
        Math.ceil((legendItemsCount * 130) / Math.max(300, figureWidth - 100))
      )
      bottomMargin = 98 + angleExtraBottom + (legendRows - 1) * 22
      const plotAreaHeight = Math.max(180, figureHeight - topMargin - bottomMargin)
      const clearancePx = 48 + angleExtraBottom
      const yOffset = -(clearancePx / plotAreaHeight)

      legendConfig = {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: yOffset,
        yanchor: 'top',
        font: { family: fontFamily, size: fontScale - 1, color: fgPrimary },
        bgcolor: 'transparent',
      }
    } else if (legendPlacement === 'right') {
      const maxLegendLabelLen = Math.max(
        singleMetric.length + (hasRightMetric ? 7 : 0),
        hasRightMetric ? rightMetric.length + 8 : 0
      )
      const legendBoxWidth = Math.min(185, Math.max(115, maxLegendLabelLen * 7 + 36))
      rightMargin = hasRightMetric ? baseSideMargin + legendBoxWidth : legendBoxWidth
      legendConfig = {
        orientation: 'v',
        x: hasRightMetric ? 1.15 : 1.03,
        xanchor: 'left',
        y: 1,
        yanchor: 'top',
        font: { family: fontFamily, size: fontScale - 1, color: fgPrimary },
        bgcolor: 'transparent',
      }
    } else if (legendPlacement === 'inside') {
      legendConfig = {
        orientation: 'v',
        x: 0.98,
        xanchor: 'right',
        y: 0.97,
        yanchor: 'top',
        font: { family: fontFamily, size: fontScale - 1, color: fgPrimary },
        bgcolor: useLightCanvas ? 'rgba(255, 255, 255, 0.88)' : 'rgba(15, 23, 42, 0.88)',
        bordercolor: borderColor,
        borderwidth: 1,
      }
    }

    const leftAxisTitleText = hasRightMetric
      ? `<span style="color:${leftMetricColor}">●</span> ${b(`${singleMetric} Value`, boldAxes)}`
      : b(`${singleMetric} Value`, boldAxes)

    const rightAxisTitleText = `<span style="color:${rightMetricColor}">●</span> ${b(`${rightMetric} Value`, boldAxes)}`

    return {
      width: figureWidth,
      height: figureHeight,
      autosize: false,
      title: stdTitle.titleObj,
      boxmode: 'overlay',
      violinmode: 'overlay',
      font: {
        family: fontFamily,
        size: fontScale,
        color: fgSecondary,
      },
      paper_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
      plot_bgcolor: useLightCanvas ? '#ffffff' : 'rgba(30, 41, 59, 0.7)',
      xaxis: {
        type: 'category',
        categoryorder: 'array',
        categoryarray: algorithms,
        title: showXAxisTitle
          ? {
              text: b('Algorithm', boldAxes),
              font: { family: fontFamily, size: fontScale, color: fgPrimary },
              standoff: xTitleStandoff,
            }
          : undefined,
        showticklabels: showXTickLabels,
        tickmode: 'array',
        tickvals: algorithms,
        ticktext: algorithms.map((a) => b(a, boldAlgorithms)),
        tickangle: computedTickAngle,
        gridcolor: gridColor,
        zerolinecolor: borderColor,
        linecolor: borderColor,
        linewidth: 1,
        mirror: true,
        ticks: showXTickLabels ? 'outside' : '',
        ticklen: 4,
        tickcolor: borderColor,
        tickfont: { family: fontFamily, color: fgSecondary, size: Math.max(9, fontScale - 1) },
        automargin: true,
      },
      yaxis: {
        title: showYAxisTitle
          ? {
              text: leftAxisTitleText,
              font: { family: fontFamily, size: fontScale, color: fgPrimary },
              standoff: 12,
            }
          : undefined,
        showticklabels: showYTickLabels,
        gridcolor: gridColor,
        zerolinecolor: borderColor,
        linecolor: borderColor,
        linewidth: 1,
        mirror: !hasRightMetric,
        ticks: showYTickLabels ? 'outside' : '',
        ticklen: 4,
        tickcolor: borderColor,
        tickfont: { family: fontFamily, color: fgSecondary, size: Math.max(9, fontScale - 1) },
        automargin: true,
      },
      ...(hasRightMetric
        ? {
            yaxis2: {
              title: showYAxisTitle
                ? {
                    text: rightAxisTitleText,
                    font: { family: fontFamily, size: fontScale, color: fgPrimary },
                    standoff: 12,
                  }
                : undefined,
              overlaying: 'y',
              side: 'right',
              showticklabels: showYTickLabels,
              showgrid: false,
              zeroline: false,
              showline: true,
              linecolor: borderColor,
              linewidth: 1,
              ticks: showYTickLabels ? 'outside' : '',
              ticklen: 4,
              tickcolor: borderColor,
              tickfont: {
                family: fontFamily,
                color: fgSecondary,
                size: Math.max(9, fontScale - 1),
              },
              automargin: true,
            },
          }
        : {}),
      showlegend: showLegend,
      legend: legendConfig,
      margin: {
        l: baseSideMargin,
        r: rightMargin,
        t: topMargin,
        b: showXAxisTitle || showXTickLabels ? bottomMargin : 36,
      },
    }
  }, [
    activeInstance,
    singleMetric,
    rightMetric,
    hasRightMetric,
    leftMetricColor,
    rightMetricColor,
    graphType,
    isBayesianChart,
    algorithms,
    fontScale,
    fontFamily,
    boldMode,
    titleMode,
    labelMode,
    alpha,
    useLightCanvas,
    figureWidth,
    figureHeight,
    legendPlacement,
    xTickAngle,
    cdResult,
    bayesianResult,
    plackettLuceResult,
    forestData,
    forestMetric,
    corrTData,
    activePalette,
  ])

  // Export handlers — exports with the EXACT figureWidth & figureHeight configured on screen
  const handleExportFigure = async (format: 'png' | 'svg' | 'pdf') => {
    const el = chartRef.current
    if (!el) return
    setIsExporting(true)

    try {
      const ratioTag = activePreset ? activePreset.id : `${figureWidth}x${figureHeight}`
      const metricTag = hasRightMetric ? `${singleMetric}_vs_${rightMetric}` : activeMetric
      const filename = `saes_${activeInstance}_${metricTag}_${graphType}_${ratioTag}`

      const opts = {
        format: format === 'pdf' ? 'png' : format,
        filename,
        width: figureWidth,
        height: figureHeight,
        scale: format === 'png' || format === 'pdf' ? 3 : 1, // 300 DPI equivalent at exact aspect ratio
      } as unknown as Parameters<typeof Plotly.downloadImage>[1]
      await Plotly.downloadImage(el, opts)
    } catch (err) {
      console.error('Figure export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // Approximate physical dimensions in mm (assuming 96px = 1 inch = 25.4mm for layout reference)
  const mmWidth = Math.round((figureWidth / 800) * 140)
  const mmHeight = Math.round((figureHeight / 800) * 140)
  const aspectDecimal = (figureWidth / figureHeight).toFixed(2)

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-card/30">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No Benchmark Data Loaded</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Upload a CSV benchmark dataset in the <strong>Data & Validation</strong> tab to visualize
          algorithmic distributions, Critical Distance (CD) diagrams, and Bayesian posterior ranks.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart Control Toolbar */}
      <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3.5">
        {/* Row 1: Header (Title) + Smart 2-Row Chart Grid */}
        <div className="space-y-2.5 border-b border-border/50 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground tracking-tight flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-primary" />
              Visualization Type
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              • Select chart format to render
            </span>
          </div>

          {/* Smart 2-Row Grid for all 10 Chart Types (5 per row on desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border/40">
            {CHART_TYPE_OPTIONS.map((opt) => {
              const isSelected = graphType === opt.id
              const OptIcon = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGraphType(opt.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer min-w-0 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/70'
                  }`}
                  title={opt.title}
                >
                  <OptIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 2: Dataset Context, Color Palette & Typography */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-border/50 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Selector for Ranking Charts (All Instances vs Single Instance) */}
            {isRankingChart && instances.length > 1 && (
              <SelectDropdown
                icon={<Layers className="w-3.5 h-3.5" />}
                label="Scope:"
                value={rankingScope}
                options={[
                  {
                    value: 'all-instances',
                    label: `All Instances (${instances.length})`,
                  },
                  {
                    value: 'single-instance',
                    label: 'Single Instance (Runs)',
                  },
                ]}
                onChange={(val) => setRankingScope(val as RankingScope)}
              />
            )}

            {/* Instance Picker (Always visible for Box/Violin, or when Single Instance scope is selected) */}
            {(!isRankingChart || rankingScope === 'single-instance' || instances.length <= 1) && (
              <SelectDropdown
                label="Instance:"
                value={activeInstance}
                options={instances.map((inst) => ({ value: inst, label: inst }))}
                onChange={setSelectedInstance}
                triggerClassName="font-mono font-semibold"
              />
            )}

            {/* Palette Picker */}
            {!isBayesianChart && (
              <PaletteSelector selectedId={selectedPaletteId} onSelect={setSelectedPaletteId} />
            )}

            {/* Metric Picker (Supports 'All Metrics' for CD and Bayesian plots, and Left/Right Dual Metrics for Box/Violin) */}
            <SelectDropdown
              label={hasRightMetric ? 'Left Metric:' : 'Metric:'}
              value={activeMetric}
              options={[
                ...(isRankingChart && metrics.length > 1
                  ? [{ value: 'all-metrics', label: `All Metrics (${metrics.length})` }]
                  : []),
                ...metrics.map((met) => ({ value: met, label: met })),
              ]}
              onChange={(val) => {
                if (isDistributionChart && rightMetric !== 'none' && val === rightMetric) {
                  setSelectedRightMetric(singleMetric)
                }
                setSelectedMetric(val)
              }}
              triggerClassName="font-mono font-semibold text-primary"
            />

            {/* Single Color Picker for Left / Primary Metric on Boxplot & Violin */}
            {isDistributionChart && (
              <PaletteColorPicker
                label={hasRightMetric ? 'Left Color:' : 'Color:'}
                colors={activePalette}
                selectedIndex={activeLeftColorIdx}
                onSelectIndex={setLeftColorIndex}
              />
            )}

            {/* Optional Right Axis Metric & Color Picker for Boxplot & Violin */}
            {isDistributionChart && (
              <>
                <SelectDropdown
                  label="Right Metric:"
                  value={rightMetric}
                  options={[
                    { value: 'none', label: 'None (Single Axis)' },
                    ...metrics.map((met) => ({ value: met, label: met })),
                  ]}
                  onChange={(val) => {
                    if (val !== 'none' && val === singleMetric && metrics.length > 1) {
                      const fallback =
                        rightMetric !== 'none' && rightMetric !== val
                          ? rightMetric
                          : metrics.find((m) => m !== val) || singleMetric
                      setSelectedMetric(fallback)
                    }
                    setSelectedRightMetric(val)
                  }}
                  triggerClassName="font-mono font-semibold min-w-[145px]"
                />

                {hasRightMetric && (
                  <PaletteColorPicker
                    label="Right Color:"
                    colors={activePalette}
                    selectedIndex={activeRightColorIdx}
                    onSelectIndex={setRightColorIndex}
                  />
                )}
              </>
            )}

            {/* Pairwise Algorithm & ROPE Selectors for Bayesian Simplex Test */}
            {isBayesianChart && (
              <>
                <SelectDropdown
                  label="Left:"
                  value={bayesianResult?.algo_a || selectedAlgoA || algorithms[0] || ''}
                  options={(bayesianResult?.algorithms?.length
                    ? bayesianResult.algorithms
                    : algorithms
                  ).map((a) => ({ value: a, label: a }))}
                  onChange={(val) => {
                    const currentRight = bayesianResult?.algo_b || selectedAlgoB
                    if (val === currentRight) {
                      setSelectedAlgoB(bayesianResult?.algo_a || selectedAlgoA)
                    }
                    setSelectedAlgoA(val)
                  }}
                  triggerClassName="font-mono font-semibold min-w-[125px]"
                />

                <SelectDropdown
                  label="Right:"
                  value={bayesianResult?.algo_b || selectedAlgoB || algorithms[1] || ''}
                  options={(bayesianResult?.algorithms?.length
                    ? bayesianResult.algorithms
                    : algorithms
                  ).map((a) => ({ value: a, label: a }))}
                  onChange={(val) => {
                    const currentLeft = bayesianResult?.algo_a || selectedAlgoA
                    if (val === currentLeft) {
                      setSelectedAlgoA(bayesianResult?.algo_b || selectedAlgoB)
                    }
                    setSelectedAlgoB(val)
                  }}
                  triggerClassName="font-mono font-semibold min-w-[125px]"
                />

                <SelectDropdown
                  label="ROPE Mode:"
                  value={ropeMode}
                  options={[
                    { value: 'relative', label: 'Relative (%)' },
                    { value: 'absolute', label: 'Absolute (±Δ)' },
                  ]}
                  onChange={(val) => setRopeMode(val as 'relative' | 'absolute')}
                />

                {ropeMode === 'relative' ? (
                  <SelectDropdown
                    label="ROPE:"
                    value={ropePercent}
                    options={[
                      { value: 0.1, label: '±0.1% (Ultra-Strict)' },
                      { value: 0.5, label: '±0.5% (Strict)' },
                      { value: 1.0, label: '±1.0% (Standard)' },
                      { value: 2.0, label: '±2.0% (Moderate)' },
                      { value: 5.0, label: '±5.0% (Wide)' },
                    ]}
                    onChange={(val) => setRopePercent(Number(val))}
                    triggerClassName="min-w-[135px]"
                  />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-medium">±Δ:</span>
                    <input
                      type="number"
                      step="0.005"
                      min="0"
                      value={ropeAbsolute}
                      onChange={(e) => setRopeAbsolute(Math.max(0, Number(e.target.value) || 0))}
                      className="h-8 w-20 rounded-md border border-input bg-background px-2 font-mono text-xs"
                    />
                  </div>
                )}

                <SelectDropdown
                  label="Prior s:"
                  value={priorStrength}
                  options={[
                    { value: 0.5, label: '0.5 (Weak)' },
                    { value: 1.0, label: '1.0 (Standard)' },
                    { value: 2.0, label: '2.0 (Conservative)' },
                  ]}
                  onChange={(val) => setPriorStrength(Number(val))}
                />
              </>
            )}

            {/* Effect-Size Forest Controls */}
            {isForestChart && (
              <>
                <SelectDropdown
                  label="Effect Metric:"
                  value={forestMetric}
                  options={[
                    { value: 'hedges_g', label: "Hedges' g (95% CI)" },
                    { value: 'cohens_d', label: "Cohen's d (95% CI)" },
                    { value: 'a12', label: 'Vargha-Delaney A₁₂' },
                    { value: 'cliffs_delta', label: "Cliff's δ" },
                  ]}
                  onChange={(val) => setForestMetric(val as ForestMetricType)}
                />
                <SelectDropdown
                  label="Baseline:"
                  value={forestReference}
                  options={[
                    { value: '', label: 'Auto (Best)' },
                    ...algorithms.map((a) => ({ value: a, label: a })),
                  ]}
                  onChange={setForestReference}
                  triggerClassName="font-mono"
                />
                {instances.length > 1 && (
                  <SelectDropdown
                    label="Scope:"
                    value={forestScope}
                    options={[
                      { value: 'single-instance', label: 'Single Instance' },
                      { value: 'all-instances', label: 'All Instances' },
                    ]}
                    onChange={(val) => setForestScope(val as RankingScope)}
                  />
                )}
                <Button
                  type="button"
                  variant={forestPaired ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setForestPaired((p) => !p)}
                  className="h-8 text-xs"
                >
                  {forestPaired ? 'Paired' : 'Independent'}
                </Button>
              </>
            )}

            {/* Bayesian Correlated t-Test Controls */}
            {isCorrTChart && (
              <>
                <SelectDropdown
                  label="Algo A:"
                  value={selectedAlgoA || algorithms[0] || ''}
                  options={algorithms.map((a) => ({ value: a, label: a }))}
                  onChange={setSelectedAlgoA}
                  triggerClassName="font-mono font-semibold"
                />
                <SelectDropdown
                  label="Algo B:"
                  value={selectedAlgoB || algorithms[1] || ''}
                  options={algorithms.map((a) => ({ value: a, label: a }))}
                  onChange={setSelectedAlgoB}
                  triggerClassName="font-mono font-semibold"
                />
                <SelectDropdown
                  label="CV Corr ρ:"
                  value={corrTRho}
                  options={[
                    { value: 'auto', label: 'Auto (1/(n-1))' },
                    { value: '0', label: '0.00 (Independent)' },
                    { value: '0.111111', label: '1/9 (10-Fold CV)' },
                    { value: '0.25', label: '1/4 (5-Fold CV)' },
                    { value: '0.5', label: '1/2 (2-Fold CV)' },
                  ]}
                  onChange={setCorrTRho}
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">ROPE ±:</span>
                  <input
                    type="number"
                    step="0.005"
                    min="0"
                    value={corrTRope}
                    onChange={(e) => setCorrTRope(Math.max(0, Number(e.target.value) || 0))}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 font-mono text-xs"
                  />
                </div>
                {instances.length > 1 && (
                  <SelectDropdown
                    label="Scope:"
                    value={corrTScope}
                    options={[
                      { value: 'single-instance', label: 'Single Instance (Folds/Runs)' },
                      { value: 'all-instances', label: 'All Instances (Means)' },
                    ]}
                    onChange={(val) => setCorrTScope(val as RankingScope)}
                  />
                )}
              </>
            )}

            {/* Toggle Observations Overlay on Boxplot / Violin */}
            {(graphType === 'boxplot' || graphType === 'violin') && (
              <Button
                type="button"
                variant={showOverlayPoints ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowOverlayPoints((prev) => !prev)}
                className="h-8 px-2.5 text-xs gap-1.5"
                title="Show or hide individual run points centered on the same X axis"
              >
                <CircleDot className="w-3.5 h-3.5 text-primary" />
                {showOverlayPoints ? 'Points: Centered' : 'Points: Outliers Only'}
              </Button>
            )}

            {/* Legend Placement Selector */}
            {!isRankingChart && (
              <SelectDropdown
                icon={<ListFilter className="w-3.5 h-3.5" />}
                label="Legend:"
                value={legendPlacement}
                options={LEGEND_PLACEMENTS}
                onChange={(val) => setLegendPlacement(val as LegendPlacement)}
              />
            )}

            {/* X-Axis Labels Angle Selector */}
            {!isRankingChart && (
              <SelectDropdown
                label="X Labels:"
                value={xTickAngle}
                options={X_TICK_ANGLES}
                onChange={setXTickAngle}
              />
            )}

            <SelectDropdown
              label="Size:"
              value={fontScale}
              options={[10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32].map((s) => ({
                value: s,
                label: `${s}pt`,
              }))}
              onChange={(val) => setFontScale(Number(val))}
              align="right"
            />
          </div>

          {/* Title, Labels, Bold & Font Family Selectors */}
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <SelectDropdown
              label="Title:"
              value={titleMode}
              options={TITLE_OPTIONS}
              onChange={(val) => setTitleMode(val as TitleMode)}
              align="right"
            />

            <SelectDropdown
              label="Labels:"
              value={labelMode}
              options={
                isBayesianChart
                  ? [
                      { value: 'all', label: 'All (Left, ROPE & Right)' },
                      {
                        value: 'first',
                        label: `Only Left — p(${bayesianResult?.algo_a || selectedAlgoA || 'A'})`,
                      },
                      { value: 'second', label: 'Only Top — p(rope)' },
                      {
                        value: 'third',
                        label: `Only Right — p(${bayesianResult?.algo_b || selectedAlgoB || 'B'})`,
                      },
                      { value: 'none', label: 'None (No Labels)' },
                    ]
                  : graphType === 'critical-distance'
                    ? [
                        { value: 'all', label: 'All (Algorithms, CD & Better)' },
                        { value: 'first', label: 'Only Algorithm Ranks' },
                        { value: 'second', label: 'Only CD Bar Label' },
                        { value: 'third', label: 'Only Direction (← Better)' },
                        { value: 'none', label: 'None (No Labels)' },
                      ]
                    : [
                        { value: 'all', label: 'All (X & Y Labels)' },
                        { value: 'first', label: 'Only X-Axis Label (Algorithms)' },
                        {
                          value: 'second',
                          label: `Only Y-Axis Label (${
                            hasRightMetric
                              ? `${singleMetric} / ${rightMetric}`
                              : singleMetric || 'Metric'
                          })`,
                        },
                        { value: 'third', label: 'Only Tick Values (No Axis Titles)' },
                        { value: 'none', label: 'None (No Labels)' },
                      ]
              }
              onChange={(val) => setLabelMode(val as LabelMode)}
              align="right"
            />

            <SelectDropdown
              label="Bold:"
              value={boldMode}
              options={BOLD_OPTIONS}
              onChange={(val) => setBoldMode(val as BoldMode)}
              align="right"
            />

            <SelectDropdown
              icon={<Type className="w-3.5 h-3.5" />}
              label="Font:"
              value={fontFamily}
              options={FONT_FAMILIES}
              onChange={setFontFamily}
              align="right"
            />
          </div>
        </div>

        {/* Row 3: Scientific Paper Proportion & Aspect Ratio Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-0.5">
          {/* Paper Format Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-muted-foreground mr-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Paper Format:
            </span>
            <div className="flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-lg">
              {PAPER_PRESETS.map((preset) => {
                const Icon = preset.icon
                const isSelected = presetId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    title={`${preset.label} — ${preset.description} (${preset.width}×${preset.height}px)`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {preset.shortLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fine-grained Width x Height Sliders & Paper White Toggle */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Width:</span>
              <input
                type="range"
                min={420}
                max={1200}
                step={10}
                value={figureWidth}
                onChange={(e) => {
                  setPresetId('custom')
                  setFigureWidth(Number(e.target.value))
                }}
                style={
                  {
                    '--zoom-percent': `${((figureWidth - 420) / (1200 - 420)) * 100}%`,
                  } as React.CSSProperties
                }
                className="zoom-slider w-24"
                title={`Figure Width: ${figureWidth}px`}
              />
              <span className="font-mono font-semibold text-foreground w-12 text-right">
                {figureWidth}px
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Height:</span>
              <input
                type="range"
                min={320}
                max={850}
                step={10}
                value={figureHeight}
                onChange={(e) => {
                  setPresetId('custom')
                  setFigureHeight(Number(e.target.value))
                }}
                style={
                  {
                    '--zoom-percent': `${((figureHeight - 320) / (850 - 320)) * 100}%`,
                  } as React.CSSProperties
                }
                className="zoom-slider w-24"
                title={`Figure Height: ${figureHeight}px`}
              />
              <span className="font-mono font-semibold text-foreground w-12 text-right">
                {figureHeight}px
              </span>
            </div>

            {presetId === 'custom' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleSelectPreset(PAPER_PRESETS[1])}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                title="Reset to Scientific Golden Ratio"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            )}

            {isDark && (
              <Button
                type="button"
                variant={paperWhiteBg ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setPaperWhiteBg((prev) => !prev)}
                className="h-7 px-2.5 text-xs"
                title="Keep figure background white for paper publication even in dark mode"
              >
                {paperWhiteBg ? 'Canvas: Paper White' : 'Canvas: Dark Theme'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Backend Dataset-Aware Suitability & Warnings Banners */}
      {contextDiag?.can_run_cell_tests === false && isCellPlot && (
        <div className="px-4 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Single-Run Dataset (n = 1 per cell):</strong> Distribution plots (Boxplot /
            Violin / ECDF) have only 1 point per algorithm–instance cell. Consider switching to{' '}
            <strong>Critical Distance</strong>, <strong>Plackett-Luce</strong>, or{' '}
            <strong>Bayesian Sign/Signed-Rank</strong> across instances.
          </span>
        </div>
      )}

      {(() => {
        const activeWarnings = [
          ...(graphType === 'critical-distance' ? cdResult?.warnings || [] : []),
          ...(isBayesianChart ? bayesianResult?.warnings || [] : []),
          ...(isForestChart ? forestData?.warnings || [] : []),
        ]
        if (activeWarnings.length === 0) return null
        return (
          <div className="px-4 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs space-y-1">
            {activeWarnings.map((w, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Statistical Summary Strip for Plackett-Luce / Forest / Bayesian Correlated t */}
      {graphType === 'plackett-luce' && plackettLuceResult && plackettLuceResult.items[0] && (
        <div className="px-4 py-2.5 rounded-lg border border-border/70 bg-card/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              <strong className="text-foreground">Model (SAES Backend):</strong> Bayesian
              Plackett-Luce (Calvo et al. 2018)
            </span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              Top: {plackettLuceResult.items[0].algorithm} — P(Best) ={' '}
              {(plackettLuceResult.items[0].prob_best * 100).toFixed(1)}%
            </span>
            <span className="font-mono text-muted-foreground">
              E[Rank] = {plackettLuceResult.items[0].expected_rank.toFixed(2)} [
              {plackettLuceResult.items[0].rank_ci_lower.toFixed(2)},{' '}
              {plackettLuceResult.items[0].rank_ci_upper.toFixed(2)}]
            </span>
          </div>
          <span className="text-muted-foreground">
            Jointly models all k={plackettLuceResult.k} algorithms across N=
            {plackettLuceResult.n_blocks} blocks; P(Best) sums strictly to 100%.
          </span>
        </div>
      )}

      {isForestChart && forestData && (
        <div className="px-4 py-2.5 rounded-lg border border-border/70 bg-card/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              <strong className="text-foreground">Baseline Reference:</strong>{' '}
              <span className="font-mono font-bold text-primary">
                {forestData.reference_algorithm}
              </span>
            </span>
            <span>
              <strong className="text-foreground">Significant Pairs (Holm):</strong>{' '}
              <span className="font-mono font-semibold">
                {forestData.items.filter((i) => i.is_significant).length} /{' '}
                {forestData.items.length}
              </span>
            </span>
          </div>
          <span className="text-muted-foreground">
            Emerald = significantly better than baseline • Rose = significantly worse • Slate = NS
            (95% exact CIs).
          </span>
        </div>
      )}

      {isCorrTChart && corrTData && (
        <div className="px-4 py-2.5 rounded-lg border border-border/70 bg-card/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 font-mono">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              P({corrTData.algo_a} &gt; {corrTData.algo_b}) = {(corrTData.p_left * 100).toFixed(1)}%
            </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              P(ROPE) = {(corrTData.p_rope * 100).toFixed(1)}%
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              P({corrTData.algo_b} &gt; {corrTData.algo_a}) = {(corrTData.p_right * 100).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">
              ρ = {corrTData.rho.toFixed(3)} • df = {corrTData.degrees_of_freedom}
            </span>
          </div>
          <span className="text-muted-foreground">{corrTData.interpretation}</span>
        </div>
      )}

      {/* Statistical Summary Strip for Critical Distance / Bayesian Rank Tests */}
      {graphType === 'critical-distance' && cdResult && (
        <div className="px-4 py-2.5 rounded-lg border border-border/70 bg-card/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              <strong className="text-foreground">Test (SAES Backend):</strong> Friedman + Nemenyi
              Post-hoc (Demšar 2006)
            </span>
            <span>
              <strong className="text-foreground">Critical Distance (CD):</strong>{' '}
              <span className="font-mono font-bold text-rose-500">{cdResult.cd.toFixed(3)}</span> (α
              = {alpha})
            </span>
            <span>
              <strong className="text-foreground">Friedman χ²:</strong>{' '}
              <span className="font-mono">
                {cdResult.friedman_stat.toFixed(2)} (p ={' '}
                {cdResult.friedman_p_value < 0.0001
                  ? cdResult.friedman_p_value.toExponential(2)
                  : cdResult.friedman_p_value.toFixed(4)}
                )
              </span>{' '}
              • Iman-Davenport F ={' '}
              <span className="font-mono">{cdResult.iman_davenport_f.toFixed(2)}</span>
            </span>
          </div>
          <span className="text-muted-foreground">
            Thick horizontal bars connect algorithms with no statistically significant difference
            (|ΔRank| ≤ CD).
          </span>
        </div>
      )}

      {isBayesianChart && bayesianResult && (
        <div className="px-4 py-2.5 rounded-lg border border-border/70 bg-card/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              <strong className="text-foreground">Test (SAES API):</strong>{' '}
              {graphType === 'bayesian-sign'
                ? 'Bayesian Sign Test Simplex (Benavoli et al. 2017)'
                : 'Bayesian Signed-Rank Simplex (Benavoli et al. 2017)'}
            </span>
            <span className="font-mono font-semibold text-foreground">
              {bayesianResult.label_left}
            </span>
            <span className="font-mono font-semibold text-amber-500">
              {bayesianResult.label_rope}
            </span>
            <span className="font-mono font-semibold text-primary">
              {bayesianResult.label_right}
            </span>
            <span>
              <strong className="text-foreground">ROPE:</strong>{' '}
              <span className="font-mono">±{bayesianResult.rope_percent}%</span>
            </span>
          </div>
          <span className="text-muted-foreground">
            {graphType === 'bayesian-sign'
              ? `Dirichlet sign-count simplex posterior (${bayesianResult.points_x.length} samples across ${bayesianResult.n_blocks} blocks).`
              : `Dirichlet Process signed-rank simplex posterior (${bayesianResult.points_x.length} samples across ${bayesianResult.n_blocks} blocks).`}
          </span>
        </div>
      )}

      {/* WYSIWYG Scientific Paper Figure Stage */}
      <div className="rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-6 shadow-inner overflow-x-auto">
        {/* Stage Header: Figure Info & Export Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground font-mono text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            <span className="font-semibold text-foreground">
              {activePreset ? activePreset.label : 'Custom Proportion'}
            </span>
            <span>•</span>
            <span>{activePreset ? activePreset.ratioLabel : `Ratio ${aspectDecimal}:1`}</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">
              Canvas: {figureWidth} × {figureHeight} px (~{mmWidth} × {mmHeight} mm) • 300 DPI
            </span>
          </div>

          <ExportToolbar onExport={handleExportFigure} isExporting={isExporting} />
        </div>

        {/* Centered Paper Sheet Preview */}
        <div className="flex justify-center items-center min-h-[380px] py-2">
          {(isRankingChart && isLoadingRanking && !rankingData) ||
          (isForestChart && isLoadingForest && !forestData) ||
          (isCorrTChart && isLoadingCorrT && !corrTData) ? (
            <div className="flex flex-col items-center justify-center h-80 gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Computing statistical model in SAES backend...</span>
            </div>
          ) : (isRankingChart && rankingError) ||
            (isForestChart && forestError) ||
            (isCorrTChart && corrTError) ? (
            <div className="flex flex-col items-center justify-center h-80 gap-2 text-rose-500 text-xs max-w-md text-center">
              <span>{rankingError || forestError || corrTError}</span>
            </div>
          ) : isBackendComputedChart || filteredRecords.length > 0 || rightFilteredRecords.length > 0 ? (
            <div
              className="rounded-md border border-border/80 shadow-md transition-all duration-150 overflow-hidden shrink-0"
              style={{
                width: `${figureWidth}px`,
                height: `${figureHeight}px`,
                backgroundColor: useLightCanvas ? '#ffffff' : '#0f172a',
              }}
            >
              <PlotlyChart
                data={plotData}
                layout={plotLayout}
                onPlotlyRef={(div) => {
                  chartRef.current = div
                }}
                style={{ width: `${figureWidth}px`, height: `${figureHeight}px` }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-80 text-muted-foreground text-xs">
              No data available for {activeInstance || 'selected instance'} [
              {activeMetric || 'selected metric'}].
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
