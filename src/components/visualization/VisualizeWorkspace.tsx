import React, { useState } from 'react'
import { ArrowLeft, BarChart2, PieChart, Database, Play, Activity, FileEdit } from 'lucide-react'
import { Button } from '../ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { ChartWorkbench } from '../charts/ChartWorkbench'
import { StatsTable } from '../stats/StatsTable'
import { DataTable } from '../data/DataTable'
import { AnalysisResponse, BenchmarkRecord, DatasetSummary } from '../../api/types'

interface VisualizeWorkspaceProps {
  filename: string
  records: BenchmarkRecord[]
  summary: DatasetSummary | null
  analysis: AnalysisResponse | null
  alpha: number
  isAnalyzing: boolean
  apiOnline: boolean
  onAlphaChange: (alpha: number) => void
  onRunAnalysis: () => Promise<void>
  onBackToHub: () => void
  onOpenEditor: () => void
  onOpenChat: () => void
}

export const VisualizeWorkspace: React.FC<VisualizeWorkspaceProps> = ({
  filename,
  records,
  summary,
  analysis,
  alpha,
  isAnalyzing,
  apiOnline,
  onAlphaChange,
  onRunAnalysis,
  onBackToHub,
  onOpenEditor,
  onOpenChat: _onOpenChat,
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'stats' | 'data'>('charts')

  const handleRunAnalysisWithTabSwitch = async () => {
    await onRunAnalysis()
    setActiveTab('stats')
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/70">
        {/* Left: Breadcrumbs & Dataset identity */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBackToHub}
            className="gap-1 text-xs -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Datasets
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {filename}
              </h2>
              {summary && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono font-medium">
                  {summary.rowCount.toLocaleString()} observations
                </span>
              )}
            </div>
            {summary && (
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                {summary.algorithms.length} algorithms • {summary.instances.length} instances •{' '}
                {summary.metrics.length} metrics • {summary.runsPerCell} runs/cell
              </p>
            )}
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Significance Alpha Selector */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs shadow-sm">
            <span className="px-2 font-mono text-muted-foreground text-xs">α:</span>
            {[0.01, 0.05, 0.1].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onAlphaChange(val)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  alpha === val
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {val.toFixed(2)}
              </button>
            ))}
          </div>

          {/* Quick Edit Data button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenEditor}
            className="h-8 gap-1.5 text-xs bg-card"
            title="Edit dataset values"
          >
            <FileEdit className="w-3.5 h-3.5 text-muted-foreground" />
            Edit Data
          </Button>

          {/* Run Automated Statistical Analysis Button */}
          <Button
            size="sm"
            onClick={handleRunAnalysisWithTabSwitch}
            disabled={isAnalyzing || !apiOnline || records.length === 0}
            className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm disabled:opacity-50"
            title={
              !apiOnline
                ? 'Backend API required to run automated hypothesis testing'
                : 'Execute automated hypothesis tests, normality checks, and effect sizes'
            }
          >
            {isAnalyzing ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Statistical Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Workspace Tabs: Clean, uncluttered, focused */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'charts' | 'stats' | 'data')}
        className="space-y-6"
      >
        <div className="border-b border-border/80 pb-2 flex items-center justify-between">
          <TabsList className="bg-muted p-1 border border-border/60">
            <TabsTrigger value="charts" className="gap-2 text-xs font-semibold">
              <PieChart className="w-3.5 h-3.5 text-sky-600" />
              Interactive Visualizations
            </TabsTrigger>

            <TabsTrigger value="stats" className="gap-2 text-xs font-semibold">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
              Statistical Workbench
              {analysis && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-mono text-[10px]">
                  {analysis.cells_count} tests
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger value="data" className="gap-2 text-xs font-semibold">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              Observations &amp; Data
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-muted-foreground font-mono hidden md:block">
            Significance threshold: α = {alpha}
          </span>
        </div>

        {/* TAB 1: INTERACTIVE CHARTS */}
        <TabsContent value="charts" className="space-y-5 focus-visible:outline-none">
          <ChartWorkbench records={records} alpha={alpha} />
        </TabsContent>

        {/* TAB 2: STATISTICAL WORKBENCH */}
        <TabsContent value="stats" className="space-y-5 focus-visible:outline-none">
          {analysis ? (
            <StatsTable results={analysis.results} alpha={alpha} />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-4 bg-card shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  Automated Hypothesis Testing Not Yet Executed
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Click <strong>Run Statistical Analysis</strong> to automatically test normality
                  (Shapiro-Wilk), homoscedasticity (Levene), select appropriate parametric or
                  non-parametric tests, and compute effect sizes.
                </p>
              </div>

              {apiOnline && (
                <Button
                  onClick={handleRunAnalysisWithTabSwitch}
                  disabled={isAnalyzing}
                  className="gap-2 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isAnalyzing ? 'Running Calculations...' : 'Execute Analysis Now'}
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: DATA OBSERVATIONS */}
        <TabsContent value="data" className="space-y-5 focus-visible:outline-none">
          <DataTable data={records} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
