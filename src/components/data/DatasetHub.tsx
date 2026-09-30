import React, { useRef, useState, useMemo } from 'react'
import {
  Upload,
  FolderOpen,
  Database,
  Trash2,
  FileEdit,
  Eye,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  HardDrive,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { DatasetItem } from '../../api/types'

interface DatasetHubProps {
  isTauri: boolean
  apiOnline: boolean
  datasets: DatasetItem[]
  datasetsValidity?: Record<
    string,
    { isValid: boolean; errorCount: number; warningCount: number; missingColumns?: string[] }
  >
  selectedDatasetFilename: string | null
  onUpload: (fileOrContent: File | string, filename: string) => void
  onOpenDesktopDialog: () => Promise<{ filename: string; content: string } | null>
  onVisualize: (filename: string) => void
  onEdit: (filename: string) => void
  onDelete: (filename: string) => void
}

export const DatasetHub: React.FC<DatasetHubProps> = ({
  isTauri,
  apiOnline,
  datasets,
  datasetsValidity,
  selectedDatasetFilename,
  onUpload,
  onOpenDesktopDialog,
  onVisualize,
  onEdit,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      processFile(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      processFile(file)
    }
  }

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        onUpload(text, file.name)
      }
    }
    reader.readAsText(file)
  }

  const handleDesktopPick = async () => {
    const result = await onOpenDesktopDialog()
    if (result) {
      onUpload(result.content, result.filename)
    }
  }

  const filteredDatasets = useMemo(() => {
    if (!searchQuery.trim()) return datasets
    const q = searchQuery.toLowerCase()
    return datasets.filter(
      (d) => d.name.toLowerCase().includes(q) || d.filename.toLowerCase().includes(q)
    )
  }, [datasets, searchQuery])

  const confirmDelete = () => {
    if (datasetToDelete) {
      onDelete(datasetToDelete)
      setDatasetToDelete(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return 'Recently modified'
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Banner / Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Database className="w-5 h-5" />
            </span>
            Benchmark Datasets
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Upload new experimental results, check data validity, edit entries, or launch automated
            statistical analysis and interactive visualizations.
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload Dropzone: Clean, modern, not overwhelming */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex flex-col items-center justify-center p-7 border-2 border-dashed rounded-xl transition-all duration-200 text-center ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.005]'
            : 'border-border/80 bg-card hover:bg-card/80 hover:border-primary/50 shadow-sm'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
          <Upload className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-semibold text-foreground mb-1">
          Drop your benchmark CSV file here, or browse
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mb-4">
          SAES schema: <code className="text-primary font-medium text-[11px]">algorithm, instance, metric, run_id, value, maximize</code>
        </p>

        <div className="flex items-center gap-2">
          {isTauri ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDesktopPick}
              className="gap-1.5 text-xs bg-background"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Choose File
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5 text-xs bg-background"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Browse Files
            </Button>
          )}
        </div>

        {!apiOnline && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>API connection required to validate and save uploaded datasets.</span>
          </div>
        )}
      </div>

      {/* Datasets Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Available Datasets
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono font-medium">
                {datasets.length}
              </span>
            </h3>
          </div>

          {/* Search filter */}
          {datasets.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-card pl-8 pr-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* Datasets Grid */}
        {filteredDatasets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDatasets.map((dataset) => {
              const isSelected = selectedDatasetFilename === dataset.filename
              const validityInfo = datasetsValidity ? datasetsValidity[dataset.filename] : undefined
              const isDatasetValid = validityInfo ? validityInfo.isValid : true

              return (
                <div
                  key={dataset.filename}
                  className={`flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
                    !isDatasetValid
                      ? 'border-rose-300 bg-rose-50/15 hover:border-rose-400'
                      : isSelected
                        ? 'border-primary/60 ring-2 ring-primary/10'
                        : 'border-border/70 hover:border-border'
                  }`}
                >
                  {/* Top info */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            !isDatasetValid
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-sky-50 text-sky-600 border-sky-100'
                          }`}
                        >
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4
                            className="text-sm font-semibold text-foreground truncate"
                            title={dataset.filename}
                          >
                            {dataset.name}
                          </h4>
                          <span className="text-[11px] text-muted-foreground font-mono block truncate">
                            {dataset.filename}
                          </span>
                        </div>
                      </div>

                      {!isDatasetValid ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold shrink-0 shadow-xs"
                          title="Dataset contains validation or integrity issues. Visualization is locked."
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Issues Detected (Locked)
                        </span>
                      ) : isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Ready
                        </span>
                      )}
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
                        {dataset.row_count !== undefined
                          ? `${dataset.row_count.toLocaleString()} rows`
                          : 'Unknown rows'}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(dataset.size_bytes)}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {formatDate(dataset.modified_at)}
                      </span>
                    </div>
                  </div>

                  {/* 3 Action Buttons: Delete, Edit, Visualize */}
                  <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                    {/* 1. DELETE BUTTON */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDatasetToDelete(dataset.filename)}
                      className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                      title="Delete this dataset"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                      Delete
                    </Button>

                    <div className="flex items-center gap-1.5">
                      {/* 2. EDIT / REVISE BUTTON */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(dataset.filename)}
                        className={`h-8 px-3 text-xs gap-1.5 ${
                          !isDatasetValid
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                            : 'text-foreground bg-card hover:bg-muted/70'
                        }`}
                        title="Edit dataset entries or fix schema issues"
                      >
                        <FileEdit className={`w-3.5 h-3.5 ${!isDatasetValid ? 'text-amber-700' : 'text-muted-foreground'}`} />
                        {!isDatasetValid ? 'Review / Fix' : 'Edit'}
                      </Button>

                      {/* 3. VISUALIZE BUTTON (Available when dataset is valid) */}
                      {isDatasetValid && (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => onVisualize(dataset.filename)}
                          className="h-8 px-3.5 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-semibold"
                          title="Visualize charts and run statistical analysis"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Visualize
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : datasets.length === 0 ? (
          /* Empty state */
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Database className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-foreground">No Datasets Found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Use the upload box above to add your first benchmark CSV dataset and start statistical analysis.
              </p>
            </div>
          </div>
        ) : (
          /* No search results */
          <div className="rounded-xl border border-border/60 p-8 text-center bg-card text-muted-foreground text-xs">
            No datasets matching &ldquo;{searchQuery}&rdquo;. Try another search term.
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!datasetToDelete} onOpenChange={(open) => !open && setDatasetToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Delete Dataset
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-2">
              Are you sure you want to permanently delete{' '}
              <strong className="text-foreground">{datasetToDelete}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDatasetToDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              className="text-xs"
            >
              Yes, Delete Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
