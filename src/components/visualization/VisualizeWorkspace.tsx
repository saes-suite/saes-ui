import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  BarChart2,
  PieChart,
  Database,
  FileEdit,
  TrendingUp,
  Activity,
  Code,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { ChartWorkbench } from '../charts/ChartWorkbench'
import { StatsTable } from '../stats/StatsTable'
import { DataTable } from '../data/DataTable'
import { PerformanceProfilesWorkspace } from '../profiles/PerformanceProfilesWorkspace'
import { PowerAnalysisWorkspace } from '../power/PowerAnalysisWorkspace'
import { ReproducibilityWorkspace } from '../reproducibility/ReproducibilityWorkspace'
import {
  AnalysisResponse,
  BenchmarkRecord,
  DatasetSummary,
  StatisticalTestType,
  TableType,
} from '../../api/types'

interface VisualizeWorkspaceProps {
  filename: string
  selectedDatasetFilename?: string | null
  rawCsv?: string
  records: BenchmarkRecord[]
  summary: DatasetSummary | null
  analysis: AnalysisResponse | null
  alpha: number
  isAnalyzing?: boolean
  apiOnline: boolean
  activeTab?: WorkspaceTab
  onTabChange?: (tab: WorkspaceTab) => void
  initialTestType?: StatisticalTestType
  initialTableType?: TableType
  initialMetric?: string
  onAlphaChange: (alpha: number) => void
  onRunAnalysis?: () => Promise<void>
  onBackToHub: () => void
  onOpenEditor: () => void
  onOpenChat: () => void
}

export type WorkspaceTab = 'data' | 'stats' | 'charts' | 'profiles' | 'power' | 'reproducibility'

export const VisualizeWorkspace: React.FC<VisualizeWorkspaceProps> = ({
  filename,
  selectedDatasetFilename,
  rawCsv,
  records,
  summary,
  analysis,
  alpha,
  apiOnline,
  activeTab: controlledTab,
  onTabChange,
  initialTestType,
  initialTableType,
  initialMetric,
  onAlphaChange,
  onBackToHub,
  onOpenEditor,
  onOpenChat: _onOpenChat,
}) => {
  const [internalTab, setInternalTab] = useState<WorkspaceTab>('data')
  const activeTab = controlledTab ?? internalTab
  const setActiveTab = (tab: WorkspaceTab) => {
    setInternalTab(tab)
    onTabChange?.(tab)
  }

  const [workbenchTestType, setWorkbenchTestType] = useState<StatisticalTestType | undefined>(
    initialTestType
  )
  const [workbenchTableType, setWorkbenchTableType] = useState<TableType | undefined>(
    initialTableType
  )
  const [workbenchMetric, setWorkbenchMetric] = useState<string | undefined>(initialMetric)

  useEffect(() => {
    if (initialTestType !== undefined) setWorkbenchTestType(initialTestType)
  }, [initialTestType])

  useEffect(() => {
    if (initialTableType !== undefined) setWorkbenchTableType(initialTableType)
  }, [initialTableType])

  useEffect(() => {
    if (initialMetric !== undefined) setWorkbenchMetric(initialMetric)
  }, [initialMetric])

  const handleSelectRecommendedTest = (
    testId: StatisticalTestType,
    tableType: TableType,
    metric?: string
  ) => {
    setWorkbenchTestType(testId)
    setWorkbenchTableType(tableType)
    if (metric) setWorkbenchMetric(metric)
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
        </div>
      </div>

      {/* Workspace Tabs: 7 Integrated Scientific Phases */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as WorkspaceTab)}
        className="space-y-6"
      >
        <div className="border-b border-border/80 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2 overflow-x-auto">
          <TabsList className="bg-muted p-1 border border-border/60 flex-wrap h-auto gap-1">
            <TabsTrigger value="data" className="gap-2 text-xs font-semibold">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              Data &amp; Assumptions
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

            <TabsTrigger value="charts" className="gap-2 text-xs font-semibold">
              <PieChart className="w-3.5 h-3.5 text-sky-600" />
              Visualizations
            </TabsTrigger>

            <TabsTrigger value="profiles" className="gap-2 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
              Benchmark Profiles
            </TabsTrigger>

            <TabsTrigger value="power" className="gap-2 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              Power &amp; Sample Size
            </TabsTrigger>

            <TabsTrigger value="reproducibility" className="gap-2 text-xs font-semibold">
              <Code className="w-3.5 h-3.5 text-blue-600" />
              Code &amp; Reproducibility
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-muted-foreground font-mono hidden lg:block shrink-0">
            Significance: α = {alpha}
          </span>
        </div>

        {/* STEP 1: DATA EXPLORATION & STATISTICAL ASSUMPTIONS */}
        <TabsContent value="data" className="space-y-5 focus-visible:outline-none">
          <DataTable
            data={records}
            alpha={alpha}
            apiOnline={apiOnline}
            selectedDatasetFilename={selectedDatasetFilename || filename}
            rawCsv={rawCsv}
            onSelectRecommendedTest={handleSelectRecommendedTest}
          />
        </TabsContent>

        {/* STEP 2: STATISTICAL WORKBENCH & HYPOTHESIS TESTING */}
        <TabsContent value="stats" className="space-y-5 focus-visible:outline-none">
          <StatsTable
            results={analysis?.results}
            records={records}
            alpha={alpha}
            apiOnline={apiOnline}
            selectedDatasetFilename={selectedDatasetFilename || filename}
            rawCsv={rawCsv}
            initialTestType={workbenchTestType}
            initialTableType={workbenchTableType}
            initialMetric={workbenchMetric}
          />
        </TabsContent>

        {/* STEP 3: INTERACTIVE CHARTS & VISUALIZATIONS */}
        <TabsContent value="charts" className="space-y-5 focus-visible:outline-none">
          <ChartWorkbench
            records={records}
            alpha={alpha}
            apiOnline={apiOnline}
            selectedDatasetFilename={selectedDatasetFilename || filename}
            rawCsv={rawCsv}
          />
        </TabsContent>

        {/* STEP 4: DOLAN-MORE PERFORMANCE PROFILES & META-BENCHMARK */}
        <TabsContent
          value="profiles"
          forceMount
          className={`space-y-5 focus-visible:outline-none ${activeTab === 'profiles' ? '' : 'hidden'}`}
        >
          <PerformanceProfilesWorkspace
            records={records}
            alpha={alpha}
            apiOnline={apiOnline}
            selectedDatasetFilename={selectedDatasetFilename || filename}
            rawCsv={rawCsv}
          />
        </TabsContent>

        {/* STEP 5: EXPERIMENTAL DESIGN & STATISTICAL POWER */}
        <TabsContent
          value="power"
          forceMount
          className={`space-y-5 focus-visible:outline-none ${activeTab === 'power' ? '' : 'hidden'}`}
        >
          <PowerAnalysisWorkspace
            records={records}
            alpha={alpha}
            apiOnline={apiOnline}
            selectedDatasetFilename={selectedDatasetFilename || filename}
            rawCsv={rawCsv}
          />
        </TabsContent>

        {/* STEP 6: REPRODUCIBILITY & FAIR SCRIPTING */}
        <TabsContent
          value="reproducibility"
          forceMount
          className={`space-y-5 focus-visible:outline-none ${activeTab === 'reproducibility' ? '' : 'hidden'}`}
        >
          <ReproducibilityWorkspace
            records={records}
            alpha={alpha}
            apiOnline={apiOnline}
            selectedDatasetFilename={selectedDatasetFilename || filename}
            rawCsv={rawCsv}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
