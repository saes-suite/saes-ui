import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { Data, Layout } from 'plotly.js-dist-min'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Box,
  CheckCircle2,
  Columns2,
  GitCompare,
  Grid3X3,
  Layers,
  ListFilter,
  Loader2,
  MonitorPlay,
  RectangleHorizontal,
  RotateCcw,
  ScatterChart,
  SlidersHorizontal,
  Sparkles,
  Square,
  Table2,
  Target,
  TrendingUp,
  Type,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import {
  EAFDifferenceResult,
  ParetoBoldMode,
  ParetoCollectionSummary,
  ParetoCoverageResponse,
  ParetoInstanceMeta,
  ParetoLabelMode,
  ParetoLegendPlacement,
  ParetoPlotMode,
  ParetoTitleMode,
  PlotExportFormat,
} from '../../api/types'
import { useAppearance } from '../../context/AppearanceContext'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { SelectDropdown } from '../ui/select-dropdown'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { PlotlyChart } from '../charts/PlotlyChart'
import { PaletteSelector } from '../charts/PaletteSelector'
import { ExportToolbar } from '../charts/ExportToolbar'

interface ParetoWorkspaceProps {
  collectionName: string
  apiOnline: boolean
  onBackToHub: () => void
  onDatasetCreated: (filename: string) => Promise<void>
}

type ParetoWorkspaceTab = 'fronts' | 'eaf-diff' | 'coverage' | 'export'
type UITitleChoice = ParetoTitleMode | 'custom'

interface PaperPreset {
  id: string
  label: string
  shortLabel: string
  ratioLabel: string
  description: string
  width: number
  height: number
  icon: React.ComponentType<{ className?: string }>
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
    ratioLabel: '2:1 • Low-profile Conference Figure',
    description: 'Saves vertical space in strict page-limit conferences',
    width: 920,
    height: 440,
    icon: MonitorPlay,
  },
]

const FONT_FAMILIES = [
  { value: 'Inter, -apple-system, sans-serif', label: 'Inter / Sans-Serif (Nature)' },
  { value: 'Times New Roman, Times, serif', label: 'Times / LaTeX Serif' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial / Helvetica (IEEE)' },
  { value: 'Georgia, serif', label: 'Georgia Serif' },
]

const LEGEND_PLACEMENTS: { value: ParetoLegendPlacement; label: string }[] = [
  { value: 'top', label: 'Top (Above Plot)' },
  { value: 'right', label: 'Right (Outside)' },
  { value: 'bottom', label: 'Bottom (Below Axis)' },
  { value: 'inside', label: 'Inside (Top-Right)' },
  { value: 'none', label: 'Hidden (No Legend)' },
]

const TITLE_OPTIONS: { value: UITitleChoice; label: string }[] = [
  { value: 'full', label: 'Full (Mode & Instance)' },
  { value: 'compact', label: 'Compact (Short Title)' },
  { value: 'custom', label: 'Custom Title...' },
  { value: 'none', label: 'Hidden (No Title)' },
]

const LABEL_OPTIONS: { value: ParetoLabelMode; label: string }[] = [
  { value: 'all', label: 'All (X & Y Labels)' },
  { value: 'x-only', label: 'Only X-Axis Label' },
  { value: 'y-only', label: 'Only Y-Axis Label' },
  { value: 'ticks-only', label: 'Only Tick Values (No Axis Titles)' },
  { value: 'none', label: 'None (No Labels)' },
]

const BOLD_OPTIONS: { value: ParetoBoldMode; label: string }[] = [
  { value: 'title-axes', label: 'Titles & Axis Headers' },
  { value: 'all', label: 'All (Titles, Axes & Ticks)' },
  { value: 'title', label: 'Title Only' },
  { value: 'axes', label: 'Axis Headers Only' },
  { value: 'none', label: 'None (No Bold)' },
]

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32]

const FRONT_MODES: Array<{
  id: ParetoPlotMode
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  requires2D?: boolean
  requires3D?: boolean
}> = [
  {
    id: 'attainment',
    label: 'Attainment (EAF)',
    description: '50% median surface + 25%–75% IQR stochastic attainment band',
    icon: TrendingUp,
    requires2D: true,
  },
  {
    id: 'runs',
    label: 'Runs Overlay',
    description: 'Overlay individual runs of one or multiple algorithms (or reference only)',
    icon: ScatterChart,
    requires2D: true,
  },
  {
    id: 'representative',
    label: 'Representative',
    description: 'Best, median & worst run (by IGD+) plus accumulated ND union',
    icon: Target,
    requires2D: true,
  },
  {
    id: 'small-multiples',
    label: 'Small Multiples',
    description: 'Clean facet grid with one subplot per algorithm',
    icon: Columns2,
    requires2D: true,
  },
  {
    id: '3d',
    label: '3D Fronts',
    description: 'Interactive 3-objective Pareto front projection (drag to rotate)',
    icon: Box,
    requires3D: true,
  },
  {
    id: 'pcp',
    label: 'Parallel Coordinates',
    description: 'Normalized objective profiles for 2D, 3D & Many-Objective',
    icon: Activity,
  },
]

const ALL_INDICATORS = ['HV', 'IGD+', 'IGD', 'EPS', 'GD', 'Spacing']

function isModeCompatible(mode: ParetoPlotMode, nObjectives: number): boolean {
  if (mode === '3d') return nObjectives >= 3
  if (
    mode === 'attainment' ||
    mode === 'runs' ||
    mode === 'representative' ||
    mode === 'small-multiples' ||
    mode === 'eaf-diff'
  ) {
    return nObjectives === 2
  }
  return true
}

function resolveCompatibleMode(current: ParetoPlotMode, nObjectives: number): ParetoPlotMode {
  if (isModeCompatible(current, nObjectives)) return current
  return nObjectives >= 3 ? '3d' : 'attainment'
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export const ParetoWorkspace: React.FC<ParetoWorkspaceProps> = ({
  collectionName,
  apiOnline,
  onBackToHub,
  onDatasetCreated,
}) => {
  const { theme } = useAppearance()
  const isDark = theme === 'dark'
  const [paperWhiteBg, setPaperWhiteBg] = useState(true)
  const useLightCanvas = !isDark || paperWhiteBg

  const [activeTab, setActiveTab] = useState<ParetoWorkspaceTab>('fronts')
  const [summary, setSummary] = useState<ParetoCollectionSummary | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Shared context (always kept atomically compatible with instanceMeta)
  const [selectedInstance, setSelectedInstance] = useState<string>('')
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([])
  const [frontMode, setFrontMode] = useState<ParetoPlotMode>('attainment')
  const [showReference, setShowReference] = useState(true)
  const [filterDominated, setFilterDominated] = useState(true)
  const [showExtremeBounds, setShowExtremeBounds] = useState(false)
  const [showAccumulated, setShowAccumulated] = useState(true)
  const [runOpacity, setRunOpacity] = useState(0.45)

  // Full SAES Core ChartWorkbench-parity styling controls
  const [palette, setPalette] = useState('academic')
  const [presetId, setPresetId] = useState('golden')
  const [figureWidth, setFigureWidth] = useState(800)
  const [figureHeight, setFigureHeight] = useState(495)
  const [legendPlacement, setLegendPlacement] = useState<ParetoLegendPlacement>('top')
  const [fontScale, setFontScale] = useState(13)
  const [fontFamily, setFontFamily] = useState('Inter, -apple-system, sans-serif')
  const [titleChoice, setTitleChoice] = useState<UITitleChoice>('full')
  const [customTitle, setCustomTitle] = useState('')
  const [labelMode, setLabelMode] = useState<ParetoLabelMode>('all')
  const [boldMode, setBoldMode] = useState<ParetoBoldMode>('title-axes')
  const [showGrid, setShowGrid] = useState(true)

  const debouncedWidth = useDebouncedValue(figureWidth, 180)
  const debouncedHeight = useDebouncedValue(figureHeight, 180)
  const debouncedCustomTitle = useDebouncedValue(customTitle, 250)

  // EAF Diff controls
  const [algoA, setAlgoA] = useState<string>('')
  const [algoB, setAlgoB] = useState<string>('')
  const [nPermutations, setNPermutations] = useState(300)

  // Figure & data state
  const [frontPlotData, setFrontPlotData] = useState<Data[]>([])
  const [frontPlotLayout, setFrontPlotLayout] = useState<Partial<Layout>>({})
  const [isLoadingFrontPlot, setIsLoadingFrontPlot] = useState(false)

  const [diffPlotData, setDiffPlotData] = useState<Data[]>([])
  const [diffPlotLayout, setDiffPlotLayout] = useState<Partial<Layout>>({})
  const [eafDiff, setEafDiff] = useState<EAFDifferenceResult | null>(null)
  const [isLoadingDiffPlot, setIsLoadingDiffPlot] = useState(false)

  const [coverageData, setCoverageData] = useState<ParetoCoverageResponse | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Bridge to SAES Dataset
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([
    'HV',
    'IGD+',
    'IGD',
    'EPS',
    'Spacing',
  ])
  const [targetDatasetName, setTargetDatasetName] = useState(`${collectionName}_indicators.csv`)
  const [isConvertingDataset, setIsConvertingDataset] = useState(false)
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null)

  const activePreset = useMemo(
    () => PAPER_PRESETS.find((p) => p.id === presetId) ?? null,
    [presetId]
  )
  const handleSelectPreset = (preset: PaperPreset) => {
    setPresetId(preset.id)
    setFigureWidth(preset.width)
    setFigureHeight(preset.height)
  }

  const mmWidth = Math.round((figureWidth / 800) * 140)
  const mmHeight = Math.round((figureHeight / 800) * 140)
  const aspectDecimal = (figureWidth / figureHeight).toFixed(2)

  const resolvedTitleMode: ParetoTitleMode = titleChoice === 'custom' ? 'full' : titleChoice
  const resolvedCustomTitle: string | null =
    titleChoice === 'custom' && debouncedCustomTitle.trim() ? debouncedCustomTitle.trim() : null

  const applyInstanceContext = useCallback(
    (meta: ParetoInstanceMeta, preferredMode?: ParetoPlotMode) => {
      setSelectedInstance(meta.instance)
      setSelectedAlgorithms(meta.algorithms)
      setShowReference(meta.has_reference_front)
      setAlgoA(meta.algorithms[0] ?? '')
      setAlgoB(meta.algorithms[1] ?? meta.algorithms[0] ?? '')
      setFrontMode((prev) => resolveCompatibleMode(preferredMode ?? prev, meta.n_objectives))
      if (meta.n_objectives !== 2) {
        setActiveTab((prev) => (prev === 'eaf-diff' ? 'fronts' : prev))
      }
    },
    []
  )

  // Fetch study summary and initialize first instance atomically
  useEffect(() => {
    if (!collectionName || !apiOnline) return
    let cancelled = false
    const load = async () => {
      setErrorMsg(null)
      try {
        const s = await apiClient.getParetoCollectionSummary(collectionName)
        if (cancelled) return
        setSummary(s)
        setTargetDatasetName(`${s.name}_indicators.csv`)
        const firstInst = s.instances[0]
        if (firstInst && s.instance_details[firstInst]) {
          applyInstanceContext(s.instance_details[firstInst])
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load Pareto study.')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [collectionName, apiOnline, applyInstanceContext])

  const instanceMeta = useMemo(() => {
    if (!summary || !selectedInstance) return null
    return summary.instance_details[selectedInstance] ?? null
  }, [summary, selectedInstance])

  const handleSelectInstance = (inst: string) => {
    if (!summary || !summary.instance_details[inst]) return
    applyInstanceContext(summary.instance_details[inst])
  }

  const effectiveShowReference = Boolean(instanceMeta?.has_reference_front && showReference)

  // Fetch Fronts & EAF plot (supports 0 algorithms when Reference Front is visible -> Reference-only mode!)
  useEffect(() => {
    if (activeTab !== 'fronts' || !collectionName || !instanceMeta || !apiOnline) return
    if (!isModeCompatible(frontMode, instanceMeta.n_objectives)) return

    const validAlgorithms = selectedAlgorithms.filter((a) => instanceMeta.algorithms.includes(a))
    if (validAlgorithms.length === 0 && !effectiveShowReference) return

    let cancelled = false
    const run = async () => {
      setIsLoadingFrontPlot(true)
      setErrorMsg(null)
      try {
        const res = await apiClient.generateParetoPlot(collectionName, {
          instance: instanceMeta.instance,
          mode: frontMode,
          algorithms: validAlgorithms,
          show_reference: effectiveShowReference,
          filter_dominated: filterDominated,
          run_opacity: runOpacity,
          show_extreme_bounds: showExtremeBounds,
          show_accumulated: showAccumulated,
          palette,
          paper_format: presetId === 'custom' ? 'golden' : presetId,
          title: resolvedCustomTitle,
          title_mode: resolvedTitleMode,
          legend_placement: legendPlacement,
          font_size: fontScale,
          font_family: fontFamily,
          label_mode: labelMode,
          bold_mode: boldMode,
          show_grid: showGrid,
          dark_theme: !useLightCanvas,
          width_px: debouncedWidth,
          height_px: debouncedHeight,
        })
        if (cancelled) return
        setFrontPlotData((res.plotly_figure.data ?? []) as unknown as Data[])
        setFrontPlotLayout((res.plotly_figure.layout ?? {}) as unknown as Partial<Layout>)
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to render Pareto figure.')
        }
      } finally {
        if (!cancelled) setIsLoadingFrontPlot(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    activeTab,
    collectionName,
    instanceMeta,
    selectedAlgorithms,
    frontMode,
    effectiveShowReference,
    filterDominated,
    runOpacity,
    showExtremeBounds,
    showAccumulated,
    palette,
    presetId,
    resolvedCustomTitle,
    resolvedTitleMode,
    legendPlacement,
    fontScale,
    fontFamily,
    labelMode,
    boldMode,
    showGrid,
    useLightCanvas,
    debouncedWidth,
    debouncedHeight,
    apiOnline,
  ])

  const diffWidth = Math.max(840, figureWidth)
  const diffHeight = Math.max(460, figureHeight)
  const debouncedDiffWidth = Math.max(840, debouncedWidth)
  const debouncedDiffHeight = Math.max(460, debouncedHeight)

  // Fetch EAF Diff plot (strictly guarded -> zero 400s)
  useEffect(() => {
    if (activeTab !== 'eaf-diff' || !collectionName || !instanceMeta || !apiOnline) return
    if (instanceMeta.n_objectives !== 2) return
    if (
      !algoA ||
      !algoB ||
      algoA === algoB ||
      !instanceMeta.algorithms.includes(algoA) ||
      !instanceMeta.algorithms.includes(algoB)
    ) {
      return
    }

    let cancelled = false
    const run = async () => {
      setIsLoadingDiffPlot(true)
      setErrorMsg(null)
      try {
        const res = await apiClient.generateParetoPlot(collectionName, {
          instance: instanceMeta.instance,
          mode: 'eaf-diff',
          algorithms: [algoA, algoB],
          algo_a: algoA,
          algo_b: algoB,
          show_reference: effectiveShowReference,
          filter_dominated: filterDominated,
          n_permutations: nPermutations,
          palette,
          paper_format: presetId === 'custom' ? 'double-col' : presetId,
          title: resolvedCustomTitle,
          title_mode: resolvedTitleMode,
          legend_placement: legendPlacement,
          font_size: fontScale,
          font_family: fontFamily,
          label_mode: labelMode,
          bold_mode: boldMode,
          show_grid: showGrid,
          dark_theme: !useLightCanvas,
          width_px: debouncedDiffWidth,
          height_px: debouncedDiffHeight,
        })
        if (cancelled) return
        setDiffPlotData((res.plotly_figure.data ?? []) as unknown as Data[])
        setDiffPlotLayout((res.plotly_figure.layout ?? {}) as unknown as Partial<Layout>)
        setEafDiff(res.eaf_difference ?? null)
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to compute EAF difference.')
        }
      } finally {
        if (!cancelled) setIsLoadingDiffPlot(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    activeTab,
    collectionName,
    instanceMeta,
    algoA,
    algoB,
    effectiveShowReference,
    filterDominated,
    nPermutations,
    palette,
    presetId,
    resolvedCustomTitle,
    resolvedTitleMode,
    legendPlacement,
    fontScale,
    fontFamily,
    labelMode,
    boldMode,
    showGrid,
    useLightCanvas,
    debouncedDiffWidth,
    debouncedDiffHeight,
    apiOnline,
  ])

  // Fetch Coverage & Representative Runs (falls back to all algorithms when in Reference-only view)
  useEffect(() => {
    if (!collectionName || !instanceMeta || !apiOnline) return
    const validAlgorithms = selectedAlgorithms.filter((a) => instanceMeta.algorithms.includes(a))
    const targetAlgs = validAlgorithms.length > 0 ? validAlgorithms : instanceMeta.algorithms
    if (targetAlgs.length === 0) return

    let cancelled = false
    const run = async () => {
      try {
        const cov = await apiClient.getParetoCoverage(
          collectionName,
          instanceMeta.instance,
          targetAlgs,
          filterDominated
        )
        if (!cancelled) setCoverageData(cov)
      } catch {
        if (!cancelled) setCoverageData(null)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [collectionName, instanceMeta, selectedAlgorithms, filterDominated, apiOnline])

  // Immediate smooth slider sizing while backend debounces layout recalculation
  const themedFrontLayout = useMemo<Partial<Layout>>(
    () => ({
      ...frontPlotLayout,
      width: figureWidth,
      height: figureHeight,
      autosize: false,
      paper_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
      plot_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
    }),
    [frontPlotLayout, figureWidth, figureHeight, useLightCanvas]
  )

  const themedDiffLayout = useMemo<Partial<Layout>>(
    () => ({
      ...diffPlotLayout,
      width: diffWidth,
      height: diffHeight,
      autosize: false,
      paper_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
      plot_bgcolor: useLightCanvas ? '#ffffff' : '#0f172a',
    }),
    [diffPlotLayout, diffWidth, diffHeight, useLightCanvas]
  )

  const toggleAlgorithm = (alg: string) => {
    setSelectedAlgorithms((prev) => {
      if (prev.includes(alg)) {
        // Allow deselecting ALL algorithms whenever Reference Front is visible!
        if (prev.length === 1 && !effectiveShowReference) {
          return prev
        }
        return prev.filter((a) => a !== alg)
      }
      return [...prev, alg]
    })
  }

  const handleToggleReference = () => {
    if (!instanceMeta?.has_reference_front) return
    if (showReference) {
      // Turning OFF reference: if no algorithms are currently selected, restore all algorithms so canvas is never blank
      if (selectedAlgorithms.length === 0) {
        setSelectedAlgorithms(instanceMeta.algorithms)
      }
      setShowReference(false)
    } else {
      setShowReference(true)
    }
  }

  const handleReferenceOnly = () => {
    if (!instanceMeta?.has_reference_front) return
    setSelectedAlgorithms([])
    setShowReference(true)
  }

  const handleShowAllFronts = () => {
    if (!instanceMeta) return
    setSelectedAlgorithms(instanceMeta.algorithms)
    if (instanceMeta.has_reference_front) {
      setShowReference(true)
    }
  }

  const handleExport = async (fmt: PlotExportFormat, exportMode: ParetoPlotMode) => {
    if (!instanceMeta) return
    setIsExporting(true)
    try {
      const validAlgorithms = selectedAlgorithms.filter((a) => instanceMeta.algorithms.includes(a))
      const expWidth = exportMode === 'eaf-diff' ? diffWidth : figureWidth
      const expHeight = exportMode === 'eaf-diff' ? diffHeight : figureHeight
      const blob = await apiClient.exportParetoPlot(collectionName, {
        instance: instanceMeta.instance,
        mode: exportMode,
        algorithms: exportMode === 'eaf-diff' ? [algoA, algoB] : validAlgorithms,
        show_reference: effectiveShowReference,
        filter_dominated: filterDominated,
        run_opacity: runOpacity,
        show_extreme_bounds: showExtremeBounds,
        show_accumulated: showAccumulated,
        algo_a: exportMode === 'eaf-diff' ? algoA : null,
        algo_b: exportMode === 'eaf-diff' ? algoB : null,
        n_permutations: nPermutations,
        palette,
        paper_format: presetId === 'custom' ? 'golden' : presetId,
        title: titleChoice === 'custom' && customTitle.trim() ? customTitle.trim() : null,
        title_mode: resolvedTitleMode,
        legend_placement: legendPlacement,
        font_size: fontScale,
        font_family: fontFamily,
        label_mode: labelMode,
        bold_mode: boldMode,
        show_grid: showGrid,
        dark_theme: !useLightCanvas,
        width_px: expWidth,
        height_px: expHeight,
        export_format: fmt,
        dpi: 300,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pareto_${instanceMeta.instance}_${exportMode}.${fmt}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : `Failed to export ${fmt.toUpperCase()}.`)
    } finally {
      setIsExporting(false)
    }
  }

  const toggleIndicator = (ind: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(ind)
        ? prev.length === 1
          ? prev
          : prev.filter((x) => x !== ind)
        : [...prev, ind]
    )
  }

  const handleConvertAndAnalyze = async () => {
    if (selectedIndicators.length === 0) return
    setIsConvertingDataset(true)
    setConversionSuccess(null)
    setErrorMsg(null)
    try {
      const res = await apiClient.convertParetoToDataset(collectionName, {
        dataset_filename: targetDatasetName.trim() || `${collectionName}_indicators.csv`,
        indicators: selectedIndicators,
      })
      setConversionSuccess(
        `Created '${res.filename}' (${res.row_count} rows across ${res.metrics.join(', ')}). Opening SAES Statistical Workbench...`
      )
      await onDatasetCreated(res.filename)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to extract quality indicators.')
    } finally {
      setIsConvertingDataset(false)
    }
  }

  const coverageLookup = useMemo(() => {
    const map: Record<string, Record<string, { mean: number; std: number }>> = {}
    if (!coverageData) return map
    for (const cell of coverageData.coverage_matrix) {
      if (!map[cell.algo_a]) map[cell.algo_a] = {}
      map[cell.algo_a][cell.algo_b] = { mean: cell.mean, std: cell.std }
    }
    return map
  }, [coverageData])

  // Shared Styling, Typography & Paper Proportions Deck (exact mirror of SAES Core ChartWorkbench)
  const renderTypographyAndPaperControls = () => (
    <>
      {/* Typography, Legend, Title, Labels, Bold & Grid Controls */}
      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <PaletteSelector selectedId={palette} onSelect={setPalette} />

          <SelectDropdown
            icon={<ListFilter className="w-3.5 h-3.5" />}
            label="Legend:"
            value={legendPlacement}
            options={LEGEND_PLACEMENTS}
            onChange={(val) => setLegendPlacement(val as ParetoLegendPlacement)}
          />

          <SelectDropdown
            label="Size:"
            value={fontScale}
            options={FONT_SIZES.map((s) => ({ value: s, label: `${s}pt` }))}
            onChange={(val) => setFontScale(Number(val))}
          />

          <SelectDropdown
            label="Title:"
            value={titleChoice}
            options={TITLE_OPTIONS}
            onChange={(val) => setTitleChoice(val as UITitleChoice)}
          />

          {titleChoice === 'custom' && (
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Enter custom figure title..."
              className="h-8 w-52 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}

          <SelectDropdown
            label="Labels:"
            value={labelMode}
            options={LABEL_OPTIONS}
            onChange={(val) => setLabelMode(val as ParetoLabelMode)}
          />

          <SelectDropdown
            label="Bold:"
            value={boldMode}
            options={BOLD_OPTIONS}
            onChange={(val) => setBoldMode(val as ParetoBoldMode)}
          />

          <SelectDropdown
            icon={<Type className="w-3.5 h-3.5" />}
            label="Font:"
            value={fontFamily}
            options={FONT_FAMILIES}
            onChange={setFontFamily}
          />

          <Button
            type="button"
            variant={showGrid ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowGrid((g) => !g)}
            className="h-8 px-2.5 text-xs gap-1.5"
            title="Show or hide background coordinate grid"
          >
            <Grid3X3 className="w-3.5 h-3.5 text-primary" />
            {showGrid ? 'Grid: On' : 'Grid: Off'}
          </Button>
        </div>
      </div>

      {/* Scientific Paper Proportions + Width/Height Sliders + Canvas Theme */}
      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-muted-foreground mr-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            Paper Format:
          </span>
          <div className="flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-lg">
            {PAPER_PRESETS.map((preset) => {
              const PIcon = preset.icon
              const isSelected = presetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  title={`${preset.label} — ${preset.description} (${preset.width}×${preset.height}px)`}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <PIcon className="w-3.5 h-3.5" />
                  {preset.shortLabel}
                </button>
              )
            })}
          </div>
        </div>

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
    </>
  )

  if (!summary || !instanceMeta) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        Loading Pareto study &ldquo;{collectionName}&rdquo;...
      </div>
    )
  }

  const canRunEafDiff = instanceMeta.n_objectives === 2 && instanceMeta.algorithms.length >= 2
  const isReferenceOnly = selectedAlgorithms.length === 0 && effectiveShowReference
  const needsShowAll =
    selectedAlgorithms.length < instanceMeta.algorithms.length ||
    (instanceMeta.has_reference_front && !showReference)

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Workspace Header — mirrors VisualizeWorkspace */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBackToHub}
            className="gap-1 text-xs -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pareto Studies
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {summary.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono font-medium">
                {summary.total_fronts} fronts
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              {summary.algorithms.length} algorithms • {summary.instances.length} instances •{' '}
              {instanceMeta.n_objectives}D objective space
              {instanceMeta.has_reference_front
                ? ` • Reference PF (${instanceMeta.reference_points_count} pts)`
                : ''}
            </p>
          </div>
        </div>

        {/* Right: Problem Instance Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs shadow-xs">
            <span className="px-2 font-mono text-muted-foreground text-[11px]">Instance:</span>
            {summary.instances.map((inst) => {
              const meta = summary.instance_details[inst]
              const active = inst === selectedInstance
              return (
                <button
                  key={inst}
                  type="button"
                  onClick={() => handleSelectInstance(inst)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    active
                      ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{inst}</span>
                  <span className="text-[10px] font-mono opacity-80">{meta.n_objectives}D</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Workspace Tabs — mirrors VisualizeWorkspace */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ParetoWorkspaceTab)}
        className="space-y-6"
      >
        <div className="border-b border-border/80 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2 overflow-x-auto">
          <TabsList className="bg-muted p-1 border border-border/60 flex-wrap h-auto gap-1">
            <TabsTrigger value="fronts" className="gap-2 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              Fronts &amp; EAF
            </TabsTrigger>

            <TabsTrigger
              value="eaf-diff"
              disabled={!canRunEafDiff}
              className="gap-2 text-xs font-semibold"
            >
              <GitCompare className="w-3.5 h-3.5 text-indigo-600" />
              EAF Diff (A vs B)
            </TabsTrigger>

            <TabsTrigger value="coverage" className="gap-2 text-xs font-semibold">
              <Table2 className="w-3.5 h-3.5 text-emerald-600" />
              Coverage &amp; Runs
            </TabsTrigger>

            <TabsTrigger value="export" className="gap-2 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              Extract to SAES
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-muted-foreground font-mono hidden lg:block shrink-0">
            {selectedInstance} ({instanceMeta.objective_names.join(' × ')})
          </span>
        </div>

        {/* ── TAB 1: FRONTS & EAF ──────────────────────────────────────── */}
        <TabsContent value="fronts" className="space-y-4 focus-visible:outline-none">
          {/* Unified Control Deck (exact same design language as ChartWorkbench) */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3.5">
            {/* Row 1: Chart Mode Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {FRONT_MODES.map((opt) => {
                const Icon = opt.icon
                const disabled =
                  (opt.requires2D && instanceMeta.n_objectives !== 2) ||
                  (opt.requires3D && instanceMeta.n_objectives < 3)
                const active = frontMode === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setFrontMode(opt.id)}
                    title={opt.description}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      disabled
                        ? 'opacity-35 cursor-not-allowed bg-muted/40 border-border/60 text-muted-foreground'
                        : active
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm cursor-pointer'
                          : 'bg-background text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/40 cursor-pointer'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Row 2: Visible Fronts (Algorithms + Reference Front with symmetric toggle & 'only') + Domain Options */}
            <div className="pt-3 border-t border-border/60 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                  Fronts:
                </span>

                {/* First-class Reference Front pill with toggle + 'only' */}
                {instanceMeta.has_reference_front && (
                  <div className="inline-flex items-center rounded-md border border-border overflow-hidden mr-1">
                    <button
                      type="button"
                      onClick={handleToggleReference}
                      title="Toggle Reference Pareto Front visibility"
                      className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        effectiveShowReference
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                          : 'bg-background text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className="inline-block w-3 border-t-2 border-dashed border-current" />
                      <span>Reference</span>
                      <span className="text-[10px] font-mono opacity-80">
                        ({instanceMeta.reference_points_count})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReferenceOnly}
                      title="Show ONLY the Reference Front (hide all algorithms)"
                      className={`px-1.5 py-1 text-[10px] font-mono border-l border-border cursor-pointer transition-colors ${
                        isReferenceOnly
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      only
                    </button>
                  </div>
                )}

                {instanceMeta.algorithms.map((alg) => {
                  const active = selectedAlgorithms.includes(alg)
                  const nRuns = instanceMeta.runs_per_algorithm[alg]?.length ?? 0
                  return (
                    <div
                      key={alg}
                      className="inline-flex items-center rounded-md border border-border overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleAlgorithm(alg)}
                        className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'bg-background text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span>{alg}</span>
                        <span className="text-[10px] font-mono opacity-75">({nRuns}r)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAlgorithms([alg])}
                        title={`Show only ${alg}`}
                        className={`px-1.5 py-1 text-[10px] font-mono border-l border-border cursor-pointer transition-colors ${
                          active && selectedAlgorithms.length === 1
                            ? 'bg-primary/15 text-primary font-semibold'
                            : 'bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        only
                      </button>
                    </div>
                  )
                })}

                {needsShowAll && (
                  <button
                    type="button"
                    onClick={handleShowAllFronts}
                    className="text-xs text-primary hover:underline font-medium ml-1 cursor-pointer"
                  >
                    Show all
                  </button>
                )}
              </div>

              {/* Domain-specific toggles for the active Pareto mode */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-foreground">
                  <input
                    type="checkbox"
                    checked={filterDominated}
                    onChange={(e) => setFilterDominated(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Filter Dominated</span>
                </label>

                {frontMode === 'attainment' && !isReferenceOnly && (
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-foreground">
                    <input
                      type="checkbox"
                      checked={showExtremeBounds}
                      onChange={(e) => setShowExtremeBounds(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>Best/Worst (0%/100%) Envelopes</span>
                  </label>
                )}

                {frontMode === 'representative' && !isReferenceOnly && (
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-foreground">
                    <input
                      type="checkbox"
                      checked={showAccumulated}
                      onChange={(e) => setShowAccumulated(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>Accumulated ND Union</span>
                  </label>
                )}

                {(frontMode === 'runs' || frontMode === 'small-multiples' || frontMode === '3d') &&
                  !isReferenceOnly && (
                    <div className="inline-flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Opacity:</span>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        value={runOpacity}
                        onChange={(e) => setRunOpacity(Number(e.target.value))}
                        className="w-20 cursor-pointer"
                      />
                      <span className="font-mono text-[11px]">{Math.round(runOpacity * 100)}%</span>
                    </div>
                  )}

                {isReferenceOnly && (
                  <span className="text-[11px] text-muted-foreground italic">
                    Showing Reference Front only — click any algorithm chip above or &ldquo;Show
                    all&rdquo; to overlay approximation fronts.
                  </span>
                )}
              </div>
            </div>

            {/* Rows 3 & 4: Full ChartWorkbench Typography, Legend, Title, Labels, Bold, Grid & Paper Proportions */}
            {renderTypographyAndPaperControls()}
          </div>

          {/* WYSIWYG Scientific Paper Figure Stage — IDENTICAL to ChartWorkbench */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-6 shadow-inner overflow-x-auto">
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

              <ExportToolbar
                onExport={(fmt) => handleExport(fmt, frontMode)}
                isExporting={isExporting || isLoadingFrontPlot}
              />
            </div>

            <div className="flex justify-center items-center min-h-[420px] py-2">
              {isLoadingFrontPlot && frontPlotData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span>Computing Pareto / EAF figure in SAES backend...</span>
                </div>
              ) : (
                <div
                  className="relative rounded-md border border-border/80 shadow-md transition-all duration-150 overflow-hidden shrink-0"
                  style={{
                    width: `${figureWidth}px`,
                    height: `${figureHeight}px`,
                    backgroundColor: useLightCanvas ? '#ffffff' : '#0f172a',
                  }}
                >
                  {isLoadingFrontPlot && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                  <PlotlyChart
                    data={frontPlotData}
                    layout={themedFrontLayout}
                    style={{ width: `${figureWidth}px`, height: `${figureHeight}px` }}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: EAF DIFF (A vs B) ─────────────────────────────────── */}
        <TabsContent value="eaf-diff" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-semibold text-foreground">Pairwise EAF Comparison:</span>
                <select
                  value={algoA}
                  onChange={(e) => setAlgoA(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                >
                  {instanceMeta.algorithms.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground font-mono">vs</span>
                <select
                  value={algoB}
                  onChange={(e) => setAlgoB(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                >
                  {instanceMeta.algorithms.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground ml-2">KS-EAF Permutations:</span>
                <select
                  value={nPermutations}
                  onChange={(e) => setNPermutations(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-mono"
                >
                  {[100, 300, 500, 1000].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                {instanceMeta.has_reference_front && (
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none ml-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={showReference}
                      onChange={(e) => setShowReference(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>Reference Front</span>
                  </label>
                )}
              </div>
            </div>

            {renderTypographyAndPaperControls()}
          </div>

          {/* Statistical Summary Strip (mirrors ChartWorkbench Bayesian/CD strip) */}
          {eafDiff && algoA !== algoB && (
            <div className="px-4 py-2.5 rounded-lg border border-border/70 bg-card/70 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-foreground">
                  KS-EAF Permutation Test ({eafDiff.n_permutations} perms):
                </span>
                <span className="font-mono font-bold text-primary">
                  KS = {eafDiff.ks_statistic.toFixed(4)}
                </span>
                <span className="font-mono">
                  p ={' '}
                  {eafDiff.p_value < 0.001
                    ? eafDiff.p_value.toExponential(2)
                    : eafDiff.p_value.toFixed(4)}
                </span>
                <Badge
                  variant="secondary"
                  className={
                    eafDiff.is_significant
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {eafDiff.is_significant ? 'Significant (α = 0.05)' : 'Not Significant'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-sky-600 dark:text-sky-400 font-semibold">
                  {eafDiff.algo_a}: +{(eafDiff.max_advantage_a * 100).toFixed(0)}% (area{' '}
                  {(eafDiff.area_fraction_a_better * 100).toFixed(1)}%)
                </span>
                <span className="text-orange-600 dark:text-orange-400 font-semibold">
                  {eafDiff.algo_b}: +{(eafDiff.max_advantage_b * 100).toFixed(0)}% (area{' '}
                  {(eafDiff.area_fraction_b_better * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          {algoA === algoB ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-xs text-muted-foreground">
              Select two distinct algorithms above to compute their spatial ΔEAF advantage regions
              and KS-EAF permutation test.
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-6 shadow-inner overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-border/50 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="font-semibold text-foreground">
                    Mirrored ΔEAF Spatial Dominance
                  </span>
                  <span>•</span>
                  <span>
                    {diffWidth} × {diffHeight} px • 300 DPI
                  </span>
                </div>
                <ExportToolbar
                  onExport={(fmt) => handleExport(fmt, 'eaf-diff')}
                  isExporting={isExporting || isLoadingDiffPlot}
                />
              </div>

              <div className="flex justify-center items-center min-h-[440px] py-2">
                {isLoadingDiffPlot && diffPlotData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80 gap-2 text-muted-foreground text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>Computing exact 2D ΔEAF &amp; KS-EAF permutation test...</span>
                  </div>
                ) : (
                  <div
                    className="relative rounded-md border border-border/80 shadow-md overflow-hidden shrink-0"
                    style={{
                      width: `${diffWidth}px`,
                      height: `${diffHeight}px`,
                      backgroundColor: useLightCanvas ? '#ffffff' : '#0f172a',
                    }}
                  >
                    {isLoadingDiffPlot && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                    <PlotlyChart
                      data={diffPlotData}
                      layout={themedDiffLayout}
                      style={{ width: `${diffWidth}px`, height: `${diffHeight}px` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: COVERAGE & REPRESENTATIVE RUNS ────────────────────── */}
        <TabsContent value="coverage" className="space-y-5 focus-visible:outline-none">
          {coverageData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Representative Runs — {coverageData.instance}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Runs ranked by Pareto-compliant IGD+ against{' '}
                    {instanceMeta.has_reference_front ? 'the reference front' : 'the ND union'}.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        <th className="py-2 pr-2 font-medium">Algorithm</th>
                        <th className="py-2 px-2 font-medium text-right">Runs</th>
                        <th className="py-2 px-2 font-medium text-right">Best / Med / Worst</th>
                        <th className="py-2 px-2 font-medium text-right">Mean IGD+</th>
                        <th className="py-2 pl-2 font-medium text-right">Mean HV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 font-mono text-[11px]">
                      {coverageData.representative_runs.map((rep) => (
                        <tr key={rep.algorithm} className="hover:bg-muted/30">
                          <td className="py-2.5 pr-2 font-sans font-semibold text-foreground">
                            {rep.algorithm}
                          </td>
                          <td className="py-2.5 px-2 text-right">{rep.n_runs}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">
                            #{rep.best_run_id} /{' '}
                            <strong className="text-foreground">#{rep.median_run_id}</strong> / #
                            {rep.worst_run_id}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {rep.mean_igd_plus != null ? rep.mean_igd_plus.toFixed(4) : '—'}
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            {rep.mean_hv != null ? rep.mean_hv.toFixed(4) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Set Coverage Matrix C(Row, Col)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Mean fraction of column solutions weakly dominated by row solutions.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2 pr-2 text-left font-medium">A \ B</th>
                        {coverageData.algorithms.map((alg) => (
                          <th key={alg} className="py-2 px-2 text-center font-medium">
                            {alg}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 font-mono text-[11px]">
                      {coverageData.algorithms.map((rowAlg) => (
                        <tr key={rowAlg}>
                          <td className="py-2.5 pr-2 font-sans font-semibold text-foreground">
                            {rowAlg}
                          </td>
                          {coverageData.algorithms.map((colAlg) => {
                            if (rowAlg === colAlg) {
                              return (
                                <td
                                  key={colAlg}
                                  className="py-2.5 px-2 text-center text-muted-foreground/40"
                                >
                                  —
                                </td>
                              )
                            }
                            const cell = coverageLookup[rowAlg]?.[colAlg]
                            const val = cell ? cell.mean : 0
                            const cls =
                              val >= 0.6
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                                : val >= 0.3
                                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                  : 'text-muted-foreground'
                            return (
                              <td
                                key={colAlg}
                                className={`py-2.5 px-2 text-center rounded ${cls}`}
                                title={
                                  cell
                                    ? `C(${rowAlg}, ${colAlg}) = ${(cell.mean * 100).toFixed(1)}% ± ${(cell.std * 100).toFixed(1)}%`
                                    : undefined
                                }
                              >
                                {(val * 100).toFixed(1)}%
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 4: EXTRACT INDICATORS -> CORE SAES ───────────────────── */}
        <TabsContent value="export" className="space-y-5 focus-visible:outline-none">
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-5 max-w-3xl">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Extract Quality Indicators to SAES Benchmarks
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Compute standardized multi-objective quality indicators across all{' '}
                <strong>{summary.instances.length} instances</strong> and{' '}
                <strong>{summary.algorithms.length} algorithms</strong>, save them as a canonical
                SAES CSV dataset, and jump directly into the SAES Statistical Workbench (Friedman,
                Bayesian Plackett–Luce, TOST, Dolan–Moré profiles, and LaTeX tables).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                1. Select Quality Indicators
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_INDICATORS.map((ind) => {
                  const active = selectedIndicators.includes(ind)
                  return (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => toggleIndicator(ind)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted/60'
                      }`}
                    >
                      {ind}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                2. Target SAES Dataset Filename
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="text"
                  value={targetDatasetName}
                  onChange={(e) => setTargetDatasetName(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs font-mono flex-1 max-w-sm"
                  placeholder="pareto_indicators.csv"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConvertAndAnalyze}
                  disabled={isConvertingDataset || selectedIndicators.length === 0}
                  className="h-9 gap-1.5 text-xs shadow-sm"
                >
                  {isConvertingDataset ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  Compute Indicators &amp; Open in SAES
                </Button>
              </div>
            </div>

            {conversionSuccess && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium pt-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{conversionSuccess}</span>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
