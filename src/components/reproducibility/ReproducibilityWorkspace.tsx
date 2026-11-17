import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { BenchmarkRecord, ReproducibilityResponse } from '../../api/types'
import { apiClient } from '../../api/client'
import {
  getReproducibilityCacheKey,
  getCachedReproducibility,
  setCachedReproducibility,
} from '../../lib/workspaceCache'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { SelectDropdown } from '../ui/select-dropdown'
import {
  Code,
  Copy,
  Check,
  Download,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileCode,
  Layers,
  Cpu,
  BookOpen,
  FileCheck,
} from 'lucide-react'

interface ReproducibilityWorkspaceProps {
  records?: BenchmarkRecord[]
  alpha: number
  apiOnline?: boolean
  selectedDatasetFilename?: string | null
  rawCsv?: string
}

type ReproducibilitySubTab = 'script' | 'notebook' | 'manifest'

export const ReproducibilityWorkspace: React.FC<ReproducibilityWorkspaceProps> = ({
  records,
  alpha,
  apiOnline = true,
  selectedDatasetFilename,
  rawCsv,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string | undefined>(undefined)
  const [activeSubTab, setActiveSubTab] = useState<ReproducibilitySubTab>('script')

  const [copiedScript, setCopiedScript] = useState(false)
  const [copiedChecksum, setCopiedChecksum] = useState(false)

  const availableMetrics = useMemo(() => {
    if (!records || records.length === 0) return []
    return Array.from(new Set(records.map((r) => r.metric))).sort()
  }, [records])

  const targetMetric = selectedMetric || availableMetrics[0] || 'HV'

  const datasetId = selectedDatasetFilename || (rawCsv ? `csv-${rawCsv.length}` : 'default')
  const cacheKey = useMemo(
    () => getReproducibilityCacheKey(datasetId, targetMetric, alpha),
    [datasetId, targetMetric, alpha]
  )

  const [data, setData] = useState<ReproducibilityResponse | null>(
    () => getCachedReproducibility(cacheKey) ?? null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!apiOnline) return
      if (!forceRefresh) {
        const cached = getCachedReproducibility(cacheKey)
        if (cached) {
          setData(cached)
          return
        }
      }

      setLoading(true)
      setError(null)
      try {
        let res: ReproducibilityResponse
        if (selectedDatasetFilename) {
          res = await apiClient.getReproducibilityFromPath(selectedDatasetFilename, {
            metric: targetMetric,
            alpha,
          })
        } else if (rawCsv) {
          res = await apiClient.getReproducibilityFromCsv(rawCsv, {
            metric: targetMetric,
            alpha,
            filename: selectedDatasetFilename || 'benchmark.csv',
          })
        } else {
          setError('No dataset or observations available.')
          return
        }
        setCachedReproducibility(cacheKey, res)
        setData(res)
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to generate reproducibility artifacts'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [apiOnline, cacheKey, selectedDatasetFilename, rawCsv, targetMetric, alpha]
  )

  useEffect(() => {
    const cached = getCachedReproducibility(cacheKey)
    if (cached) {
      setData(cached)
    } else {
      fetchData()
    }
  }, [cacheKey, fetchData])

  const handleCopyScript = () => {
    if (!data) return
    navigator.clipboard.writeText(data.python_script)
    setCopiedScript(true)
    setTimeout(() => setCopiedScript(false), 2000)
  }

  const handleDownloadScript = () => {
    if (!data) return
    const blob = new Blob([data.python_script], { type: 'text/x-python;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reproduce_${targetMetric.toLowerCase()}_analysis.py`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadNotebook = () => {
    if (!data) return
    const blob = new Blob([data.jupyter_notebook_json], {
      type: 'application/x-ipynb+json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reproduce_${targetMetric.toLowerCase()}_analysis.ipynb`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyChecksum = () => {
    if (!data) return
    navigator.clipboard.writeText(data.manifest.dataset_checksum_sha256)
    setCopiedChecksum(true)
    setTimeout(() => setCopiedChecksum(false), 2000)
  }

  const handleDownloadManifest = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data.manifest, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fair_environment_manifest_${targetMetric.toLowerCase()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
              onClick={() => setActiveSubTab('script')}
              title="Standalone executable Python script (import saesV2) to replicate full benchmark results"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'script'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Python Script</span>
              <span className="text-[10px] opacity-75 font-normal">(reproduce.py)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('notebook')}
              title="Complete Jupyter Notebook with data tables, markdown narration, and code cells"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'notebook'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Jupyter Notebook</span>
              <span className="text-[10px] opacity-75 font-normal">(.ipynb)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('manifest')}
              title="FAIR science environment manifest and SHA-256 cryptographic dataset checksum"
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'manifest'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>FAIR Manifest</span>
              <span className="text-[10px] opacity-75 font-normal">(SHA-256 &amp; Env)</span>
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

            {/* Refresh */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={loading}
              className="h-8 gap-1.5 text-xs rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Subtitle & Method Citation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">FAIR Open Science Pipeline</span>
            <span>•</span>
            <span>Findable, Accessible, Interoperable, and Reusable algorithmic artifacts</span>
          </div>
          {data && (
            <Badge variant="outline" className="text-[11px] font-mono w-fit bg-muted/40">
              SHA-256: {data.manifest.dataset_checksum_sha256.substring(0, 12)}...
            </Badge>
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex items-center justify-center p-12 rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">
              Synthesizing reproducibility pipeline and Jupyter notebook...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold">Artifact Synthesis Error</h4>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Main Subtab Views */}
      {!loading && !error && data && (
        <div className="space-y-5">
          {/* SUBTAB 1: PYTHON SCRIPT */}
          {activeSubTab === 'script' && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-foreground">
                    Standalone Python Execution Script (reproduce.py)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyScript}
                    className="h-8 gap-1.5 text-xs rounded-lg"
                    title="Copy full Python source code to clipboard"
                  >
                    {copiedScript ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedScript ? 'Copied' : 'Copy Code'}
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleDownloadScript}
                    className="h-8 gap-1.5 text-xs rounded-lg"
                    title="Download script as .py file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Script (.py)
                  </Button>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/60 border border-border/60 text-xs text-muted-foreground flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Executes end-to-end data validation, normality checks, omnibus tests, Dolan-Moré
                    profiles, and power audit.
                  </span>
                </div>
                <code className="hidden md:inline px-2 py-0.5 bg-background rounded text-[11px] font-mono border border-border">
                  python reproduce_{targetMetric.toLowerCase()}_analysis.py
                </code>
              </div>

              <div className="relative rounded-lg border border-border bg-muted/70 p-4 font-mono text-xs overflow-x-auto max-h-[520px]">
                <pre className="text-foreground leading-relaxed whitespace-pre font-mono">
                  {data.python_script}
                </pre>
              </div>
            </div>
          )}

          {/* SUBTAB 2: JUPYTER NOTEBOOK */}
          {activeSubTab === 'notebook' && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-foreground">
                    Interactive Jupyter Notebook (.ipynb)
                  </h4>
                </div>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleDownloadNotebook}
                  className="h-8 gap-1.5 text-xs rounded-lg"
                  title="Download notebook for VS Code, JupyterLab or Google Colab"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Notebook (.ipynb)
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Formatted Markdown Documentation</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Includes structured LaTeX equations for Dolan-Moré performance profiles,
                    Cohen&apos;s d effect sizes, and non-parametric Vargha-Delaney $A_{12}$
                    statistics.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Standard nbformat v4 Schema</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Guaranteed compatibility with JupyterLab, VS Code Jupyter Extension, Google
                    Colab, and GitHub preview without kernel lock-in.
                  </p>
                </div>
              </div>

              {/* Notebook preview structure */}
              <div className="rounded-lg border border-border p-4 bg-muted/40 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Included Notebook Computational Cells:
                </span>
                <ol className="space-y-2 text-xs text-foreground font-mono">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Cell 1
                    </Badge>
                    <span>Import saesV2 &amp; Load Benchmark Dataset</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Cell 2
                    </Badge>
                    <span>Automated Schema &amp; Data Integrity Validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Cell 3
                    </Badge>
                    <span>Statistical Analysis &amp; Non-Parametric Hypothesis Tests</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Cell 4
                    </Badge>
                    <span>Dolan-Moré Performance Profiles &amp; Pairwise Matrix</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Cell 5
                    </Badge>
                    <span>Post-Hoc Statistical Power &amp; Sample Size Audit</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* SUBTAB 3: FAIR MANIFEST */}
          {activeSubTab === 'manifest' && (
            <div className="space-y-5">
              {/* Dataset Integrity Banner */}
              <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Dataset SHA-256 Cryptographic Checksum
                      </h4>
                      <button
                        type="button"
                        onClick={handleCopyChecksum}
                        className="text-[10px] text-primary hover:underline font-mono inline-flex items-center gap-1"
                      >
                        {copiedChecksum ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedChecksum ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="font-mono text-xs text-foreground truncate max-w-xl">
                      {data.manifest.dataset_checksum_sha256}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadManifest}
                  className="h-8 gap-1.5 text-xs bg-background rounded-lg"
                  title="Download FAIR Environment Manifest as JSON"
                >
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  Download Manifest (.json)
                </Button>
              </div>

              {/* Specification Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-foreground">
                      Software &amp; Runtime Specification
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Python Runtime:</span>
                      <span className="font-mono font-semibold text-foreground">
                        v{data.manifest.python_version}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Host Operating System:</span>
                      <span className="font-mono font-medium text-foreground">
                        {data.manifest.platform}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">SAESv2 Core Version:</span>
                      <span className="font-mono font-semibold text-indigo-600">
                        v{data.manifest.saes_version}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">SciPy Library:</span>
                      <span className="font-mono font-medium text-foreground">
                        v{data.manifest.scipy_version}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">NumPy Engine:</span>
                      <span className="font-mono font-medium text-foreground">
                        v{data.manifest.numpy_version}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Pandas Engine:</span>
                      <span className="font-mono font-medium text-foreground">
                        v{data.manifest.pandas_version}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-foreground">
                      Dataset &amp; Run Cardinality
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Generation Timestamp:</span>
                      <span className="font-mono font-medium text-foreground">
                        {data.manifest.timestamp}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Total Observations (Rows):</span>
                      <span className="font-mono font-bold text-foreground">
                        {data.manifest.row_count.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Runs / Repetitions per Cell:</span>
                      <span className="font-mono font-bold text-foreground">
                        N = {data.manifest.runs_per_cell}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-muted/60 text-[11px] text-muted-foreground leading-relaxed mt-4 border border-border/60">
                      <strong>FAIR Science Guarantee:</strong> All algorithm evaluations, random
                      seed repetitions, and hypothesis tests can be verified independently without
                      UI dependencies.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
