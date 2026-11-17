import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  BenchmarkRecord,
  BenchmarkTableCell,
  BenchmarkTableInstanceRow,
  CellAnalysis,
  LatexDocumentMode,
  LatexNotation,
  PairwiseMatrixCell,
  PdfGridStyle,
  PdfOrientation,
  PdfTheme,
  PostHocCorrectionType,
  StatisticalTableQueryParams,
  StatisticalTableResponse,
  StatisticalTestType,
  SummaryStatMode,
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
  Award,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Filter,
  Grid,
  Layers,
  Layout,
  Loader2,
  Palette,
  RefreshCw,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Trophy,
  Type,
  AlertTriangle,
} from 'lucide-react'

interface StatsTableProps {
  results?: CellAnalysis[]
  records?: BenchmarkRecord[]
  alpha: number
  apiOnline?: boolean
  selectedDatasetFilename?: string | null
  rawCsv?: string
  initialTestType?: StatisticalTestType
  initialTableType?: TableType
  initialMetric?: string
  onExportCsv?: () => void
}

type WorkbenchViewMode = 'instance_algorithm' | 'pairwise_matrix' | 'omnibus_posthoc' | 'latex_code'
type InstanceTableLens = 'value_symbol' | 'symbol_only' | 'rank_only'
type PairwiseViewLens = 'case_by_case' | 'general_summary'

const PDF_THEME_OPTIONS: {
  id: PdfTheme
  name: string
  description: string
  headerBg: string
  accentBg: string
}[] = [
  {
    id: 'slate',
    name: 'Clean Slate (Default)',
    description: 'Dark slate headers with emerald winner highlights',
    headerBg: '#1e293b',
    accentBg: '#10b981',
  },
  {
    id: 'academic_bw',
    name: 'Academic B&W (IEEE / ACM / Springer)',
    description: 'Strict grayscale booktabs layout for journal print submissions',
    headerBg: '#0f172a',
    accentBg: '#94a3b8',
  },
  {
    id: 'navy',
    name: 'Deep Navy (Executive)',
    description: 'Professional navy blue header with ice blue statistical accents',
    headerBg: '#1e3a8a',
    accentBg: '#3b82f6',
  },
  {
    id: 'emerald',
    name: 'Emerald Peak (Eco / Clean)',
    description: 'Deep forest green header with mint winning cell highlights',
    headerBg: '#064e3b',
    accentBg: '#34d399',
  },
  {
    id: 'crimson',
    name: 'Crimson Classic (Formal)',
    description: 'Rich burgundy header with elegant rose winner highlights',
    headerBg: '#881337',
    accentBg: '#f43f5e',
  },
]

const TEST_OPTIONS: {
  value: StatisticalTestType
  shortLabel: string
  desc: string
  group: 'Automated' | 'Non-Parametric' | 'Parametric'
}[] = [
  {
    value: 'auto',
    shortLabel: 'Auto (Smart Selection)',
    desc: 'Automated selection driven by Shapiro-Wilk normality and Levene variance checks.',
    group: 'Automated',
  },
  {
    value: 'wilcoxon',
    shortLabel: 'Wilcoxon Signed-Rank',
    desc: 'Paired non-parametric test for matched algorithm runs across instances.',
    group: 'Non-Parametric',
  },
  {
    value: 'friedman',
    shortLabel: 'Friedman + Post-Hoc',
    desc: 'Multi-algorithm repeated measures omnibus test with post-hoc comparisons.',
    group: 'Non-Parametric',
  },
  {
    value: 'mann_whitney',
    shortLabel: 'Mann-Whitney U Test',
    desc: 'Independent two-group rank-sum test with Vargha-Delaney A12 effect size.',
    group: 'Non-Parametric',
  },
  {
    value: 'kruskal',
    shortLabel: 'Kruskal-Wallis H Test',
    desc: 'Non-parametric alternative to ANOVA for independent multi-group comparisons.',
    group: 'Non-Parametric',
  },
  {
    value: 'ttest_rel',
    shortLabel: 'Paired Samples t-test',
    desc: 'Parametric test for matched observations assuming normally distributed differences.',
    group: 'Parametric',
  },
  {
    value: 'ttest_ind',
    shortLabel: "Student's t-test (Equal var)",
    desc: 'Independent two-sample parametric test assuming equal variances.',
    group: 'Parametric',
  },
  {
    value: 'ttest_welch',
    shortLabel: "Welch's t-test (Unequal var)",
    desc: 'Robust independent two-sample parametric test for heteroscedastic distributions.',
    group: 'Parametric',
  },
  {
    value: 'anova_oneway',
    shortLabel: 'One-Way ANOVA (Homoscedastic)',
    desc: "Fisher's one-way ANOVA assuming normal distributions and equal variances.",
    group: 'Parametric',
  },
  {
    value: 'anova_welch',
    shortLabel: "Welch's ANOVA (Heteroscedastic)",
    desc: 'Robust one-way ANOVA for unequal group variances and sample sizes.',
    group: 'Parametric',
  },
]

const CORRECTION_OPTIONS: {
  value: PostHocCorrectionType
  shortLabel: string
  desc: string
}[] = [
  {
    value: 'holm',
    shortLabel: 'Holm-Bonferroni (Recommended)',
    desc: 'Step-down procedure with strong FWER control and higher statistical power.',
  },
  {
    value: 'bonferroni',
    shortLabel: 'Bonferroni-Dunn (Strict FWER)',
    desc: 'Conservative correction dividing alpha by total number of comparisons.',
  },
  {
    value: 'fdr_bh',
    shortLabel: 'Benjamini-Hochberg (FDR)',
    desc: 'Controls False Discovery Rate; optimal for large multi-algorithm matrices.',
  },
  {
    value: 'hochberg',
    shortLabel: 'Hochberg (Step-Up)',
    desc: 'Step-up procedure less conservative than Bonferroni under independence.',
  },
  {
    value: 'none',
    shortLabel: 'Unadjusted (Raw p-values)',
    desc: 'Raw unadjusted p-values without multiplicity adjustments.',
  },
]

const SUMMARY_STAT_OPTIONS: {
  value: SummaryStatMode
  shortLabel: string
  desc: string
}[] = [
  {
    value: 'auto',
    shortLabel: 'Auto (Test-Matched)',
    desc: 'Mean ± SD for parametric tests; Median (IQR) for non-parametric tests.',
  },
  {
    value: 'mean_std',
    shortLabel: 'Mean ± Standard Deviation',
    desc: 'Standard mean ± std for symmetric, normally distributed runs.',
  },
  {
    value: 'median_iqr',
    shortLabel: 'Median (Interquartile Range)',
    desc: 'Median (IQR) robust against skewed runs and outliers.',
  },
]

function formatP(p: number | null | undefined): string {
  if (p === null || p === undefined || Number.isNaN(p)) return '—'
  if (p < 0.0001) return '< 0.0001'
  return p.toFixed(4)
}

function formatNum(v: number | null | undefined, digits = 4): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const abs = Math.abs(v)
  if (abs > 0 && (abs < 1e-4 || abs >= 1e5)) return v.toExponential(2)
  return v.toFixed(digits)
}

export const StatsTable: React.FC<StatsTableProps> = ({
  records = [],
  alpha,
  apiOnline = true,
  selectedDatasetFilename,
  rawCsv,
  initialTestType,
  initialTableType,
  initialMetric,
}) => {
  const availableMetrics = useMemo(
    () => Array.from(new Set(records.map((r) => r.metric))).sort(),
    [records]
  )
  const availableAlgorithms = useMemo(
    () => Array.from(new Set(records.map((r) => r.algorithm))).sort(),
    [records]
  )
  const availableInstances = useMemo(
    () => Array.from(new Set(records.map((r) => r.instance))).sort(),
    [records]
  )

  const [viewMode, setViewMode] = useState<WorkbenchViewMode>(
    initialTableType || 'instance_algorithm'
  )
  const [activeTableType, setActiveTableType] = useState<TableType>(
    initialTableType || 'instance_algorithm'
  )
  const [instanceLens, setInstanceLens] = useState<InstanceTableLens>('value_symbol')
  const [pairwiseLens, setPairwiseLens] = useState<PairwiseViewLens>('case_by_case')
  const [focusedInstanceIdx, setFocusedInstanceIdx] = useState<number | null>(null)

  const [selectedMetric, setSelectedMetric] = useState<string>(
    initialMetric || availableMetrics[0] || ''
  )
  const [testType, setTestType] = useState<StatisticalTestType>(initialTestType || 'auto')
  const [posthocCorrection, setPosthocCorrection] = useState<PostHocCorrectionType>('holm')
  const [summaryStat, setSummaryStat] = useState<SummaryStatMode>('auto')
  const [referenceAlgorithm, setReferenceAlgorithm] = useState<string>('')
  const [latexDocumentMode, setLatexDocumentMode] = useState<LatexDocumentMode>('standalone')
  const [latexNotation, setLatexNotation] = useState<LatexNotation>('scientific')
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([])
  const [selectedInstances, setSelectedInstances] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState<boolean>(false)

  // PDF Presentation & Style Editor State
  const [pdfTitle, setPdfTitle] = useState<string>('')
  const [pdfCaption, setPdfCaption] = useState<string>('')
  const [pdfTheme, setPdfTheme] = useState<PdfTheme>('slate')
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>('landscape')
  const [pdfFontSize, setPdfFontSize] = useState<number>(8.5)
  const [pdfHighlightBest, setPdfHighlightBest] = useState<boolean>(true)
  const [pdfShowZebra, setPdfShowZebra] = useState<boolean>(true)
  const [pdfGridStyle, setPdfGridStyle] = useState<PdfGridStyle>('full')
  const [exportModalTab, setExportModalTab] = useState<'pdf' | 'other'>('pdf')
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false)
  const [pdfPreviewTab, setPdfPreviewTab] = useState<'visual' | 'vector'>('visual')
  const [selectedOtherFormat, setSelectedOtherFormat] = useState<TableExportFormat>('docx')

  const [tableData, setTableData] = useState<StatisticalTableResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<TableExportFormat | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<'latex' | 'markdown' | null>(null)

  useEffect(() => {
    if (tableData) {
      if (!pdfTitle || pdfTitle.startsWith('SAES Benchmark Table —')) {
        setPdfTitle(`SAES Benchmark Table — ${tableData.metric}`)
      }
      if (!pdfCaption) {
        setPdfCaption(tableData.caption)
      }
    }
  }, [tableData, pdfTitle, pdfCaption])

  useEffect(() => {
    if (!isExportDialogOpen && pdfPreviewBlobUrl) {
      URL.revokeObjectURL(pdfPreviewBlobUrl)
      setPdfPreviewBlobUrl(null)
    }
  }, [isExportDialogOpen, pdfPreviewBlobUrl])

  const handleSelectViewMode = (mode: WorkbenchViewMode) => {
    setViewMode(mode)
    if (mode !== 'latex_code') {
      setActiveTableType(mode)
    }
  }

  // Interactive Drill-Down Inspector States
  const [inspectedCell, setInspectedCell] = useState<{
    cell: BenchmarkTableCell
    row: BenchmarkTableInstanceRow
  } | null>(null)
  const [inspectedInstanceRow, setInspectedInstanceRow] =
    useState<BenchmarkTableInstanceRow | null>(null)
  const [inspectedPairwiseCell, setInspectedPairwiseCell] = useState<PairwiseMatrixCell | null>(
    null
  )

  // Sync external initial props when navigated from Data Explorer test advisor
  useEffect(() => {
    if (initialTestType) setTestType(initialTestType)
  }, [initialTestType])

  useEffect(() => {
    if (initialTableType) {
      setViewMode(initialTableType)
      setActiveTableType(initialTableType)
    }
  }, [initialTableType])

  useEffect(() => {
    if (initialMetric && availableMetrics.includes(initialMetric)) {
      setSelectedMetric(initialMetric)
    } else if (!selectedMetric && availableMetrics.length > 0) {
      setSelectedMetric(availableMetrics[0])
    }
  }, [initialMetric, availableMetrics, selectedMetric])

  const activeMetric =
    selectedMetric && availableMetrics.includes(selectedMetric)
      ? selectedMetric
      : availableMetrics[0] || ''

  const buildQueryParams = useCallback((): StatisticalTableQueryParams => {
    return {
      metric: activeMetric || undefined,
      table_type: activeTableType,
      test_type: testType,
      posthoc_correction: posthocCorrection,
      summary_stat: summaryStat,
      reference_algorithm: referenceAlgorithm || undefined,
      algorithms_filter: selectedAlgorithms.length >= 2 ? selectedAlgorithms : undefined,
      instances_filter: selectedInstances.length >= 1 ? selectedInstances : undefined,
      alpha,
      precision: 4,
      latex_document_mode: latexDocumentMode,
      latex_notation: latexNotation,
    }
  }, [
    activeMetric,
    activeTableType,
    testType,
    posthocCorrection,
    summaryStat,
    referenceAlgorithm,
    selectedAlgorithms,
    selectedInstances,
    alpha,
    latexDocumentMode,
    latexNotation,
  ])

  const fetchTable = useCallback(async () => {
    if (!apiOnline || (!selectedDatasetFilename && !rawCsv)) return
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const params = buildQueryParams()
      const res = selectedDatasetFilename
        ? await apiClient.generateTableFromPath(selectedDatasetFilename, params)
        : await apiClient.generateTableFromCsv(rawCsv || '', params)
      setTableData(res)
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to generate statistical benchmark table.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [apiOnline, selectedDatasetFilename, rawCsv, buildQueryParams])

  useEffect(() => {
    fetchTable()
  }, [fetchTable])

  const handleExport = async (format: TableExportFormat) => {
    if (!apiOnline || (!selectedDatasetFilename && !rawCsv)) return
    setIsExporting(format)
    try {
      const baseParams = buildQueryParams()
      const exportParams: StatisticalTableQueryParams = {
        ...baseParams,
        pdf_title: pdfTitle.trim() || undefined,
        pdf_caption: pdfCaption.trim() || undefined,
        pdf_theme: pdfTheme,
        pdf_orientation: pdfOrientation,
        pdf_font_size: pdfFontSize,
        pdf_highlight_best: pdfHighlightBest,
        pdf_show_zebra: pdfShowZebra,
        pdf_grid_style: pdfGridStyle,
      }
      const blob = selectedDatasetFilename
        ? await apiClient.exportTableFromPath(selectedDatasetFilename, format, exportParams)
        : await apiClient.exportTableFromCsv(rawCsv || '', format, exportParams)

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
      a.download = `saes_${activeMetric || 'benchmark'}_${testType}_${activeTableType}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      setIsExportDialogOpen(false)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}.`)
    } finally {
      setIsExporting(null)
    }
  }

  const handleGeneratePdfPreview = async () => {
    if (!apiOnline || (!selectedDatasetFilename && !rawCsv)) return
    setIsPreviewLoading(true)
    try {
      const baseParams = buildQueryParams()
      const exportParams: StatisticalTableQueryParams = {
        ...baseParams,
        pdf_title: pdfTitle.trim() || undefined,
        pdf_caption: pdfCaption.trim() || undefined,
        pdf_theme: pdfTheme,
        pdf_orientation: pdfOrientation,
        pdf_font_size: pdfFontSize,
        pdf_highlight_best: pdfHighlightBest,
        pdf_show_zebra: pdfShowZebra,
        pdf_grid_style: pdfGridStyle,
      }
      const blob = selectedDatasetFilename
        ? await apiClient.exportTableFromPath(selectedDatasetFilename, 'pdf', exportParams)
        : await apiClient.exportTableFromCsv(rawCsv || '', 'pdf', exportParams)

      if (pdfPreviewBlobUrl) {
        URL.revokeObjectURL(pdfPreviewBlobUrl)
      }
      const url = URL.createObjectURL(blob)
      setPdfPreviewBlobUrl(url)
      setPdfPreviewTab('vector')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate PDF preview.')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleCopyCode = (kind: 'latex' | 'markdown') => {
    if (!tableData) return
    const text = kind === 'latex' ? tableData.latex_preview : tableData.markdown_preview
    navigator.clipboard.writeText(text)
    setCopiedCode(kind)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const toggleAlgorithmFilter = (alg: string) => {
    setSelectedAlgorithms((prev) => {
      const base = prev.length === 0 ? [...availableAlgorithms] : [...prev]
      if (base.includes(alg)) {
        if (base.length <= 2) return base // require at least 2 algorithms
        return base.filter((x) => x !== alg)
      }
      return [...base, alg]
    })
  }

  const toggleInstanceFilter = (inst: string) => {
    setSelectedInstances((prev) => {
      const base = prev.length === 0 ? [...availableInstances] : [...prev]
      if (base.includes(inst)) {
        if (base.length <= 1) return base
        return base.filter((x) => x !== inst)
      }
      return [...base, inst]
    })
  }

  const summaryMap = useMemo(() => {
    const map: Record<string, StatisticalTableResponse['algorithm_summaries'][0]> = {}
    tableData?.algorithm_summaries.forEach((s) => {
      map[s.algorithm] = s
    })
    return map
  }, [tableData])

  const activeFilterCount =
    (selectedAlgorithms.length > 0 ? 1 : 0) + (selectedInstances.length > 0 ? 1 : 0)

  return (
    <div className="space-y-6">
      {/* 1. CLEAN WORKBENCH HEADER & CONTROLS */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs p-5 space-y-4">
        {/* Top Navigation Row: View Tabs + Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectViewMode('instance_algorithm')}
              title="Compares algorithm performance across individual benchmark instances against baseline"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'instance_algorithm'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Instance Comparison</span>
              <span className="text-[10px] opacity-75 font-normal">(+ / ≈ / − vs Ref)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectViewMode('pairwise_matrix')}
              title="Head-to-head statistical tests & effect sizes between all algorithm pairs"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'pairwise_matrix'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Pairwise Matrix</span>
              <span className="text-[10px] opacity-75 font-normal">(1 vs 1)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectViewMode('omnibus_posthoc')}
              title="Friedman & ANOVA multi-group omnibus tests, average ranks, and critical differences"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'omnibus_posthoc'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Global Rankings &amp; Post-Hoc</span>
              <span className="text-[10px] opacity-75 font-normal">(Omnibus &amp; CD)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectViewMode('latex_code')}
              title="Generate copyable publication-grade LaTeX tables and Markdown previews"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'latex_code'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Publication Code</span>
              <span className="text-[10px] opacity-75 font-normal">(LaTeX &amp; MD)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={fetchTable}
              disabled={isLoading}
              className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Recompute statistical table"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`}
              />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 px-3 text-xs gap-1.5 font-medium cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              {showFilters ? 'Hide Configuration' : 'Configure & Filter'}
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isExporting !== null || !tableData}
              onClick={() => setIsExportDialogOpen(true)}
              className="h-9 px-4 text-xs gap-1.5 font-semibold shadow-xs cursor-pointer"
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

        {/* Primary Controls Row: Clean 4-column layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Evaluation Metric
            </label>
            <select
              value={activeMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {availableMetrics.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-primary" />
              Statistical Hypothesis Test
            </label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as StatisticalTestType)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <optgroup label="Automated Selection">
                {TEST_OPTIONS.filter((o) => o.group === 'Automated').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.shortLabel}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Non-Parametric Tests (Outlier Robust / Non-Normal)">
                {TEST_OPTIONS.filter((o) => o.group === 'Non-Parametric').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.shortLabel}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Parametric Tests (Normal Distributions)">
                {TEST_OPTIONS.filter((o) => o.group === 'Parametric').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.shortLabel}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="text-[11px] text-muted-foreground truncate">
              {TEST_OPTIONS.find((o) => o.value === testType)?.desc}
            </p>
          </div>

          {viewMode === 'pairwise_matrix' ? (
            <div className="space-y-1.5 opacity-60">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Control Baseline</span>
                <span className="text-[10px] text-muted-foreground font-normal lowercase">
                  (not used in 1vs1 matrix)
                </span>
              </label>
              <select
                disabled
                className="h-9 w-full rounded-lg border border-input bg-muted/50 px-3 text-xs font-mono text-muted-foreground cursor-not-allowed"
              >
                <option>All-Pairs Matrix Evaluated</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Control Baseline</span>
                <span className="text-[10px] text-primary font-normal lowercase">
                  (for + / ≈ / −)
                </span>
              </label>
              <select
                value={referenceAlgorithm}
                onChange={(e) => setReferenceAlgorithm(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">Auto (#1 Friedman Rank)</option>
                {availableAlgorithms.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Collapsible Secondary Options & Subset Filters */}
        {showFilters && (
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-4 text-xs">
            {/* Row 1: Statistical Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-border/50">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Multiple Comparison Correction (FWER / FDR)</span>
                  <span className="text-[10px] text-muted-foreground font-normal lowercase">
                    (pairwise &amp; post-hoc)
                  </span>
                </label>
                <select
                  value={posthocCorrection}
                  onChange={(e) => setPosthocCorrection(e.target.value as PostHocCorrectionType)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {CORRECTION_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.shortLabel}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground truncate">
                  {CORRECTION_OPTIONS.find((c) => c.value === posthocCorrection)?.desc}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Summary Statistic Format</span>
                  <span className="text-[10px] text-muted-foreground font-normal lowercase">
                    (instance comparison cells)
                  </span>
                </label>
                <select
                  value={summaryStat}
                  onChange={(e) => setSummaryStat(e.target.value as SummaryStatMode)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {SUMMARY_STAT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.shortLabel}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground truncate">
                  {SUMMARY_STAT_OPTIONS.find((s) => s.value === summaryStat)?.desc}
                </p>
              </div>
            </div>

            {/* Row 2: Algorithm Subsetting Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground text-[11px] uppercase flex items-center gap-1.5">
                  <Filter className="w-3 h-3" />
                  Included Algorithms (
                  {selectedAlgorithms.length === 0
                    ? availableAlgorithms.length
                    : selectedAlgorithms.length}{' '}
                  of {availableAlgorithms.length} active):
                </span>
                {selectedAlgorithms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAlgorithms([])}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    Select All ({availableAlgorithms.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableAlgorithms.map((alg) => {
                  const isActive =
                    selectedAlgorithms.length === 0 || selectedAlgorithms.includes(alg)
                  return (
                    <button
                      key={alg}
                      type="button"
                      onClick={() => toggleAlgorithmFilter(alg)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-primary/15 text-primary border-primary/40 font-semibold'
                          : 'bg-background text-muted-foreground border-border/60 opacity-60'
                      }`}
                    >
                      {alg}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Row 3: Instance Subsetting Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground text-[11px] uppercase">
                  Included Benchmark Instances (
                  {selectedInstances.length === 0
                    ? availableInstances.length
                    : selectedInstances.length}{' '}
                  of {availableInstances.length} active):
                </span>
                {selectedInstances.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedInstances([])}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    Select All ({availableInstances.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableInstances.map((inst) => {
                  const isActive =
                    selectedInstances.length === 0 || selectedInstances.includes(inst)
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => toggleInstanceFilter(inst)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/40 font-semibold'
                          : 'bg-background text-muted-foreground border-border/60 opacity-60'
                      }`}
                    >
                      {inst}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground italic">
              <Sparkles className="w-3 h-3 text-primary shrink-0" />
              <span>
                Filters and configurations automatically recalculate all hypothesis tests, p-values,
                and effect sizes.
              </span>
            </div>
          </div>
        )}

        {/* Compact Single-Row Statistical Resolution & KPI Strip */}
        {tableData && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const bestSum = [...tableData.algorithm_summaries].sort(
                  (a, b) => a.avg_rank - b.avg_rank
                )[0]
                return bestSum ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono text-xs">
                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                    #1: <strong>{bestSum.algorithm}</strong> (Rank {bestSum.avg_rank.toFixed(2)})
                  </span>
                ) : null
              })()}

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/70 text-foreground font-mono text-xs">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Friedman χ² = <strong>{formatNum(tableData.friedman_stat, 2)}</strong> (p ={' '}
                {formatP(tableData.friedman_p_value)})
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Test: <strong>{tableData.resolved_pairwise_test}</strong>
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-muted-foreground font-mono text-xs">
                CD = {formatNum(tableData.nemenyi_cd, 3)} •{' '}
                {tableData.maximize ? 'Direction: Maximize' : 'Direction: Minimize'} (α ={' '}
                {tableData.alpha})
              </span>
            </div>

            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Click any cell or row to inspect distributions and p-values
            </span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && !tableData && (
        <div className="rounded-2xl border border-border/70 bg-card p-14 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">
            Computing statistical tests, post-hoc p-value corrections, and effect sizes...
          </p>
        </div>
      )}

      {/* =====================================================================
          VIEW MODE 1: INSTANCE × ALGORITHM BENCHMARK TABLE
         ===================================================================== */}
      {tableData && viewMode === 'instance_algorithm' && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Instance × Algorithm Benchmark Table</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {tableData.metric}
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                <strong className="text-emerald-600 dark:text-emerald-400">Bold emerald</strong> =
                Best per instance • <strong className="text-emerald-500">+</strong> significantly
                better than <code className="font-mono">{tableData.reference_algorithm}</code> •{' '}
                <strong className="text-rose-500">−</strong> significantly worse •{' '}
                <strong>≈</strong> no significant difference.
              </p>
            </div>

            {/* Smart Visual Lens Switcher for Instance × Algorithm Table */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setInstanceLens('value_symbol')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  instanceLens === 'value_symbol'
                    ? 'bg-card text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Value + Symbol
              </button>
              <button
                type="button"
                onClick={() => setInstanceLens('symbol_only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  instanceLens === 'symbol_only'
                    ? 'bg-card text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Symbols Only (+/≈/−)
              </button>
              <button
                type="button"
                onClick={() => setInstanceLens('rank_only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  instanceLens === 'rank_only'
                    ? 'bg-card text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ranks (#Rank)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="py-3.5 px-4 font-bold text-xs">Instance</TableHead>
                  {tableData.algorithms.map((alg) => {
                    const isRef = alg === tableData.reference_algorithm
                    const s = summaryMap[alg]
                    return (
                      <TableHead key={alg} className="py-3.5 px-4 text-center font-mono text-xs">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-bold text-foreground inline-flex items-center gap-1.5">
                            {alg}
                            {isRef && (
                              <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-semibold">
                                Ref
                              </span>
                            )}
                          </span>
                          {s && (
                            <span className="text-[11px] text-muted-foreground font-normal">
                              Rank #{s.rank_position} ({s.avg_rank.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </TableHead>
                    )
                  })}
                  <TableHead className="py-3.5 px-4 text-center font-bold text-xs">
                    Omnibus p-value
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {tableData.instance_rows.map((row) => (
                  <TableRow
                    key={row.instance}
                    className="hover:bg-muted/25 transition-colors group"
                  >
                    <TableCell
                      onClick={() => setInspectedInstanceRow(row)}
                      className="py-3 px-4 font-mono font-bold text-xs text-foreground cursor-pointer hover:text-primary"
                      title={`Normality: ${row.normality_passed_count}/${row.total_groups} groups normal • Click to inspect instance assumptions`}
                    >
                      {row.instance}
                    </TableCell>

                    {tableData.algorithms.map((alg) => {
                      const cell = row.cells[alg]
                      if (!cell) {
                        return (
                          <TableCell key={alg} className="py-3 px-4 text-center font-mono text-xs">
                            —
                          </TableCell>
                        )
                      }

                      const symColor =
                        cell.significance_symbol === '+'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : cell.significance_symbol === '−'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : cell.significance_symbol === 'ref'
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-muted text-muted-foreground border-border'

                      return (
                        <TableCell
                          key={alg}
                          onClick={() => setInspectedCell({ cell, row })}
                          className={`py-3 px-4 text-center font-mono text-xs cursor-pointer transition-all hover:ring-1 hover:ring-primary/50 ${
                            cell.is_best
                              ? 'bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300'
                              : cell.is_second_best
                                ? 'bg-sky-500/5 underline decoration-sky-500/60 underline-offset-4'
                                : ''
                          }`}
                          title={`${alg} on ${row.instance}: Mean=${formatNum(cell.mean)}, SD=${formatNum(cell.std)}, Rank=#${cell.avg_rank.toFixed(1)}, p_adj=${formatP(cell.pairwise_p_adjusted)}, A12=${cell.a12?.toFixed(2) ?? '—'}`}
                        >
                          {instanceLens === 'symbol_only' ? (
                            <span
                              className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-md text-xs font-bold border ${symColor}`}
                            >
                              {cell.significance_symbol}
                            </span>
                          ) : instanceLens === 'rank_only' ? (
                            <div className="inline-flex items-center justify-center gap-2">
                              <span className="font-bold">#{cell.avg_rank.toFixed(1)}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${symColor}`}
                              >
                                {cell.significance_symbol}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-2">
                              <span>
                                {tableData.summary_stat === 'median_iqr'
                                  ? `${formatNum(cell.median)} (${formatNum(cell.iqr)})`
                                  : `${formatNum(cell.mean)} ± ${formatNum(cell.std)}`}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${symColor}`}
                              >
                                {cell.significance_symbol}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      )
                    })}

                    <TableCell
                      onClick={() => setInspectedInstanceRow(row)}
                      className="py-3 px-4 text-center font-mono text-xs cursor-pointer hover:bg-primary/5"
                      title={`${row.omnibus_test_name}: Stat=${row.omnibus_statistic.toFixed(2)}, ${row.omnibus_effect_size_name}=${row.omnibus_effect_size_value.toFixed(3)} (${row.omnibus_effect_size_magnitude})`}
                    >
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          row.omnibus_significant
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        p = {formatP(row.omnibus_p_value)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {/* FOOTER ROW 1: AVERAGE FRIEDMAN RANK */}
                <TableRow className="bg-muted/50 font-bold border-t-2 border-border">
                  <TableCell className="py-3.5 px-4 text-xs font-bold text-foreground">
                    Average Friedman Rank
                  </TableCell>
                  {tableData.algorithms.map((alg) => {
                    const s = summaryMap[alg]
                    const isFirst = s?.rank_position === 1
                    return (
                      <TableCell
                        key={alg}
                        className={`py-3.5 px-4 text-center font-mono text-xs ${
                          isFirst ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''
                        }`}
                      >
                        {s ? `${s.avg_rank.toFixed(2)} (#${s.rank_position})` : '—'}
                      </TableCell>
                    )
                  })}
                  <TableCell className="py-3.5 px-4 text-center font-mono text-xs text-primary">
                    p = {formatP(tableData.friedman_p_value)}
                  </TableCell>
                </TableRow>

                {/* FOOTER ROW 2: WIN / TIE / LOSS (+ / ≈ / −) VS REFERENCE */}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell className="py-3.5 px-4 text-xs font-bold text-foreground">
                    + / ≈ / − vs {tableData.reference_algorithm}
                  </TableCell>
                  {tableData.algorithms.map((alg) => {
                    const s = summaryMap[alg]
                    if (alg === tableData.reference_algorithm) {
                      return (
                        <TableCell
                          key={alg}
                          className="py-3.5 px-4 text-center font-mono text-xs text-primary font-bold"
                        >
                          Control (Ref)
                        </TableCell>
                      )
                    }
                    return (
                      <TableCell key={alg} className="py-3.5 px-4 text-center font-mono text-xs">
                        {s ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              +{s.wins}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-muted-foreground">≈{s.ties}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              −{s.losses}
                            </span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground">
                    CD = {formatNum(tableData.nemenyi_cd, 3)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW MODE 2: PAIRWISE 1vs1 COMPARISON MATRIX (CASE-BY-CASE & GENERAL)
         ===================================================================== */}
      {tableData && viewMode === 'pairwise_matrix' && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs space-y-0">
          {/* Header with Switcher between Case-by-Case (+/=/- per instance) and General Summary */}
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>
                  {tableData.metric} — {tableData.resolved_pairwise_test} 1vs1 Table
                </span>
                <Badge variant="outline" className="font-mono text-xs">
                  {tableData.instances.length} Instances
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                {pairwiseLens === 'case_by_case' ? (
                  <>
                    Each symbol in the cell represents an instance in order:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">+</strong>{' '}
                    row algorithm performs better with statistical confidence,{' '}
                    <strong className="text-rose-600 dark:text-rose-400 font-mono">-</strong> row
                    algorithm performs worse with statistical confidence,{' '}
                    <strong className="font-mono text-foreground">=</strong> differences are not
                    significant (α = {tableData.alpha}).
                  </>
                ) : (
                  <>
                    Global overview comparing <strong>Row Algorithm</strong> vs{' '}
                    <strong>Column Algorithm</strong> across all instances (+Wins / =Ties / -Losses,
                    adjusted p-value, and Vargha-Delaney A12 effect size).
                  </>
                )}
              </p>
            </div>

            {/* Mode Switcher: Case-by-Case vs General Level */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1 self-start lg:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setPairwiseLens('case_by_case')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  pairwiseLens === 'case_by_case'
                    ? 'bg-card text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-primary" />
                Case by Case (+ / = / - Sequence)
              </button>
              <button
                type="button"
                onClick={() => setPairwiseLens('general_summary')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  pairwiseLens === 'general_summary'
                    ? 'bg-card text-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-sky-500" />
                General Level (Global Summary)
              </button>
            </div>
          </div>

          {/* Interactive Instances Order Strip (for Case-by-Case Inspection) */}
          {pairwiseLens === 'case_by_case' && tableData.instances.length > 0 && (
            <div className="px-5 py-3 border-b border-border/50 bg-muted/10 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider mr-1">
                Instances (in order):
              </span>
              <button
                type="button"
                onClick={() => setFocusedInstanceIdx(null)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-colors cursor-pointer ${
                  focusedInstanceIdx === null
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-background text-muted-foreground border-border/70 hover:text-foreground'
                }`}
              >
                All ({tableData.instances.length})
              </button>
              {tableData.instances.map((inst, idx) => {
                const isSelected = focusedInstanceIdx === idx
                return (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => setFocusedInstanceIdx(isSelected ? null : idx)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                        : 'bg-background text-foreground border-border/70 hover:border-primary/50'
                    }`}
                    title={`Click to focus on problem #${idx + 1}: ${inst}`}
                  >
                    <span className="text-muted-foreground mr-1">#{idx + 1}</span>
                    {inst}
                  </button>
                )
              })}
            </div>
          )}

          {/* SUB-MODE A: CASE-BY-CASE 1vs1 UPPER-TRIANGULAR SYMBOL MATRIX */}
          {pairwiseLens === 'case_by_case' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-3.5 px-4 font-bold text-xs border-r border-border/60">
                      Algorithm (Row vs Col)
                    </TableHead>
                    {(tableData.algorithms.length > 1
                      ? tableData.algorithms.slice(1)
                      : tableData.algorithms
                    ).map((colAlg) => (
                      <TableHead
                        key={colAlg}
                        className="py-3.5 px-4 text-center font-mono font-bold text-xs border-r border-border/40 last:border-r-0"
                      >
                        {colAlg}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(tableData.algorithms.length > 1
                    ? tableData.algorithms.slice(0, -1)
                    : tableData.algorithms
                  ).map((rowAlg, rIdx) => {
                    const rowCells = tableData.pairwise_matrix[rIdx] || []
                    const colIndices =
                      tableData.algorithms.length > 1
                        ? tableData.algorithms.slice(1).map((_, idx) => idx + 1)
                        : [0]

                    return (
                      <TableRow key={rowAlg} className="hover:bg-muted/20">
                        <TableCell className="py-4 px-4 font-mono font-bold text-xs bg-muted/20 border-r border-border/60 whitespace-nowrap">
                          {rowAlg}
                        </TableCell>

                        {colIndices.map((cIdx) => {
                          const colAlg = tableData.algorithms[cIdx] || `col_${cIdx}`
                          if (cIdx <= rIdx) {
                            return (
                              <TableCell
                                key={colAlg}
                                className="py-4 px-4 text-center font-mono text-xs bg-muted/10 text-muted-foreground/30 border-r border-border/40 last:border-r-0"
                              >
                                {/* Lower triangular blank cell matching LaTeX 1vs1 table */}
                              </TableCell>
                            )
                          }

                          const cell = rowCells[cIdx]
                          if (!cell) {
                            return (
                              <TableCell
                                key={colAlg}
                                className="py-4 px-4 text-center font-mono text-xs border-r border-border/40 last:border-r-0"
                              >
                                —
                              </TableCell>
                            )
                          }

                          const breakdown = cell.instance_breakdown || []
                          const focusedItem =
                            focusedInstanceIdx !== null ? breakdown[focusedInstanceIdx] : null

                          return (
                            <TableCell
                              key={colAlg}
                              onClick={() => setInspectedPairwiseCell(cell)}
                              className="py-3.5 px-4 text-center font-mono text-xs cursor-pointer transition-all hover:bg-primary/5 border-r border-border/40 last:border-r-0"
                              title={`Click to inspect ${rowAlg} vs ${colAlg} across all ${breakdown.length} instances`}
                            >
                              {focusedItem ? (
                                /* Focused Single-Instance Detail View inside 1vs1 Cell */
                                <div className="flex flex-col items-center gap-1.5">
                                  <div className="inline-flex items-center gap-1.5">
                                    <span className="text-[11px] text-muted-foreground">
                                      {focusedItem.instance}:
                                    </span>
                                    <span
                                      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-extrabold border ${
                                        focusedItem.symbol === '+'
                                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                                          : focusedItem.symbol === '-'
                                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40'
                                            : 'bg-muted text-foreground border-border'
                                      }`}
                                    >
                                      {focusedItem.symbol}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {formatNum(focusedItem.mean_row, 3)} vs{' '}
                                    {formatNum(focusedItem.mean_col, 3)} (p ={' '}
                                    {formatP(focusedItem.p_value)})
                                  </div>
                                </div>
                              ) : (
                                /* Full Instance Symbol Sequence Strip (\texttt{=-+---------}) */
                                <div className="flex flex-col items-center gap-2">
                                  <div className="inline-flex flex-wrap items-center justify-center gap-0.5 px-2 py-1 rounded-lg bg-muted/50 border border-border/70">
                                    {breakdown.length > 0 ? (
                                      breakdown.map((ib, idx) => {
                                        const sym = ib.symbol || '='
                                        const symClass =
                                          sym === '+'
                                            ? 'text-emerald-600 dark:text-emerald-400 font-extrabold hover:bg-emerald-500/20'
                                            : sym === '-'
                                              ? 'text-rose-600 dark:text-rose-400 font-extrabold hover:bg-rose-500/20'
                                              : 'text-muted-foreground hover:bg-muted'
                                        return (
                                          <span
                                            key={ib.instance}
                                            title={`#${idx + 1} ${ib.instance}: ${rowAlg} (${formatNum(ib.mean_row, 3)}) vs ${colAlg} (${formatNum(ib.mean_col, 3)}) → [${sym}] (p = ${formatP(ib.p_value)})`}
                                            className={`inline-flex items-center justify-center w-4 h-5 rounded text-xs font-mono transition-colors ${symClass}`}
                                          >
                                            {sym}
                                          </span>
                                        )
                                      })
                                    ) : (
                                      <span className="tracking-widest text-xs font-mono">
                                        {cell.instance_symbols || '—'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Compact +Wins / =Ties / -Losses Summary Pill */}
                                  <div className="inline-flex items-center gap-2 text-[11px] font-mono">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                      +{cell.sig_wins ?? cell.wins}
                                    </span>
                                    <span className="text-muted-foreground">
                                      ={cell.sig_ties ?? cell.ties}
                                    </span>
                                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                                      -{cell.sig_losses ?? cell.losses}
                                    </span>
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
          ) : (
            /* SUB-MODE B: GENERAL GLOBAL SUMMARY MATRIX (k × k) */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-3.5 px-4 font-bold text-xs">Row vs Column</TableHead>
                    {tableData.algorithms.map((alg) => (
                      <TableHead
                        key={alg}
                        className="py-3.5 px-4 text-center font-mono font-bold text-xs"
                      >
                        {alg}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.pairwise_matrix.map((rowCells, rIdx) => {
                    const rowAlg = tableData.algorithms[rIdx] || ''
                    return (
                      <TableRow key={rowAlg}>
                        <TableCell className="py-4 px-4 font-mono font-bold text-xs bg-muted/20">
                          {rowAlg}
                        </TableCell>
                        {rowCells.map((cell) => {
                          if (cell.direction === 'self') {
                            return (
                              <TableCell
                                key={cell.algo_col}
                                className="py-4 px-4 text-center font-mono text-xs bg-muted/10 text-muted-foreground"
                              >
                                —
                              </TableCell>
                            )
                          }

                          const cellStyle =
                            cell.direction === 'better'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                              : cell.direction === 'worse'
                                ? 'bg-rose-500/10 hover:bg-rose-500/15'
                                : 'hover:bg-muted/40'

                          return (
                            <TableCell
                              key={cell.algo_col}
                              onClick={() => setInspectedPairwiseCell(cell)}
                              className={`py-3.5 px-4 text-center font-mono text-xs cursor-pointer transition-all ${cellStyle}`}
                              title={`A12 = ${cell.a12.toFixed(3)} (${cell.effect_size_magnitude}) • Click for instance breakdown`}
                            >
                              <div className="flex flex-col items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                                    cell.direction === 'better'
                                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                                      : cell.direction === 'worse'
                                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40'
                                        : 'bg-muted text-muted-foreground border-border'
                                  }`}
                                >
                                  {cell.symbol} p = {formatP(cell.p_adjusted)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  +{cell.sig_wins ?? cell.wins} / ={cell.sig_ties ?? cell.ties} / -
                                  {cell.sig_losses ?? cell.losses} • A12={cell.a12.toFixed(2)}
                                </span>
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          VIEW MODE 3: FRIEDMAN & OMNIBUS POST-HOC RANKING TABLE
         ===================================================================== */}
      {tableData && viewMode === 'omnibus_posthoc' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">
                Multi-Problem Friedman Ranking &amp; Post-Hoc Control Table (Reference:{' '}
                <span className="text-primary font-mono">{tableData.reference_algorithm}</span>)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Average Friedman ranks, z-statistics, adjusted p-values (Holm / Bonferroni), global
                Wilcoxon Signed-Rank p-values, and Bayesian P(Best).
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-3.5 px-4 text-xs font-bold">Rank</TableHead>
                    <TableHead className="py-3.5 px-4 text-xs font-bold">Algorithm</TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Avg. Rank
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Global Mean
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Friedman z
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      p (Holm)
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Wilcoxon p (Holm)
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Bayesian P(Best)
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      + / ≈ / − vs Ref
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...tableData.algorithm_summaries]
                    .sort((a, b) => a.avg_rank - b.avg_rank)
                    .map((s) => {
                      const isRef = s.algorithm === tableData.reference_algorithm
                      const holmSig =
                        s.friedman_p_holm !== null &&
                        s.friedman_p_holm !== undefined &&
                        s.friedman_p_holm < tableData.alpha
                      return (
                        <TableRow
                          key={s.algorithm}
                          className={isRef ? 'bg-primary/5 font-semibold' : 'hover:bg-muted/20'}
                        >
                          <TableCell className="py-3 px-4 font-mono text-xs font-bold">
                            #{s.rank_position}
                          </TableCell>
                          <TableCell className="py-3 px-4 font-mono text-xs font-bold text-foreground">
                            {s.algorithm}{' '}
                            {isRef && (
                              <Badge variant="default" className="ml-1.5 text-[10px]">
                                Control
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-xs font-bold">
                            {s.avg_rank.toFixed(3)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-xs">
                            {formatNum(s.mean_across_instances)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-xs">
                            {s.friedman_z_vs_ref !== null ? s.friedman_z_vs_ref.toFixed(3) : '—'}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-xs">
                            {isRef ? (
                              '—'
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold border ${
                                  holmSig
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {formatP(s.friedman_p_holm)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-xs">
                            {formatP(s.global_wilcoxon_p_holm)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-xs">
                            {s.bayesian_prob_best !== null
                              ? `${(s.bayesian_prob_best * 100).toFixed(1)}%`
                              : '—'}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-xs">
                            {isRef ? 'Reference' : `+${s.wins} / ≈${s.ties} / −${s.losses}`}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Sub-Table B: Per-Instance Omnibus & Assumption Verification */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">
                Per-Instance Omnibus Test &amp; Assumption Verification Table
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-3.5 px-4 text-xs font-bold">Instance</TableHead>
                    <TableHead className="py-3.5 px-4 text-xs font-bold">
                      Applied Omnibus Test
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Statistic (df)
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      p-value
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Effect Size
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Normality (Shapiro-Wilk)
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Homoscedasticity (Levene)
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-xs font-bold">
                      Best Algorithm
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.instance_rows.map((row) => (
                    <TableRow
                      key={row.instance}
                      onClick={() => setInspectedInstanceRow(row)}
                      className="cursor-pointer hover:bg-muted/30"
                    >
                      <TableCell className="py-3 px-4 font-mono font-bold text-xs">
                        {row.instance}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs font-medium text-primary">
                        {row.omnibus_test_name}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-xs">
                        {row.omnibus_statistic.toFixed(3)} {row.omnibus_df}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold border ${
                            row.omnibus_significant
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {formatP(row.omnibus_p_value)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-xs">
                        {row.omnibus_effect_size_value.toFixed(3)} (
                        {row.omnibus_effect_size_magnitude})
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] border ${
                            row.normality_passed_count === row.total_groups
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {row.normality_passed_count}/{row.total_groups} Normal
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] border ${
                            row.levene_passed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          p = {formatP(row.levene_p_value)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {row.best_algorithm}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW MODE 4: LATEX & MARKDOWN CODE PREVIEW
         ===================================================================== */}
      {tableData && viewMode === 'latex_code' && (
        <div className="space-y-4">
          {/* Config Bar for LaTeX Generation: Structure, Document Mode & Number Notation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-4 py-3 rounded-xl border border-border/70 bg-muted/20 text-xs">
            {/* Table Type */}
            <div className="space-y-1.5">
              <span className="font-semibold text-muted-foreground block">Table Structure:</span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'pairwise_matrix', label: '1vs1 Matrix' },
                    { id: 'instance_algorithm', label: 'Instance × Algo' },
                    { id: 'omnibus_posthoc', label: 'Friedman / Post-Hoc' },
                  ] as { id: TableType; label: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTableType(t.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      activeTableType === t.id
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-card text-muted-foreground hover:text-foreground border border-border/60'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Mode */}
            <div className="space-y-1.5">
              <span className="font-semibold text-muted-foreground block">Document Wrapping:</span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    {
                      id: 'standalone',
                      label: 'Standalone (.tex)',
                      title:
                        'Ready to compile in Overleaf/TeXShop with \\documentclass and packages',
                    },
                    {
                      id: 'snippet',
                      label: 'Paper Snippet',
                      title: 'Table environment snippet for inclusion in existing papers',
                    },
                  ] as { id: LatexDocumentMode; label: string; title: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    title={m.title}
                    onClick={() => setLatexDocumentMode(m.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      latexDocumentMode === m.id
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-card text-muted-foreground hover:text-foreground border border-border/60'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notation Style */}
            <div className="space-y-1.5">
              <span className="font-semibold text-muted-foreground block">Number Notation:</span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    {
                      id: 'scientific',
                      label: 'Scientific ($e$)',
                      title: 'Scientific notation with subscript SD: $2.55\\text{e-}02_{...}$',
                    },
                    {
                      id: 'siunitx',
                      label: 'siunitx (\\SI)',
                      title: 'LaTeX siunitx package format: \\SI{2.55e-2}{}',
                    },
                    {
                      id: 'standard',
                      label: 'Decimal ($\\pm$)',
                      title: 'Standard decimal format: $0.0255 \\pm 0.0033$',
                    },
                  ] as { id: LatexNotation; label: string; title: string }[]
                ).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    title={n.title}
                    onClick={() => setLatexNotation(n.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      latexNotation === n.id
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-card text-muted-foreground hover:text-foreground border border-border/60'
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LaTeX Source */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border/60 bg-muted/40 flex items-center justify-between">
                <span className="text-xs font-bold font-mono flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-primary" />
                  LaTeX Publication Source ({activeTableType})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCode('latex')}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  {copiedCode === 'latex' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy LaTeX
                    </>
                  )}
                </Button>
              </div>
              <pre className="p-4 text-[11px] font-mono overflow-x-auto bg-zinc-950 text-zinc-100 flex-1 leading-relaxed">
                {tableData.latex_preview}
              </pre>
            </div>

            {/* Markdown Source */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border/60 bg-muted/40 flex items-center justify-between">
                <span className="text-xs font-bold font-mono flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-sky-500" />
                  Markdown Benchmark Table
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCode('markdown')}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  {copiedCode === 'markdown' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Markdown
                    </>
                  )}
                </Button>
              </div>
              <pre className="p-4 text-[11px] font-mono overflow-x-auto bg-zinc-950 text-zinc-100 flex-1 leading-relaxed">
                {tableData.markdown_preview}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: INTERACTIVE CELL DRILL-DOWN INSPECTOR (Instance × Algorithm)
         ===================================================================== */}
      <Dialog open={!!inspectedCell} onOpenChange={(o) => !o && setInspectedCell(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {inspectedCell && tableData && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm">
                    {inspectedCell.cell.algorithm}
                  </span>
                  <span>on Instance</span>
                  <span className="px-2 py-0.5 rounded bg-muted font-mono text-sm">
                    {inspectedCell.cell.instance}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    (Metric: {tableData.metric})
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Detailed cell distribution, normality check, effect sizes, and pairwise comparison
                  against control algorithm <strong>{tableData.reference_algorithm}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs pt-2">
                <div className="rounded-xl border border-border/70 bg-background p-2">
                  <PlotlyChart
                    data={Object.values(inspectedCell.row.cells).map((c) => ({
                      type: 'box',
                      name: c.algorithm,
                      y: c.raw_values,
                      boxpoints: 'all',
                      jitter: 0.35,
                      pointpos: 0,
                      marker: {
                        color:
                          c.algorithm === inspectedCell.cell.algorithm
                            ? '#2563eb'
                            : c.algorithm === tableData.reference_algorithm
                              ? '#10b981'
                              : '#94a3b8',
                        size: 5,
                      },
                    }))}
                    layout={{
                      height: 240,
                      margin: { t: 28, r: 16, b: 36, l: 48 },
                      title: {
                        text: `Run Distribution on ${inspectedCell.cell.instance} (${tableData.metric})`,
                        font: { size: 12 },
                      },
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'transparent',
                      showlegend: false,
                      yaxis: { title: { text: tableData.metric, font: { size: 11 } } },
                    }}
                    style={{ width: '100%', height: '240px' }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Mean ± SD (n={inspectedCell.cell.n})
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {formatNum(inspectedCell.cell.mean)} ± {formatNum(inspectedCell.cell.std)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Median (IQR)
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {formatNum(inspectedCell.cell.median)} ({formatNum(inspectedCell.cell.iqr)})
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Min / Max Range
                    </span>
                    <span className="font-mono font-bold text-sm">
                      [{formatNum(inspectedCell.cell.min_val)},{' '}
                      {formatNum(inspectedCell.cell.max_val)}]
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Shapiro-Wilk Normality
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        inspectedCell.cell.normality_passed ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      p = {formatP(inspectedCell.cell.shapiro_p_value)} (
                      {inspectedCell.cell.normality_passed ? 'Normal' : 'Non-Normal'})
                    </span>
                  </div>
                </div>

                {!inspectedCell.cell.is_reference && (
                  <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary uppercase text-[11px]">
                        Pairwise Test vs Reference ({tableData.reference_algorithm})
                      </span>
                      <Badge variant="default" className="font-mono text-xs">
                        {inspectedCell.cell.pairwise_test_name}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Statistic:</span>
                        <strong>{formatNum(inspectedCell.cell.pairwise_statistic, 3)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] block">
                          Raw p-value:
                        </span>
                        <strong>{formatP(inspectedCell.cell.pairwise_p_value)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] block">
                          Adjusted p ({tableData.posthoc_correction}):
                        </span>
                        <strong>{formatP(inspectedCell.cell.pairwise_p_adjusted)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] block">
                          Vargha-Delaney A12:
                        </span>
                        <strong>
                          {inspectedCell.cell.a12?.toFixed(3) ?? '—'} (
                          {inspectedCell.cell.effect_size_magnitude})
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 2: INSTANCE OMNIBUS & ASSUMPTIONS INSPECTOR
         ===================================================================== */}
      <Dialog
        open={!!inspectedInstanceRow}
        onOpenChange={(o) => !o && setInspectedInstanceRow(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {inspectedInstanceRow && tableData && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <span>Instance Omnibus &amp; Assumption Diagnostics:</span>
                  <span className="font-mono text-primary">{inspectedInstanceRow.instance}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {inspectedInstanceRow.interpretation}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      {inspectedInstanceRow.omnibus_test_name}
                    </span>
                    <span className="font-mono font-bold text-sm">
                      Stat = {inspectedInstanceRow.omnibus_statistic.toFixed(3)} (p ={' '}
                      {formatP(inspectedInstanceRow.omnibus_p_value)})
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Effect Size ({inspectedInstanceRow.omnibus_effect_size_name})
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {inspectedInstanceRow.omnibus_effect_size_value.toFixed(4)} (
                      {inspectedInstanceRow.omnibus_effect_size_magnitude})
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Levene Homoscedasticity
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        inspectedInstanceRow.levene_passed ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      p = {formatP(inspectedInstanceRow.levene_p_value)} (
                      {inspectedInstanceRow.levene_passed ? 'Equal Var' : 'Heteroscedastic'})
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Algorithm</TableHead>
                        <TableHead className="text-center text-xs">Mean ± SD</TableHead>
                        <TableHead className="text-center text-xs">Median (IQR)</TableHead>
                        <TableHead className="text-center text-xs">Shapiro-Wilk p</TableHead>
                        <TableHead className="text-center text-xs">Skew / Kurt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(inspectedInstanceRow.cells).map((c) => (
                        <TableRow key={c.algorithm}>
                          <TableCell className="font-mono font-bold text-xs">
                            {c.algorithm}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {formatNum(c.mean)} ± {formatNum(c.std)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {formatNum(c.median)} ({formatNum(c.iqr)})
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            <span
                              className={
                                c.normality_passed
                                  ? 'text-emerald-500 font-bold'
                                  : 'text-rose-500 font-bold'
                              }
                            >
                              {formatP(c.shapiro_p_value)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {c.skewness.toFixed(2)} / {c.kurtosis.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 3: PAIRWISE HEAD-TO-HEAD MATRIX CELL INSPECTOR
         ===================================================================== */}
      <Dialog
        open={!!inspectedPairwiseCell}
        onOpenChange={(o) => !o && setInspectedPairwiseCell(null)}
      >
        <DialogContent className="sm:max-w-4xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {inspectedPairwiseCell && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span className="font-mono text-primary">{inspectedPairwiseCell.algo_row}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-mono text-sky-500">{inspectedPairwiseCell.algo_col}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {inspectedPairwiseCell.test_name}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {inspectedPairwiseCell.interpretation}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs pt-2">
                {/* 1vs1 LaTeX Symbol Sequence Banner */}
                {inspectedPairwiseCell.instance_symbols && (
                  <div className="p-3 rounded-xl border border-border/70 bg-muted/30 flex flex-wrap items-center justify-between gap-2 font-mono">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">
                        1vs1 Per-Instance Sequence (\texttt):
                      </span>
                      <span className="text-sm font-bold tracking-widest text-foreground">
                        {inspectedPairwiseCell.instance_symbols}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                        +{inspectedPairwiseCell.sig_wins} Better
                      </span>
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                        ={inspectedPairwiseCell.sig_ties} Tie
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">
                        -{inspectedPairwiseCell.sig_losses} Worse
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Global Adjusted p
                    </span>
                    <span className="font-bold text-sm">
                      {formatP(inspectedPairwiseCell.p_adjusted)} ({inspectedPairwiseCell.symbol})
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Vargha-Delaney A12
                    </span>
                    <span className="font-bold text-sm">
                      {inspectedPairwiseCell.a12.toFixed(3)} (
                      {inspectedPairwiseCell.effect_size_magnitude})
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Cliff&apos;s δ / Cohen&apos;s d
                    </span>
                    <span className="font-bold text-sm">
                      {inspectedPairwiseCell.cliffs_delta.toFixed(2)} /{' '}
                      {inspectedPairwiseCell.cohens_d.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Mean Wins / Ties / Losses
                    </span>
                    <span className="font-bold text-sm">
                      {inspectedPairwiseCell.wins} / {inspectedPairwiseCell.ties} /{' '}
                      {inspectedPairwiseCell.losses}
                    </span>
                  </div>
                </div>

                {inspectedPairwiseCell.prob_row_better !== null && (
                  <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-emerald-500 font-bold">
                        P({inspectedPairwiseCell.algo_row} &gt; {inspectedPairwiseCell.algo_col}) ={' '}
                        {((inspectedPairwiseCell.prob_row_better || 0) * 100).toFixed(1)}%
                      </span>
                      <span className="text-amber-500 font-bold">
                        P(ROPE) = {((inspectedPairwiseCell.prob_rope || 0) * 100).toFixed(1)}%
                      </span>
                      <span className="text-rose-500 font-bold">
                        P({inspectedPairwiseCell.algo_col} &gt; {inspectedPairwiseCell.algo_row}) ={' '}
                        {((inspectedPairwiseCell.prob_col_better || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {inspectedPairwiseCell.instance_breakdown.length > 0 && (
                  <div className="rounded-lg border border-border/60 overflow-hidden max-h-80 overflow-y-auto overflow-x-auto">
                    <Table className="w-full min-w-[700px]">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs w-12 text-center">#</TableHead>
                          <TableHead className="text-xs">Instance</TableHead>
                          <TableHead className="text-center text-xs w-20">1vs1 Sym</TableHead>
                          <TableHead className="text-center text-xs">
                            {inspectedPairwiseCell.algo_row} (Mean ± SD)
                          </TableHead>
                          <TableHead className="text-center text-xs">
                            {inspectedPairwiseCell.algo_col} (Mean ± SD)
                          </TableHead>
                          <TableHead className="text-center text-xs w-24">p-value</TableHead>
                          <TableHead className="text-center text-xs w-28">Winner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inspectedPairwiseCell.instance_breakdown.map((ib, idx) => (
                          <TableRow key={ib.instance} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs text-muted-foreground text-center">
                              #{idx + 1}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-xs whitespace-nowrap">
                              {ib.instance}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-5 rounded font-bold border ${
                                  ib.symbol === '+'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : ib.symbol === '-'
                                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                      : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {ib.symbol || '='}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs whitespace-nowrap">
                              {formatNum(ib.mean_row)} ± {formatNum(ib.std_row)}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs whitespace-nowrap">
                              {formatNum(ib.mean_col)} ± {formatNum(ib.std_col)}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs whitespace-nowrap">
                              {formatP(ib.p_value)}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs font-bold whitespace-nowrap">
                              {ib.symbol === '+' ? (
                                <span className="text-emerald-500">
                                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                                  {inspectedPairwiseCell.algo_row}
                                </span>
                              ) : ib.symbol === '-' ? (
                                <span className="text-rose-500">
                                  {inspectedPairwiseCell.algo_col}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">= Tie</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          DIALOG 4: PUBLICATION TABLE EXPORT & STYLE STUDIO
      ======================================================================== */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Export Statistical Benchmark Table
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Customize presentation styles for publication-ready PDF tables or download in other
              formats (<strong className="font-mono text-foreground">{activeMetric}</strong> •{' '}
              <strong>{tableData?.resolved_pairwise_test || testType}</strong>).
            </DialogDescription>
          </DialogHeader>

          {/* Modal Tab Switcher */}
          <div className="flex items-center gap-2 pt-1 border-b border-border/50 pb-2">
            <button
              type="button"
              onClick={() => setExportModalTab('pdf')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                exportModalTab === 'pdf'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Styled PDF Publication Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setExportModalTab('other')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                exportModalTab === 'other'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Other Formats (Word, LaTeX, CSV, MD, HTML)</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 py-3">
            {exportModalTab === 'pdf' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
                {/* Left Column: Style & Document Settings */}
                <div className="lg:col-span-6 space-y-4">
                  {/* 1. Document Identity */}
                  <div className="space-y-3 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                    <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-primary" />
                      <span>Document Header &amp; Caption</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Table Title
                      </label>
                      <input
                        type="text"
                        value={pdfTitle}
                        onChange={(e) => setPdfTitle(e.target.value)}
                        placeholder={`SAES Benchmark Table — ${activeMetric}`}
                        className="h-8.5 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Caption / Footnote Notes
                      </label>
                      <input
                        type="text"
                        value={pdfCaption}
                        onChange={(e) => setPdfCaption(e.target.value)}
                        placeholder="Statistical significance caption..."
                        className="h-8.5 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* 2. Color Themes with Clean Swatch Preview */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                    <div className="font-bold text-foreground text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-primary" />
                        Table Theme &amp; Journal Palette
                      </span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        5 publication palettes
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {PDF_THEME_OPTIONS.map((th) => {
                        const isSelected = pdfTheme === th.id
                        return (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => setPdfTheme(th.id)}
                            className={`rounded-xl border text-left p-2.5 transition-all cursor-pointer overflow-hidden ${
                              isSelected
                                ? 'border-primary ring-1 ring-primary/40 bg-primary/5 shadow-2xs'
                                : 'border-border/70 bg-card hover:bg-muted/40 hover:border-border'
                            }`}
                          >
                            {/* Rectangular Palette Color Bar */}
                            <div className="h-2 rounded -mx-1 -mt-1 mb-2 flex overflow-hidden">
                              <div
                                className="h-full flex-[3]"
                                style={{ backgroundColor: th.headerBg }}
                              />
                              <div
                                className="h-full flex-[1]"
                                style={{ backgroundColor: th.accentBg }}
                              />
                            </div>
                            <div className="font-bold text-xs text-foreground flex items-center justify-between">
                              <span>{th.name}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                              {th.description}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 3. Layout, Orientation & Density */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Orientation */}
                    <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                      <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Layout className="w-3.5 h-3.5 text-primary" />
                        Page Orientation
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setPdfOrientation('landscape')}
                          className={`px-3 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                            pdfOrientation === 'landscape'
                              ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                              : 'bg-card border-border/70 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="text-xs font-bold">Landscape</div>
                          <div className="text-[10px] opacity-80 mt-0.5">Wide tables</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPdfOrientation('portrait')}
                          className={`px-3 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                            pdfOrientation === 'portrait'
                              ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                              : 'bg-card border-border/70 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="text-xs font-bold">Portrait</div>
                          <div className="text-[10px] opacity-80 mt-0.5">Tall tables</div>
                        </button>
                      </div>
                    </div>

                    {/* Font Size & Density */}
                    <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                      <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-primary" />
                        Typography &amp; Scale
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {[
                          { size: 7.0, label: 'Compact', desc: '7.0 pt' },
                          { size: 8.5, label: 'Standard', desc: '8.5 pt' },
                          { size: 10.0, label: 'Large', desc: '10.0 pt' },
                        ].map((s) => (
                          <button
                            key={s.size}
                            type="button"
                            onClick={() => setPdfFontSize(s.size)}
                            className={`px-2 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                              pdfFontSize === s.size
                                ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                                : 'bg-card border-border/70 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div className="text-xs font-bold">{s.label}</div>
                            <div className="text-[10px] opacity-80 mt-0.5">{s.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Table Elements & Presentation Options */}
                  <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                    <div className="font-bold text-foreground text-xs">
                      Table Rules &amp; Accents
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfHighlightBest(!pdfHighlightBest)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                          pdfHighlightBest
                            ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
                            : 'border-border/70 bg-card text-muted-foreground'
                        }`}
                      >
                        <div className="text-xs">Highlight Winners</div>
                        {pdfHighlightBest && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPdfShowZebra(!pdfShowZebra)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                          pdfShowZebra
                            ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
                            : 'border-border/70 bg-card text-muted-foreground'
                        }`}
                      >
                        <div className="text-xs">Zebra Striping</div>
                        {pdfShowZebra && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>

                      <div className="flex items-center gap-1 bg-card border border-border/70 rounded-lg p-1">
                        {(
                          [
                            { id: 'full', label: 'Grid' },
                            { id: 'horizontal', label: 'Booktabs' },
                            { id: 'minimal', label: 'Minimal' },
                          ] as { id: PdfGridStyle; label: string }[]
                        ).map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setPdfGridStyle(g.id)}
                            className={`flex-1 py-1 text-center rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              pdfGridStyle === g.id
                                ? 'bg-primary text-primary-foreground shadow-2xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Primary Download Button for Styled PDF */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      disabled={isExporting !== null}
                      onClick={() => handleExport('pdf')}
                      className="w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-xs cursor-pointer"
                    >
                      {isExporting === 'pdf' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download Publication PDF (.pdf)
                    </Button>
                  </div>
                </div>

                {/* Right Column: Live Table & PDF Document Preview */}
                <div className="lg:col-span-6 space-y-3 flex flex-col">
                  {/* Preview Navigation Header */}
                  <div className="flex items-center justify-between pb-0.5">
                    <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>Document Preview</span>
                    </div>

                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 text-xs">
                      <button
                        type="button"
                        onClick={() => setPdfPreviewTab('visual')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          pdfPreviewTab === 'visual'
                            ? 'bg-background text-foreground shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Live Interactive
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!pdfPreviewBlobUrl) {
                            handleGeneratePdfPreview()
                          } else {
                            setPdfPreviewTab('vector')
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          pdfPreviewTab === 'vector'
                            ? 'bg-background text-foreground shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Vector PDF
                      </button>
                    </div>
                  </div>

                  {/* Preview Display Box */}
                  {pdfPreviewTab === 'visual' ? (
                    <div className="rounded-xl border border-border/80 bg-white dark:bg-zinc-950 p-4 shadow-inner space-y-3 flex-1 flex flex-col justify-between min-h-[380px] max-h-[500px] overflow-auto">
                      <div className="space-y-3">
                        {/* Title Header */}
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
                            {pdfTitle || `SAES Benchmark Table — ${activeMetric}`}
                          </h4>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {pdfOrientation.toUpperCase()} • {pdfFontSize} pt • Theme:{' '}
                            {
                              (
                                PDF_THEME_OPTIONS.find((t) => t.id === pdfTheme) ||
                                PDF_THEME_OPTIONS[0]
                              ).name.split(' (')[0]
                            }
                          </p>
                        </div>

                        {/* Interactive Styled Table Mockup */}
                        {tableData ? (
                          <div className="overflow-x-auto">
                            {(() => {
                              const activePalette =
                                PDF_THEME_OPTIONS.find((t) => t.id === pdfTheme) ||
                                PDF_THEME_OPTIONS[0]
                              return (
                                <table
                                  className={`w-full text-left font-mono border-collapse ${
                                    pdfGridStyle === 'full'
                                      ? 'border border-zinc-300 dark:border-zinc-700'
                                      : pdfGridStyle === 'horizontal'
                                        ? 'border-y-2 border-zinc-800 dark:border-zinc-200'
                                        : 'border-b border-zinc-200 dark:border-zinc-800'
                                  }`}
                                  style={{ fontSize: `${Math.max(10, pdfFontSize + 0.5)}px` }}
                                >
                                  <thead>
                                    <tr
                                      style={{
                                        backgroundColor: activePalette.headerBg,
                                        color: '#ffffff',
                                      }}
                                    >
                                      <th className="py-1.5 px-2 font-bold text-[11px]">
                                        Benchmark Instance
                                      </th>
                                      {tableData.algorithms.slice(0, 4).map((alg) => (
                                        <th
                                          key={alg}
                                          className="py-1.5 px-2 text-center font-bold text-[11px]"
                                        >
                                          {alg}
                                        </th>
                                      ))}
                                      {tableData.algorithms.length > 4 && (
                                        <th className="py-1.5 px-1.5 text-center text-[10px] opacity-80">
                                          +{tableData.algorithms.length - 4} more
                                        </th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tableData.instance_rows.slice(0, 5).map((row, rowIdx) => {
                                      const inst = row.instance
                                      const isZebra = pdfShowZebra && rowIdx % 2 === 1
                                      return (
                                        <tr
                                          key={inst}
                                          className={
                                            pdfGridStyle === 'full'
                                              ? 'border-b border-zinc-200 dark:border-zinc-800'
                                              : pdfGridStyle === 'horizontal'
                                                ? 'border-b border-zinc-100 dark:border-zinc-850'
                                                : ''
                                          }
                                          style={{
                                            backgroundColor: isZebra
                                              ? 'rgba(0,0,0,0.03)'
                                              : 'transparent',
                                          }}
                                        >
                                          <td className="py-1 px-2 font-semibold text-zinc-900 dark:text-zinc-100 text-[11px]">
                                            {inst}
                                          </td>
                                          {tableData.algorithms.slice(0, 4).map((alg) => {
                                            const cell = row?.cells?.[alg]
                                            const isBest = pdfHighlightBest && cell?.is_best
                                            return (
                                              <td
                                                key={alg}
                                                className="py-1 px-2 text-center text-zinc-800 dark:text-zinc-200 text-[10px]"
                                                style={
                                                  isBest
                                                    ? {
                                                        backgroundColor: `${activePalette.accentBg}26`,
                                                        fontWeight: 'bold',
                                                        color: activePalette.accentBg,
                                                      }
                                                    : undefined
                                                }
                                              >
                                                {cell ? `${formatNum(cell.mean, 2)}` : '—'}
                                              </td>
                                            )
                                          })}
                                          {tableData.algorithms.length > 4 && (
                                            <td className="py-1 px-1.5 text-center text-zinc-400 text-[10px]">
                                              ...
                                            </td>
                                          )}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              )
                            })()}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-zinc-400">
                            Loading table data...
                          </div>
                        )}

                        {/* Caption / Footnote */}
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 italic">
                          {pdfCaption ||
                            tableData?.caption ||
                            'Statistical significance summary table.'}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPreviewLoading}
                          onClick={handleGeneratePdfPreview}
                          className="text-xs gap-1.5 cursor-pointer"
                        >
                          {isPreviewLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Generate Vector PDF Preview
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Vector PDF Tab */
                    <div className="rounded-xl border border-border/80 bg-card p-2 flex-1 flex flex-col min-h-[380px] max-h-[500px]">
                      {isPreviewLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground">
                            Rendering high-resolution vector PDF with ReportLab...
                          </p>
                        </div>
                      ) : pdfPreviewBlobUrl ? (
                        <div className="flex-1 flex flex-col space-y-2">
                          <iframe
                            src={pdfPreviewBlobUrl}
                            className="w-full flex-1 min-h-[360px] rounded-lg border border-border/60 bg-white"
                            title="Vector PDF Preview"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-muted-foreground">
                              Exact ReportLab vector PDF rendered
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleGeneratePdfPreview}
                              className="text-xs gap-1.5 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Refresh Preview
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center border border-dashed border-border/70 rounded-lg">
                          <Eye className="w-8 h-8 text-muted-foreground/60" />
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Vector PDF Preview
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                              Generate the exact paginated ReportLab PDF document to preview layouts
                              and typography.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={handleGeneratePdfPreview}
                            className="text-xs gap-1.5 cursor-pointer mt-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Generate Vector PDF Preview
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Other Formats Tab */
              <div className="space-y-4 text-xs">
                {/* Format selection cards */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {(
                    [
                      {
                        fmt: 'docx',
                        label: 'MS Word',
                        ext: '.docx',
                        icon: FileText,
                      },
                      {
                        fmt: 'latex',
                        label: 'LaTeX',
                        ext: '.tex',
                        icon: FileCode,
                      },
                      {
                        fmt: 'csv',
                        label: 'CSV Data',
                        ext: '.csv',
                        icon: FileSpreadsheet,
                      },
                      {
                        fmt: 'markdown',
                        label: 'Markdown',
                        ext: '.md',
                        icon: Code2,
                      },
                      {
                        fmt: 'html',
                        label: 'HTML Table',
                        ext: '.html',
                        icon: Layers,
                      },
                    ] as {
                      fmt: TableExportFormat
                      label: string
                      ext: string
                      icon: typeof FileText
                    }[]
                  ).map(({ fmt, label, ext, icon: Icon }) => {
                    const isSelected = selectedOtherFormat === fmt
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setSelectedOtherFormat(fmt)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                            : 'border-border/80 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-1 text-primary" />
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-[10px] opacity-70 font-mono mt-0.5">{ext}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Conditional Format Detail View: LaTeX has dedicated settings, others have clean direct export */}
                {selectedOtherFormat === 'latex' ? (
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <FileCode className="w-4 h-4 text-primary" />
                        <span>LaTeX Document &amp; Notation Configuration</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        .tex format
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Document Structure */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Document Structure
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setLatexDocumentMode('standalone')}
                            className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              latexDocumentMode === 'standalone'
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-card border-border/70 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div>Standalone</div>
                            <div className="text-[10px] opacity-80 font-normal">Full document</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLatexDocumentMode('snippet')}
                            className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              latexDocumentMode === 'snippet'
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-card border-border/70 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div>Paper Snippet</div>
                            <div className="text-[10px] opacity-80 font-normal">table env only</div>
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground pt-0.5">
                          {latexDocumentMode === 'standalone'
                            ? 'Includes \\documentclass{article}, booktabs, and packages for standalone compiling.'
                            : 'Direct \\begin{table} ... \\end{table} snippet to copy into your paper.'}
                        </p>
                      </div>

                      {/* Number Notation */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Number Notation
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'standard', label: 'Decimal', desc: '0.12 ± 0.01' },
                              { id: 'scientific', label: 'Scientific', desc: '$1.2e-3$' },
                              { id: 'siunitx', label: 'siunitx', desc: '\\SI{...}' },
                            ] as const
                          ).map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => setLatexNotation(n.id)}
                              className={`px-2 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                                latexNotation === n.id
                                  ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                                  : 'bg-card border-border/70 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <div className="text-xs font-bold">{n.label}</div>
                              <div className="text-[10px] opacity-80 mt-0.5 font-mono">
                                {n.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground pt-0.5">
                          Number formatting notation rendered in cells and footnotes.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="button"
                        disabled={isExporting !== null}
                        onClick={() => handleExport('latex')}
                        className="w-full h-11 text-xs font-bold gap-2 cursor-pointer"
                      >
                        {isExporting === 'latex' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download LaTeX Source (.tex)
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Other Formats Direct Export Card */
                  <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-foreground flex items-center gap-2">
                        {selectedOtherFormat === 'docx' && (
                          <FileText className="w-4 h-4 text-primary" />
                        )}
                        {selectedOtherFormat === 'csv' && (
                          <FileSpreadsheet className="w-4 h-4 text-primary" />
                        )}
                        {selectedOtherFormat === 'markdown' && (
                          <Code2 className="w-4 h-4 text-primary" />
                        )}
                        {selectedOtherFormat === 'html' && (
                          <Layers className="w-4 h-4 text-primary" />
                        )}
                        <span>
                          {selectedOtherFormat === 'docx' && 'Microsoft Word Document (.docx)'}
                          {selectedOtherFormat === 'csv' && 'CSV Spreadsheet Table (.csv)'}
                          {selectedOtherFormat === 'markdown' && 'GitHub-Flavored Markdown (.md)'}
                          {selectedOtherFormat === 'html' &&
                            'Standalone HTML Table Document (.html)'}
                        </span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        .{selectedOtherFormat === 'markdown' ? 'md' : selectedOtherFormat}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {selectedOtherFormat === 'docx' &&
                        'Formatted OpenXML table ready for Microsoft Word manuscripts, journal submissions, and technical reports.'}
                      {selectedOtherFormat === 'csv' &&
                        'Raw structured comma-separated values compatible with Excel, Google Sheets, Python pandas, and R analysis scripts.'}
                      {selectedOtherFormat === 'markdown' &&
                        'GitHub-compatible markdown table suitable for project READMEs, GitHub releases, and documentation wikis.'}
                      {selectedOtherFormat === 'html' &&
                        'Standalone styled HTML table with embedded responsive styles for web publishing or email reports.'}
                    </p>

                    <div className="pt-2">
                      <Button
                        type="button"
                        disabled={isExporting !== null}
                        onClick={() => handleExport(selectedOtherFormat)}
                        className="w-full h-11 text-xs font-bold gap-2 cursor-pointer"
                      >
                        {isExporting === selectedOtherFormat ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download {selectedOtherFormat.toUpperCase()} Table (.
                        {selectedOtherFormat === 'markdown' ? 'md' : selectedOtherFormat})
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
