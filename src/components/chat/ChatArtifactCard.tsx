import React, { useState } from 'react'
import { Data, Layout } from 'plotly.js-dist-min'
import {
  Download,
  Maximize2,
  X,
  Image as ImageIcon,
  BarChart3,
  Table as TableIcon,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import {
  ChatArtifact,
  ChatPlotArtifact,
  ChatTableArtifact,
  PlotExportFormat,
  TableExportFormat,
} from '../../api/types'
import { PlotlyChart } from '../charts/PlotlyChart'
import { MathRenderer } from './MathRenderer'

interface ChatArtifactCardProps {
  artifact: ChatArtifact
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function triggerDataUrlDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export const ChatArtifactCard: React.FC<ChatArtifactCardProps> = ({ artifact }) => {
  const [viewMode, setViewMode] = useState<'interactive' | 'image'>('interactive')
  const [isExpanded, setIsExpanded] = useState(false)
  const [downloadingFmt, setDownloadingFmt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const handleDownloadPlot = async (plotArt: ChatPlotArtifact, format: PlotExportFormat) => {
    setDownloadingFmt(format)
    setDownloadError(null)
    const baseName = `saes_${plotArt.plot_type}_${plotArt.metric}${plotArt.instance ? `_${plotArt.instance}` : ''}`
    try {
      const blob = await apiClient.exportPlotFromPath(plotArt.filename, {
        plot_type: plotArt.plot_type,
        export_format: format,
        metric: plotArt.metric,
        instance: plotArt.instance,
        scope: plotArt.scope,
        alpha: plotArt.alpha,
        rope_percent: plotArt.rope_percent,
        palette: plotArt.palette,
        dpi: 300,
      })
      triggerBlobDownload(blob, `${baseName}.${format}`)
    } catch {
      if (format === 'png' && plotArt.image_data_url) {
        triggerDataUrlDownload(plotArt.image_data_url, `${baseName}.png`)
      } else {
        setDownloadError(`Failed to export ${format.toUpperCase()}`)
      }
    } finally {
      setDownloadingFmt(null)
    }
  }

  const handleDownloadTable = async (tableArt: ChatTableArtifact, format: TableExportFormat) => {
    setDownloadingFmt(format)
    setDownloadError(null)
    const extMap: Record<TableExportFormat, string> = {
      csv: 'csv',
      latex: 'tex',
      markdown: 'md',
      html: 'html',
      pdf: 'pdf',
      docx: 'docx',
    }
    const baseName = `saes_table_${tableArt.metric}_${tableArt.table_type}`
    try {
      const blob = await apiClient.exportTableFromPath(tableArt.filename, format, {
        metric: tableArt.metric,
        table_type: tableArt.table_type,
        test_type: tableArt.test_type,
        posthoc_correction: tableArt.posthoc_correction,
        reference_algorithm: tableArt.reference_algorithm ?? undefined,
        alpha: tableArt.alpha,
      })
      triggerBlobDownload(blob, `${baseName}.${extMap[format]}`)
    } catch {
      if (format === 'markdown' && tableArt.markdown) {
        triggerBlobDownload(
          new Blob([tableArt.markdown], { type: 'text/markdown;charset=utf-8' }),
          `${baseName}.md`
        )
      } else if (format === 'csv' && tableArt.csv_content) {
        triggerBlobDownload(
          new Blob([tableArt.csv_content], { type: 'text/csv;charset=utf-8' }),
          `${baseName}.csv`
        )
      } else {
        setDownloadError(`Failed to export ${format.toUpperCase()}`)
      }
    } finally {
      setDownloadingFmt(null)
    }
  }

  const handleCopyMarkdown = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Ignore clipboard permission errors
    }
  }

  const renderPlotBody = (plotArt: ChatPlotArtifact, heightPx: number) => {
    const hasPlotly = Boolean(plotArt.plotly_figure && Array.isArray(plotArt.plotly_figure.data))
    const showInteractive = viewMode === 'interactive' && hasPlotly

    if (showInteractive && plotArt.plotly_figure) {
      const data = plotArt.plotly_figure.data as unknown as Data[]
      const rawLayout = (plotArt.plotly_figure.layout || {}) as Partial<Layout>
      const layout: Partial<Layout> = {
        ...rawLayout,
        autosize: true,
        width: undefined,
        height: heightPx,
        margin: rawLayout.margin || { l: 48, r: 20, t: 36, b: 48 },
      }
      return (
        <div className="w-full rounded-lg bg-white/95 dark:bg-slate-950/70 border border-border/50 overflow-hidden">
          <PlotlyChart
            data={data}
            layout={layout}
            config={{ displayModeBar: true, displaylogo: false, responsive: true }}
            style={{ width: '100%', height: `${heightPx}px` }}
          />
        </div>
      )
    }

    if (plotArt.image_data_url) {
      return (
        <div className="w-full rounded-lg bg-white border border-border/50 overflow-hidden flex items-center justify-center p-1">
          <img
            src={plotArt.image_data_url}
            alt={plotArt.title}
            className="max-w-full h-auto object-contain rounded"
            style={{ maxHeight: `${heightPx}px` }}
          />
        </div>
      )
    }

    return null
  }

  const renderArtifactContent = (expanded: boolean) => {
    if (artifact.kind === 'plot') {
      const hasBoth = Boolean(artifact.plotly_figure && artifact.image_data_url)
      const formats: PlotExportFormat[] = artifact.download_formats || ['png', 'svg', 'pdf']
      return (
        <>
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-muted/40 border-b border-border/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <BarChart3 className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">
                  {artifact.title}
                </div>
                {artifact.subtitle && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    {artifact.subtitle}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {hasBoth && (
                <div className="inline-flex rounded-md border border-border/60 bg-background/70 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setViewMode('interactive')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      viewMode === 'interactive'
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Interactive
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('image')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      viewMode === 'image'
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Image
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(!expanded)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title={expanded ? 'Close full view' : 'Expand diagram'}
              >
                {expanded ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-2">{renderPlotBody(artifact, expanded ? 480 : 250)}</div>

          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-border/50 bg-muted/20 flex-wrap">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Download className="w-3 h-3" />
              Download:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  disabled={downloadingFmt !== null}
                  onClick={() => handleDownloadPlot(artifact, fmt)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/70 bg-background/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-[10px] font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloadingFmt === fmt && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </>
      )
    }

    if (artifact.kind === 'table') {
      const formats: TableExportFormat[] = artifact.download_formats || [
        'csv',
        'latex',
        'markdown',
        'html',
        'pdf',
        'docx',
      ]
      return (
        <>
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-muted/40 border-b border-border/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <TableIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">
                  {artifact.title}
                </div>
                {artifact.subtitle && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    {artifact.subtitle}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyMarkdown(artifact.markdown)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-background/70 hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                title="Copy Markdown table"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!expanded)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title={expanded ? 'Close full view' : 'Expand table'}
              >
                {expanded ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div
            className={`p-2 overflow-auto ${expanded ? 'max-h-[70vh]' : 'max-h-60'} bg-background/40`}
          >
            <MathRenderer content={artifact.markdown} />
          </div>

          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-border/50 bg-muted/20 flex-wrap">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Download className="w-3 h-3" />
              Download:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  disabled={downloadingFmt !== null}
                  onClick={() => handleDownloadTable(artifact, fmt)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/70 bg-background/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-[10px] font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloadingFmt === fmt && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {fmt === 'latex' ? 'LaTeX' : fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </>
      )
    }

    // Generic image artifact
    return (
      <>
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-muted/40 border-b border-border/50">
          <div className="flex items-center gap-1.5 min-w-0">
            <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold text-foreground truncate">
              {artifact.title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!expanded)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            title={expanded ? 'Close full view' : 'Expand image'}
          >
            {expanded ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="p-2 bg-white flex items-center justify-center">
          <img
            src={artifact.image_data_url}
            alt={artifact.title}
            className="max-w-full h-auto rounded object-contain"
            style={{ maxHeight: expanded ? '70vh' : '250px' }}
          />
        </div>
        <div className="flex items-center justify-end px-2.5 py-1.5 border-t border-border/50 bg-muted/20">
          <button
            type="button"
            onClick={() =>
              triggerDataUrlDownload(artifact.image_data_url, artifact.filename || 'saes_image.png')
            }
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/70 bg-background/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-[10px] font-medium text-foreground transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            Download PNG
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mt-2 rounded-xl border border-border/70 bg-background/80 overflow-hidden shadow-sm">
        {renderArtifactContent(false)}
        {downloadError && (
          <div className="px-2.5 py-1 text-[10px] text-rose-500 bg-rose-500/10 border-t border-rose-500/20">
            {downloadError}
          </div>
        )}
      </div>

      {isExpanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {renderArtifactContent(true)}
          </div>
        </div>
      )}
    </>
  )
}
