import { useState, useMemo, useRef } from 'react'
import Plotly, { Data, Layout } from 'plotly.js-dist-min'
import { BenchmarkRecord } from '../../api/types'
import { PlotlyChart } from './PlotlyChart'
import { PaletteSelector, SCIENTIFIC_PALETTES } from './PaletteSelector'
import { ExportToolbar } from './ExportToolbar'
import { calculateDescriptives } from '../../lib/stats'
import { BarChart3, Box, LineChart, ScatterChart, Activity, Sliders } from 'lucide-react'
import { useAppearance } from '../../context/AppearanceContext'

interface ChartWorkbenchProps {
  records: BenchmarkRecord[]
  alpha: number
}

type GraphType = 'boxplot' | 'violin' | 'barplot' | 'ecdf' | 'scatter'

export const ChartWorkbench = ({ records, alpha }: ChartWorkbenchProps) => {
  const { theme } = useAppearance()
  const isDark = theme === 'dark'
  const [graphType, setGraphType] = useState<GraphType>('boxplot')
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('academic')
  const [fontScale, setFontScale] = useState<number>(13)
  const [chartHeight, setChartHeight] = useState<number>(540)
  const [isExporting, setIsExporting] = useState(false)
  const chartRef = useRef<HTMLDivElement | null>(null)

  // Instances & Metrics
  const instances = useMemo(() => Array.from(new Set(records.map((r) => r.instance))), [records])
  const metrics = useMemo(() => Array.from(new Set(records.map((r) => r.metric))), [records])

  const [selectedInstance, setSelectedInstance] = useState<string>('')
  const [selectedMetric, setSelectedMetric] = useState<string>('')

  const activeInstance = instances.includes(selectedInstance)
    ? selectedInstance
    : instances[0] || ''
  const activeMetric = metrics.includes(selectedMetric) ? selectedMetric : metrics[0] || ''

  // Active palette
  const activePalette = useMemo(() => {
    return (
      SCIENTIFIC_PALETTES.find((p) => p.id === selectedPaletteId)?.colors ||
      SCIENTIFIC_PALETTES[0].colors
    )
  }, [selectedPaletteId])

  // Filter records by instance and metric
  const filteredRecords = useMemo(() => {
    if (!activeInstance || !activeMetric) return []
    return records.filter((r) => r.instance === activeInstance && r.metric === activeMetric)
  }, [records, activeInstance, activeMetric])

  // Unique algorithms in selected cell
  const algorithms = useMemo(() => {
    return Array.from(new Set(filteredRecords.map((r) => r.algorithm)))
  }, [filteredRecords])

  // Construct Plotly Traces based on graphType
  const plotData = useMemo<Data[]>(() => {
    if (filteredRecords.length === 0) return []

    switch (graphType) {
      case 'boxplot': {
        return algorithms.map((algo, i) => {
          const values = filteredRecords.filter((r) => r.algorithm === algo).map((r) => r.value)
          const color = activePalette[i % activePalette.length]
          return {
            type: 'box',
            name: algo,
            y: values,
            boxpoints: 'all',
            jitter: 0.35,
            pointpos: -1.8,
            marker: {
              color,
              size: 5,
              opacity: 0.7,
            },
            line: {
              color,
              width: 1.8,
            },
            fillcolor: `${color}33`,
          } as unknown as Data
        })
      }

      case 'violin': {
        return algorithms.map((algo, i) => {
          const values = filteredRecords.filter((r) => r.algorithm === algo).map((r) => r.value)
          const color = activePalette[i % activePalette.length]
          return {
            type: 'violin',
            name: algo,
            y: values,
            box: {
              visible: true,
              width: 0.25,
            },
            meanline: {
              visible: true,
            },
            points: 'all',
            jitter: 0.25,
            marker: {
              color,
              size: 4,
            },
            line: {
              color,
              width: 1.8,
            },
            fillcolor: `${color}33`,
          } as unknown as Data
        })
      }

      case 'barplot': {
        // Mean ± 95% Confidence Interval error bars
        const means: number[] = []
        const errorUpper: number[] = []
        const colors: string[] = []

        algorithms.forEach((algo, i) => {
          const vals = filteredRecords.filter((r) => r.algorithm === algo).map((r) => r.value)
          const desc = calculateDescriptives(vals)
          const se = desc.std / Math.sqrt(Math.max(1, desc.n))
          const tCrit = 2.045 // ~ 95% CI for df=29
          means.push(desc.mean)
          errorUpper.push(se * tCrit)
          colors.push(activePalette[i % activePalette.length])
        })

        return [
          {
            type: 'bar',
            x: algorithms,
            y: means,
            error_y: {
              type: 'data',
              array: errorUpper,
              visible: true,
              color: '#f8fafc',
              thickness: 1.5,
              width: 6,
            },
            marker: {
              color: colors,
              line: {
                color: '#ffffff',
                width: 1,
              },
            },
          } as unknown as Data,
        ]
      }

      case 'ecdf': {
        // Empirical Cumulative Distribution Functions
        return algorithms.map((algo, i) => {
          const values = filteredRecords
            .filter((r) => r.algorithm === algo)
            .map((r) => r.value)
            .sort((a, b) => a - b)
          const n = values.length
          const y = values.map((_, idx) => (idx + 1) / n)
          const color = activePalette[i % activePalette.length]

          return {
            type: 'scatter',
            mode: 'lines+markers',
            name: algo,
            x: values,
            y,
            line: {
              shape: 'hv', // step-wise function for true ECDF
              color,
              width: 2.2,
            },
            marker: {
              color,
              size: 4,
            },
          } as unknown as Data
        })
      }

      case 'scatter': {
        // Run ID vs Value to visualize stochastic trajectory across seed runs
        return algorithms.map((algo, i) => {
          const runs = filteredRecords.filter((r) => r.algorithm === algo)
          const color = activePalette[i % activePalette.length]

          return {
            type: 'scatter',
            mode: 'markers+lines',
            name: algo,
            x: runs.map((r) => r.run_id),
            y: runs.map((r) => r.value),
            marker: {
              color,
              size: 6,
              symbol: i % 2 === 0 ? 'circle' : 'diamond',
            },
            line: {
              color,
              dash: i % 2 === 0 ? 'solid' : 'dot',
              width: 1.5,
            },
          } as unknown as Data
        })
      }
    }
  }, [filteredRecords, graphType, algorithms, activePalette])

  // Plotly Layout configuration
  const plotLayout = useMemo<Partial<Layout>>(() => {
    return {
      title: {
        text: `<b>${activeInstance}</b> — Metric: <i>${activeMetric}</i> (α = ${alpha})`,
        font: {
          family: 'Inter, sans-serif',
          size: fontScale + 3,
          color: isDark ? '#f8fafc' : '#0f172a',
        },
      },
      font: {
        family: 'Inter, sans-serif',
        size: fontScale,
        color: isDark ? '#cbd5e1' : '#475569',
      },
      paper_bgcolor: 'transparent',
      plot_bgcolor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(248, 250, 252, 0.8)',
      xaxis: {
        title: {
          text:
            graphType === 'ecdf'
              ? `${activeMetric} Value`
              : graphType === 'scatter'
                ? 'Independent Run Identifier'
                : 'Algorithm',
          font: { size: fontScale, color: isDark ? '#f1f5f9' : '#1e293b' },
        },
        gridcolor: isDark ? '#334155' : '#e2e8f0',
        zerolinecolor: isDark ? '#475569' : '#cbd5e1',
        tickfont: { color: isDark ? '#94a3b8' : '#475569' },
      },
      yaxis: {
        title: {
          text: graphType === 'ecdf' ? 'Empirical CDF P(X ≤ x)' : `${activeMetric} Value`,
          font: { size: fontScale, color: isDark ? '#f1f5f9' : '#1e293b' },
        },
        gridcolor: isDark ? '#334155' : '#e2e8f0',
        zerolinecolor: isDark ? '#475569' : '#cbd5e1',
        tickfont: { color: isDark ? '#94a3b8' : '#475569' },
      },
      legend: {
        orientation: 'h',
        y: -0.2,
        x: 0.5,
        xanchor: 'center',
        font: { size: fontScale - 1, color: isDark ? '#e2e8f0' : '#334155' },
      },
      margin: { l: 65, r: 35, t: 55, b: 85 },
    }
  }, [activeInstance, activeMetric, graphType, fontScale, alpha, isDark])

  // Export handlers
  const handleExportFigure = async (format: 'png' | 'svg' | 'pdf') => {
    if (!chartRef.current) return
    setIsExporting(true)

    try {
      const filename = `saes_${activeInstance}_${activeMetric}_${graphType}`
      const opts = {
        format: format === 'pdf' ? 'png' : format,
        filename,
        width: 1400,
        height: 900,
        scale: format === 'png' || format === 'pdf' ? 3 : 1,
      } as unknown as Parameters<typeof Plotly.downloadImage>[1]
      await Plotly.downloadImage(chartRef.current, opts)
    } catch (err) {
      console.error('Figure export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-card/30">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          No Benchmark Data Loaded
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Upload a CSV benchmark dataset in the <strong>Data & Validation</strong> tab to visualize algorithmic distributions, violin plots, and empirical cumulative distribution functions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart Control Toolbar */}
      <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3">
        {/* Top Controls: Type Selector & Context Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          {/* Graph Type Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setGraphType('boxplot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                graphType === 'boxplot'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Boxplot
            </button>

            <button
              type="button"
              onClick={() => setGraphType('violin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                graphType === 'violin'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Violin Plot
            </button>

            <button
              type="button"
              onClick={() => setGraphType('barplot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                graphType === 'barplot'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Bar (Mean ± CI)
            </button>

            <button
              type="button"
              onClick={() => setGraphType('ecdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                graphType === 'ecdf'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              ECDF Curve
            </button>

            <button
              type="button"
              onClick={() => setGraphType('scatter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                graphType === 'scatter'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ScatterChart className="w-3.5 h-3.5" />
              Run Trajectory
            </button>
          </div>

          {/* Export Buttons */}
          <ExportToolbar onExport={handleExportFigure} isExporting={isExporting} />
        </div>

        {/* Secondary Row: Context Filtering (Instance / Metric) & Styling */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Instance Picker */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground">Instance:</span>
              <select
                value={activeInstance}
                onChange={(e) => setSelectedInstance(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 font-mono text-xs font-semibold"
              >
                {instances.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>

            {/* Metric Picker */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground">Metric:</span>
              <select
                value={activeMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 font-mono text-xs font-semibold text-purple-300"
              >
                {metrics.map((met) => (
                  <option key={met} value={met}>
                    {met}
                  </option>
                ))}
              </select>
            </div>

            {/* Palette Picker */}
            <PaletteSelector selectedId={selectedPaletteId} onSelect={setSelectedPaletteId} />
          </div>

          {/* Font & Dimension Controls */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Font Size:</span>
              <select
                value={fontScale}
                onChange={(e) => setFontScale(Number(e.target.value))}
                className="h-7 rounded border border-input bg-background px-1.5 text-xs"
              >
                {[11, 12, 13, 14, 16].map((s) => (
                  <option key={s} value={s}>
                    {s}px
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Height:</span>
              <select
                value={chartHeight}
                onChange={(e) => setChartHeight(Number(e.target.value))}
                className="h-7 rounded border border-input bg-background px-1.5 text-xs"
              >
                {[450, 540, 620, 700].map((h) => (
                  <option key={h} value={h}>
                    {h}px
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Plotly Figure Canvas */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm overflow-hidden">
        {filteredRecords.length > 0 ? (
          <PlotlyChart
            data={plotData}
            layout={plotLayout}
            onPlotlyRef={(div) => {
              chartRef.current = div
            }}
            style={{ height: `${chartHeight}px` }}
          />
        ) : (
          <div className="flex items-center justify-center h-80 text-muted-foreground text-xs">
            No data available for {activeInstance || 'selected instance'} [{activeMetric || 'selected metric'}].
          </div>
        )}
      </div>
    </div>
  )
}
