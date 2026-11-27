import React, { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Eye,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from 'lucide-react'
import { ParetoCollectionListItem, ParetoCollectionSummary } from '../../api/types'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { CreateParetoStudyModal } from './CreateParetoStudyModal'

interface ParetoHubProps {
  apiOnline: boolean
  collections: ParetoCollectionListItem[]
  selectedCollectionName: string | null
  isLoading: boolean
  isCreatingDemo: boolean
  onVisualize: (name: string) => void
  onDelete: (name: string) => Promise<void>
  onLoadDemo: () => Promise<void>
  onStudyCreated: (summary: ParetoCollectionSummary) => Promise<void>
  onOpenGuide?: () => void
}

export const ParetoHub: React.FC<ParetoHubProps> = ({
  apiOnline,
  collections,
  selectedCollectionName,
  isLoading,
  isCreatingDemo,
  onVisualize,
  onDelete,
  onLoadDemo,
  onStudyCreated,
  onOpenGuide,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [studyToDelete, setStudyToDelete] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return collections
    const q = searchQuery.toLowerCase()
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.instances.some((i) => i.toLowerCase().includes(q)) ||
        c.algorithms.some((a) => a.toLowerCase().includes(q))
    )
  }, [collections, searchQuery])

  const confirmDelete = async () => {
    if (!studyToDelete) return
    await onDelete(studyToDelete)
    setStudyToDelete(null)
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Banner / Hero — mirrors DatasetHub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </span>
            Pareto Front Studies
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Manage multi-objective approximation front collections, compare empirical attainment
            functions (EAF) against reference Pareto fronts, and extract quality indicators directly
            into SAES benchmark datasets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenGuide && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenGuide}
              className="gap-1.5 text-xs h-9 bg-card hover:bg-muted/60"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Formats &amp; Guide
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadDemo}
            disabled={isCreatingDemo || !apiOnline}
            className="gap-1.5 text-xs h-9 bg-card hover:bg-muted/60"
          >
            {isCreatingDemo ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            )}
            Load Demo Suite
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!apiOnline}
            className="gap-1.5 text-xs h-9 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Pareto Study
          </Button>
        </div>
      </div>

      {/* Guided Creation Dropzone Card — mirrors DatasetHub upload box */}
      <div
        onClick={() => apiOnline && setIsCreateModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && apiOnline) {
            e.preventDefault()
            setIsCreateModalOpen(true)
          }
        }}
        className="group relative flex flex-col items-center justify-center p-7 border-2 border-dashed rounded-xl border-border/80 bg-card hover:bg-card/80 hover:border-primary/50 shadow-sm transition-all duration-200 text-center cursor-pointer select-none"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
          <Upload className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-semibold text-foreground mb-1">
          Create a new Pareto Front Study —{' '}
          <span className="text-primary underline underline-offset-2">
            open guided multi-front uploader
          </span>
        </h3>
        <p className="text-xs text-muted-foreground max-w-lg">
          Upload multiple run fronts per algorithm alongside an optional reference front (.pf), a
          tidy multi-run CSV, or a jMetal/PlatEMO ZIP archive.
        </p>

        {!apiOnline && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-4 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>API connection required to create and visualize Pareto front studies.</span>
          </div>
        )}
      </div>

      {/* Studies Grid Section — mirrors DatasetHub */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Available Pareto Studies
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono font-medium">
              {collections.length}
            </span>
          </h3>

          {collections.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Pareto studies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-card pl-8 pr-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border/60 p-10 text-center bg-card text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Loading Pareto front studies...
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((study) => {
              const isSelected = selectedCollectionName === study.name
              return (
                <div
                  key={study.name}
                  className={`flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-primary/60 ring-2 ring-primary/10'
                      : 'border-border/70 hover:border-border'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4
                            className="text-sm font-semibold text-foreground truncate"
                            title={study.name}
                          >
                            {study.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {study.instances.join(', ')}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : study.has_references ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-semibold shrink-0">
                          <Target className="w-3 h-3" />
                          Ref PF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold shrink-0">
                          Ready
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
                      <span className="font-medium text-foreground">
                        {study.algorithms.length} algorithms
                      </span>
                      <span>•</span>
                      <span>{study.instances.length} instances</span>
                      <span>•</span>
                      <span>{study.total_fronts} fronts</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStudyToDelete(study.name)}
                      className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                      Delete
                    </Button>

                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => onVisualize(study.name)}
                      className="h-8 px-3.5 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualize
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Layers className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-foreground">
                No Pareto Studies Found Yet
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Start immediately with the built-in multi-objective demo benchmark (ZDT1–3 &amp; 3D
                DTLZ2) or upload your own algorithm fronts and reference front.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5">
              <Button
                type="button"
                size="sm"
                onClick={onLoadDemo}
                disabled={isCreatingDemo || !apiOnline}
                className="gap-1.5 text-xs"
              >
                {isCreatingDemo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Load Demo Suite
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                disabled={!apiOnline}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                New Pareto Study
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 p-8 text-center bg-card text-muted-foreground text-xs">
            No Pareto studies matching &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>

      {/* Create New Study Guided Modal */}
      <CreateParetoStudyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={onStudyCreated}
      />

      {/* Delete Confirmation Dialog — identical to DatasetHub */}
      <Dialog open={!!studyToDelete} onOpenChange={(open) => !open && setStudyToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Delete Pareto Study
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-2">
              Are you sure you want to permanently delete{' '}
              <strong className="text-foreground">{studyToDelete}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStudyToDelete(null)}
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
              Yes, Delete Study
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
