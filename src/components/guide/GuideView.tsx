import React, { useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Code,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  BarChart2,
  PieChart,
  TrendingUp,
  Activity,
  AlertTriangle,
  Wand2,
  Wrench,
  ChevronRight,
  Terminal,
  ExternalLink,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  GUIDE_EXAMPLES,
  PYTHON_API_SNIPPET,
  SCHEMA_COLUMNS,
  STARTER_CSV_TEMPLATE,
  GuideExampleDataset,
  SchemaColumnSpec,
} from './GuideSampleData'
import {
  BayesianSimplexMiniSvg,
  BoxplotMiniSvg,
  CriticalDistanceMiniSvg,
  PerformanceProfileMiniSvg,
  PowerCurveMiniSvg,
  WideToLongDiagram,
  WorkflowPipelineDiagram,
} from './GuideVisuals'

type GuideSection = 'overview' | 'data-input' | 'examples' | 'modules' | 'api-ai'

interface GuideViewProps {
  apiOnline: boolean
  onBackToHub: () => void
  onTryExample: (csvContent: string, filename: string) => Promise<void>
  onOpenChat: () => void
}

const COLUMN_DOT_COLORS: Record<SchemaColumnSpec['name'], string> = {
  algorithm: 'bg-indigo-500',
  instance: 'bg-emerald-500',
  metric: 'bg-sky-500',
  run_id: 'bg-amber-500',
  value: 'bg-violet-500',
  maximize: 'bg-rose-500',
}

const ANATOMY_SAMPLE_ROWS = [
  {
    algorithm: 'DE',
    instance: 'Sphere',
    metric: 'Fitness',
    run_id: '0',
    value: '0.0142',
    maximize: 'false',
  },
  {
    algorithm: 'PSO',
    instance: 'Sphere',
    metric: 'Fitness',
    run_id: '0',
    value: '0.0385',
    maximize: 'false',
  },
  {
    algorithm: 'XGBoost',
    instance: 'Iris',
    metric: 'accuracy',
    run_id: '4',
    value: '0.9612',
    maximize: 'true',
  },
]

export const GuideView: React.FC<GuideViewProps> = ({
  apiOnline,
  onBackToHub,
  onTryExample,
  onOpenChat,
}) => {
  const [activeSection, setActiveSection] = useState<GuideSection>('overview')
  const [selectedColumn, setSelectedColumn] = useState<SchemaColumnSpec['name']>('algorithm')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loadingExampleId, setLoadingExampleId] = useState<string | null>(null)

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000)
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  }

  const handleDownloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleLoadExample = async (example: GuideExampleDataset) => {
    if (!apiOnline || loadingExampleId) return
    setLoadingExampleId(example.id)
    try {
      await onTryExample(example.generateCsv(), example.filename)
    } finally {
      setLoadingExampleId(null)
    }
  }

  const activeColumnSpec =
    SCHEMA_COLUMNS.find((c) => c.name === selectedColumn) ?? SCHEMA_COLUMNS[0]

  const navItems: Array<{
    id: GuideSection
    num: string
    label: string
    subtitle: string
    icon: React.ElementType
  }> = [
    {
      id: 'overview',
      num: '01',
      label: 'Overview & Workflow',
      subtitle: 'Architecture & pipeline',
      icon: Layers,
    },
    {
      id: 'data-input',
      num: '02',
      label: 'Data Input Format',
      subtitle: '6-column tidy CSV schema',
      icon: FileSpreadsheet,
    },
    {
      id: 'examples',
      num: '03',
      label: 'Interactive Examples',
      subtitle: '3 runnable domain datasets',
      icon: Play,
    },
    {
      id: 'modules',
      num: '04',
      label: 'Statistical & UI Modules',
      subtitle: 'Tests, plots, profiles, power',
      icon: BarChart2,
    },
    {
      id: 'api-ai',
      num: '05',
      label: 'Python API & AI',
      subtitle: 'Python library & AI assistant',
      icon: Code,
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-10">
      {/* Editorial Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-primary/[0.06] via-card to-indigo-500/[0.04] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBackToHub}
                className="gap-1.5 text-xs -ml-2.5 h-7 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Datasets Hub
              </Button>
              <span className="text-border">/</span>
              <Badge
                variant="secondary"
                className="gap-1.5 text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
              >
                <BookOpen className="w-3 h-3" />
                Documentation &amp; Interactive Guide
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              SAES User Guide &amp; Data Specification
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A visual reference for structuring stochastic benchmark CSVs, understanding automated
              assumption diagnostics and hypothesis tests, and launching domain examples directly in
              the workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="https://saes-suite.github.io/saes/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-foreground transition-colors shadow-xs"
              title="Open SAES documentation hosted on GitHub Pages"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Docs (GitHub Pages)</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadCsv(STARTER_CSV_TEMPLATE, 'saes_starter_template.csv')}
              className="gap-1.5 text-xs h-9 bg-background/80 backdrop-blur-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Starter CSV
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setActiveSection('examples')}
              className="gap-1.5 text-xs h-9 shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              Try Live Examples
            </Button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Documentation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[248px_1fr] gap-6 items-start">
        {/* Sticky Left Navigation Sidebar */}
        <aside className="lg:sticky lg:top-24 space-y-4">
          {/* Mobile horizontal pill bar / Desktop vertical list */}
          <nav
            aria-label="Guide sections"
            className="rounded-xl border border-border/80 bg-card p-2 shadow-xs flex lg:flex-col gap-1 overflow-x-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer shrink-0 lg:w-full ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    {item.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate hidden lg:block">
                      {item.subtitle}
                    </div>
                  </div>
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 hidden lg:block ${
                      isActive ? 'text-primary' : 'text-muted-foreground/60'
                    }`}
                  />
                </button>
              )
            })}
          </nav>

          {/* Sidebar Official Documentation Card */}
          <div className="hidden lg:block rounded-xl border border-border/80 bg-muted/25 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              Official Documentation
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Explore the full Python API, mathematical specifications, and tutorials hosted on
              GitHub Pages.
            </p>
            <a
              href="https://saes-suite.github.io/saes/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between w-full h-8 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group"
            >
              <span className="truncate">saes-suite.github.io</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0 ml-1" />
            </a>
          </div>

          {/* Sidebar Quick Help Card */}
          <div className="hidden lg:block rounded-xl border border-border/80 bg-muted/25 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Need statistical advice?
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ask the AI Consultant to explain p-values, check assumptions, or generate plots from
              your active dataset.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenChat}
              className="w-full h-8 text-xs justify-between bg-background"
            >
              <span>Open Consultant</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="min-w-0 space-y-6">
          {/* SECTION 1: OVERVIEW & WORKFLOW */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <WorkflowPipelineDiagram />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-border transition-colors">
                  <div className="space-y-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Tidy Long-Format Schema
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      One row per stochastic run (<code className="font-mono">algorithm</code>,{' '}
                      <code className="font-mono">instance</code>,{' '}
                      <code className="font-mono">metric</code>,{' '}
                      <code className="font-mono">run_id</code>,{' '}
                      <code className="font-mono">value</code>,{' '}
                      <code className="font-mono">maximize</code>). Includes auto-mapping and
                      row-level repair for messy CSVs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('data-input')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer w-fit"
                  >
                    Inspect CSV Schema <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-border transition-colors">
                  <div className="space-y-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Assumption-Driven Rigor
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Runs Shapiro-Wilk normality, Levene homoscedasticity, and sphericity checks
                      first—automatically recommending parametric or non-parametric tests with
                      post-hoc corrections.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('modules')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer w-fit"
                  >
                    Explore Modules <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-border transition-colors">
                  <div className="space-y-2.5">
                    <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                      <Play className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      One-Click Domain Examples
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Load curated Metaheuristics, Multi-Metric Machine Learning, or Swarm
                      Intelligence datasets directly into the Workspace to test every chart and
                      export.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('examples')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer w-fit"
                  >
                    Launch Examples <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: DATA INPUT FORMAT */}
          {activeSection === 'data-input' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Interactive CSV Header Anatomy */}
              <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
                      Interactive Schema Explorer
                    </span>
                    <h2 className="text-base font-semibold text-foreground mt-0.5">
                      Click Any Column in the CSV Table to Inspect Its Rules
                    </h2>
                  </div>
                  <Badge variant="outline" className="font-mono text-[11px] w-fit">
                    UTF-8 CSV • 6 Required Columns
                  </Badge>
                </div>

                {/* Live Interactive CSV Table */}
                <div className="overflow-x-auto rounded-xl border border-border bg-background">
                  <table className="w-full text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {SCHEMA_COLUMNS.map((col) => {
                          const isSelected = col.name === selectedColumn
                          return (
                            <th key={col.name} className="p-0 text-left">
                              <button
                                type="button"
                                onClick={() => setSelectedColumn(col.name)}
                                className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer border-b-2 ${
                                  isSelected
                                    ? 'bg-primary/10 border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 font-semibold">
                                  <span
                                    className={`w-2 h-2 rounded-full ${COLUMN_DOT_COLORS[col.name]}`}
                                  />
                                  {col.name}
                                </span>
                              </button>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {ANATOMY_SAMPLE_ROWS.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {SCHEMA_COLUMNS.map((col) => {
                            const isSelected = col.name === selectedColumn
                            return (
                              <td
                                key={col.name}
                                onClick={() => setSelectedColumn(col.name)}
                                className={`px-3.5 py-2 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-primary/[0.06] text-foreground font-semibold'
                                    : 'text-muted-foreground hover:bg-muted/30'
                                }`}
                              >
                                {row[col.name]}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Selected Column Inspector */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${COLUMN_DOT_COLORS[activeColumnSpec.name]}`}
                      />
                      <code className="text-sm font-mono font-bold text-foreground">
                        {activeColumnSpec.name}
                      </code>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {activeColumnSpec.typeLabel}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {activeColumnSpec.shortRole}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {activeColumnSpec.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border/80 bg-background p-3.5 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Constraints
                      </div>
                      <ul className="space-y-1.5 text-xs text-foreground/85">
                        {activeColumnSpec.rules.map((rule) => (
                          <li key={rule} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-border/80 bg-background p-3.5 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Valid Values
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeColumnSpec.validExamples.map((ex) => (
                          <code
                            key={ex}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-700 dark:text-emerald-300"
                          >
                            {ex}
                          </code>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/80 bg-background p-3.5 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Rejected Pitfalls
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeColumnSpec.invalidExamples.map((ex) => (
                          <code
                            key={ex}
                            className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] font-mono text-rose-700 dark:text-rose-300"
                          >
                            {ex}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wide vs Long Visual */}
              <WideToLongDiagram />

              {/* Smart Import & Repair Pipeline */}
              <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Smart Upload Validation &amp; Self-Healing
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    SAES automatically routes your uploaded CSV through the appropriate workflow:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Exact Schema Match
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      All 6 columns and cell types validate cleanly. Loads immediately into the
                      analysis workspace.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Wand2 className="w-4 h-4 text-indigo-500" />
                      Column Mapping Wizard
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Different headers like <code className="font-mono">solver</code> or{' '}
                      <code className="font-mono">seed</code>? SAES infers column types and maps
                      them interactively.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Wrench className="w-4 h-4 text-amber-500" />
                      Problematic Rows Fixer
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Isolates only rows containing <code className="font-mono">NaN</code>, empty
                      cells, or invalid types so you can fix or drop them before saving.
                    </p>
                  </div>
                </div>
              </div>

              {/* Starter CSV Editor Block */}
              <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border/70">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>saes_starter_template.csv</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(STARTER_CSV_TEMPLATE, 'starter-csv')}
                      className="gap-1.5 text-xs h-7 px-2.5"
                    >
                      {copiedId === 'starter-csv' ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedId === 'starter-csv' ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleDownloadCsv(STARTER_CSV_TEMPLATE, 'saes_starter_template.csv')
                      }
                      className="gap-1.5 text-xs h-7 px-2.5"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                  </div>
                </div>
                <pre className="p-4 text-[11px] font-mono text-foreground/90 overflow-x-auto leading-relaxed bg-background">
                  {STARTER_CSV_TEMPLATE}
                </pre>
              </div>
            </div>
          )}

          {/* SECTION 3: INTERACTIVE EXAMPLES */}
          {activeSection === 'examples' && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {!apiOnline && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Backend service</strong> is offline. You can download any example CSV
                    below, or connect to the backend to load them directly into the Workspace.
                  </span>
                </div>
              )}

              <div className="space-y-5">
                {GUIDE_EXAMPLES.map((ex) => {
                  const isLoading = loadingExampleId === ex.id
                  return (
                    <div
                      key={ex.id}
                      className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={`text-[10px] font-semibold border-0 ${ex.badgeColor}`}
                            >
                              {ex.domain}
                            </Badge>
                            <code className="text-[11px] font-mono text-muted-foreground">
                              {ex.filename}
                            </code>
                          </div>
                          <h3 className="text-base font-semibold text-foreground">{ex.title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                            {ex.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadCsv(ex.generateCsv(), ex.filename)}
                            className="gap-1.5 text-xs h-9"
                          >
                            <Download className="w-3.5 h-3.5" />
                            CSV
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!apiOnline || isLoading}
                            onClick={() => handleLoadExample(ex)}
                            className="gap-1.5 text-xs h-9"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            {isLoading ? 'Loading...' : 'Load & Analyze'}
                          </Button>
                        </div>
                      </div>

                      {/* Preview Table */}
                      <div className="overflow-x-auto rounded-lg border border-border/80">
                        <table className="w-full text-xs font-mono">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/70">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">algorithm</th>
                              <th className="px-3 py-2 text-left font-medium">instance</th>
                              <th className="px-3 py-2 text-left font-medium">metric</th>
                              <th className="px-3 py-2 text-right font-medium">run_id</th>
                              <th className="px-3 py-2 text-right font-medium">value</th>
                              <th className="px-3 py-2 text-center font-medium">maximize</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50 bg-background">
                            {ex.previewRows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-muted/25">
                                <td className="px-3 py-1.5 font-semibold text-foreground">
                                  {row.algorithm}
                                </td>
                                <td className="px-3 py-1.5 text-muted-foreground">
                                  {row.instance}
                                </td>
                                <td className="px-3 py-1.5">{row.metric}</td>
                                <td className="px-3 py-1.5 text-right text-muted-foreground">
                                  {row.run_id}
                                </td>
                                <td className="px-3 py-1.5 text-right">{row.value}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      row.maximize
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                    }`}
                                  >
                                    {String(row.maximize)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                          {ex.highlights.map((h) => (
                            <span key={h} className="inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              {h}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          {ex.recommendedFeatures.map((feat) => (
                            <Badge key={feat} variant="secondary" className="text-[10px]">
                              {feat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SECTION 4: UI & STATISTICAL MODULES */}
          {activeSection === 'modules' && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Data &amp; Assumptions
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Diagnostics
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Verifies statistical preconditions before hypothesis testing and recommends the
                    most appropriate parametric or non-parametric test.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Shapiro-Wilk',
                      'Lilliefors KS',
                      'Anderson-Darling',
                      'Levene Homoscedasticity',
                      'Design Guards (n=1 / N=1)',
                      'Smart Recommender',
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-muted text-[11px] text-foreground/85 border border-border/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Statistical Workbench
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      LaTeX • PDF • DOCX
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Builds <strong>Instance × Algorithm</strong>, <strong>Pairwise Matrix</strong>,{' '}
                    <strong>Global Rankings (5 Blocked Omnibus Tests)</strong>, and a dedicated{' '}
                    <strong>Post-Hoc Lab</strong> (Tukey HSD, Games-Howell, Dunnett, Dunn,
                    Conover-Iman) with explicit Independent vs. Paired design control.
                  </p>
                  <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
                    <div>
                      <span className="text-foreground font-semibold">Tests:</span> auto, friedman,
                      friedman_aligned, quade, rm_anova (GG ε), brunner_munzel, kruskal, wilcoxon,
                      mann_whitney, anova_oneway, anova_welch, ttest_welch, ttest_ind, ttest_rel
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">Adjustments (13):</span> holm,
                      bonferroni, hochberg, hommel, finner, holland, rom, li, fdr_bh, fdr_by,
                      shaffer, bergmann_hommel, none
                    </div>
                  </div>
                </div>
              </div>

              {/* Visualizations Showcase */}
              <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-sky-500" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Publication-Ready Visualizations
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono w-fit">
                    PNG 300 DPI • SVG • PDF
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2.5">
                    <BoxplotMiniSvg />
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Distributions (Boxplot, Violin, ECDF, Mean ± SD)
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Inspect run-level quartiles, densities, empirical CDFs, and backend Mean ±
                        SD bars across algorithms.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <CriticalDistanceMiniSvg />
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Rankings (CD, Plackett-Luce &amp; Effect-Size Forest)
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Demšar Critical Distance diagrams, Bayesian Plackett-Luce P(Best) + 95% CrI,
                        and exact 95% CI Effect-Size Forest plots (g, d, A₁₂, δ).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <BayesianSimplexMiniSvg />
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Bayesian (Sign, Signed-Rank &amp; Correlated t)
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Ternary ROPE simplex (relative/absolute ROPE &amp; prior strength) plus
                        Nadeau-Bengio Bayesian Correlated t-test posterior density for CV folds.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-violet-500" />
                      <h3 className="text-sm font-semibold text-foreground">Benchmark Profiles</h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Dolan-Moré (2002)
                    </Badge>
                  </div>
                  <PerformanceProfileMiniSvg />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Dolan-Moré step curves <code className="font-mono">ρ(τ)</code>, Global
                    Meta-Rankings, and Win / Tie / Loss (W/T/L) pairwise matrices.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Power &amp; Sample Size
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Study Design
                    </Badge>
                  </div>
                  <PowerCurveMiniSvg />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A priori sample-size planning, sensitivity power curves,{' '}
                    <strong>MDES sensitivity audit</strong> (Hoenig &amp; Heisey 2001), and an
                    interactive <strong>TOST Equivalence Calculator</strong> with (1−2α) interval
                    charts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: PYTHON API & AI */}
          {activeSection === 'api-ai' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in-50 duration-200">
              {/* Python IDE Block */}
              <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs flex flex-col">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border/70">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Terminal className="w-3.5 h-3.5 text-blue-500" />
                    <span>saes_analysis.py</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(PYTHON_API_SNIPPET, 'python-api')}
                    className="gap-1.5 text-xs h-7 px-2.5"
                  >
                    {copiedId === 'python-api' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedId === 'python-api' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="p-4 space-y-3 flex-1 bg-background">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Every UI operation maps 1:1 to{' '}
                    <code className="font-mono text-foreground">saes</code>. The{' '}
                    <strong>Code &amp; Reproducibility</strong> tab also exports a runnable script,
                    Jupyter Notebook (<code className="font-mono">.ipynb</code>), and SHA-256
                    manifest.
                  </p>
                  <pre className="rounded-lg border border-border/70 bg-muted/30 p-3.5 text-[11px] font-mono text-foreground overflow-x-auto leading-relaxed">
                    {PYTHON_API_SNIPPET}
                  </pre>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                    <span className="text-muted-foreground">
                      Looking for detailed Python docstrings &amp; API references?
                    </span>
                    <a
                      href="https://saes-suite.github.io/saes/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline shrink-0"
                    >
                      <span>saes Docs on GitHub Pages</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* AI Consultant Card */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      AI Statistical Consultant
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Context-aware assistant that inspects your active dataset, explains test
                    recommendations, renders inline plots/tables, and navigates workspace tabs.
                  </p>
                  <div className="rounded-lg border border-border/70 bg-muted/25 p-3.5 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Example Prompts
                    </div>
                    <ul className="space-y-2 text-xs text-foreground/85">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-mono">›</span>
                        <span>
                          &ldquo;Which algorithm performed best overall and is it statistically
                          significant?&rdquo;
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-mono">›</span>
                        <span>&ldquo;Generate a Critical Distance diagram for Fitness.&rdquo;</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-mono">›</span>
                        <span>
                          &ldquo;Why did SAES recommend Friedman instead of One-Way ANOVA?&rdquo;
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-mono">›</span>
                        <span>&ldquo;Draft a concise results paragraph in LaTeX.&rdquo;</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Button type="button" onClick={onOpenChat} className="gap-2 text-xs w-fit">
                  <Sparkles className="w-3.5 h-3.5" />
                  Open Statistical Consultant
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
