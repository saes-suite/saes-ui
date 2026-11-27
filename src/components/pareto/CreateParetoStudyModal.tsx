import React, { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  FileSpreadsheet,
  Files,
  Loader2,
  Plus,
  Target,
  Trash2,
  Upload,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import { ParetoCollectionSummary } from '../../api/types'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface CreateParetoStudyModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (summary: ParetoCollectionSummary) => void
}

type ImportMode = 'multi-file' | 'tidy-csv' | 'zip'

interface AlgorithmGroup {
  id: string
  algorithm: string
  files: File[]
}

export const CreateParetoStudyModal: React.FC<CreateParetoStudyModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [importMode, setImportMode] = useState<ImportMode>('multi-file')
  const [studyName, setStudyName] = useState('')
  const [instanceName, setInstanceName] = useState('ZDT1')

  // Mode 1: Guided Multi-File (multiple run files per algorithm + optional reference front)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [groups, setGroups] = useState<AlgorithmGroup[]>([
    { id: 'alg-1', algorithm: 'NSGA-II', files: [] },
    { id: 'alg-2', algorithm: 'MOEA/D', files: [] },
  ])

  // Mode 2 & 3: Single CSV or ZIP
  const [singleFile, setSingleFile] = useState<File | null>(null)
  const [csvRefFile, setCsvRefFile] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetAndClose = () => {
    setError(null)
    onClose()
  }

  const addAlgorithmGroup = () => {
    const nextIdx = groups.length + 1
    setGroups((prev) => [
      ...prev,
      { id: `alg-${Date.now()}-${nextIdx}`, algorithm: `Algorithm_${nextIdx}`, files: [] },
    ])
  }

  const removeAlgorithmGroup = (id: string) => {
    setGroups((prev) => (prev.length > 1 ? prev.filter((g) => g.id !== id) : prev))
  }

  const updateGroupName = (id: string, name: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, algorithm: name } : g)))
  }

  const updateGroupFiles = (id: string, fileList: FileList | null) => {
    const arr = fileList ? Array.from(fileList) : []
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, files: arr } : g)))
  }

  const totalSelectedRuns = groups.reduce((acc, g) => acc + g.files.length, 0)

  const canSubmit =
    importMode === 'multi-file'
      ? studyName.trim().length > 0 &&
        groups.some((g) => g.algorithm.trim().length > 0 && g.files.length > 0)
      : singleFile !== null

  const handleSubmit = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      let created: ParetoCollectionSummary
      if (importMode === 'multi-file') {
        const validGroups = groups.filter((g) => g.algorithm.trim() && g.files.length > 0)
        if (validGroups.length === 0) {
          setError('Add at least one algorithm with one or more front files.')
          setIsSubmitting(false)
          return
        }
        created = await apiClient.createMultiFileParetoCollection(
          studyName.trim(),
          instanceName.trim() || 'Problem',
          validGroups.map((g) => ({ algorithm: g.algorithm.trim(), files: g.files })),
          referenceFile
        )
      } else {
        if (!singleFile) {
          setError('Please choose a file to upload.')
          setIsSubmitting(false)
          return
        }
        created = await apiClient.uploadParetoCollection(
          singleFile,
          importMode === 'tidy-csv' ? csvRefFile : null,
          studyName.trim() || undefined,
          instanceName.trim() || 'Problem'
        )
      }
      onCreated(created)
      resetAndClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create Pareto front study.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Upload className="w-4 h-4" />
            </span>
            New Pareto Front Study
          </DialogTitle>
          <DialogDescription className="text-xs">
            Combine approximation fronts from multiple runs and algorithms alongside an optional
            reference Pareto front.
          </DialogDescription>
        </DialogHeader>

        {/* Step 0: Choose Input Format */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            {
              id: 'multi-file' as ImportMode,
              title: 'Multi-File Runs',
              desc: 'Pick FUN.*.tsv files per algorithm + .pf reference',
              icon: Files,
            },
            {
              id: 'tidy-csv' as ImportMode,
              title: 'Tidy CSV',
              desc: 'Single CSV with algorithm, instance, run_id, f1, f2…',
              icon: FileSpreadsheet,
            },
            {
              id: 'zip' as ImportMode,
              title: 'jMetal / ZIP',
              desc: 'Archive with <algo>/<instance>/FUN.*.tsv folders',
              icon: FileArchive,
            },
          ].map((opt) => {
            const Icon = opt.icon
            const active = importMode === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setImportMode(opt.id)
                  setError(null)
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <span className="text-xs font-semibold text-foreground">{opt.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{opt.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Common Study Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Study Name {importMode === 'multi-file' ? '*' : '(optional)'}
            </label>
            <input
              type="text"
              value={studyName}
              onChange={(e) => setStudyName(e.target.value)}
              placeholder="e.g. zdt1_comparison"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {importMode !== 'zip' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Problem Instance {importMode === 'tidy-csv' ? '(fallback if omitted)' : '*'}
              </label>
              <input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="e.g. ZDT1"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}
        </div>

        {/* MODE 1: GUIDED MULTI-FILE BUILDER */}
        {importMode === 'multi-file' && (
          <div className="space-y-4">
            {/* Reference Front */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  1. Reference Pareto Front (Optional)
                </span>
                {referenceFile && (
                  <button
                    type="button"
                    onClick={() => setReferenceFile(null)}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Upload a <code>.pf</code>, <code>.tsv</code>, or <code>.csv</code> file containing
                the true/reference front points (2+ numeric columns).
              </p>
              <input
                type="file"
                accept=".pf,.tsv,.csv,.txt"
                onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted cursor-pointer"
              />
              {referenceFile && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Loaded reference:{' '}
                  <span className="font-mono">{referenceFile.name}</span>
                </p>
              )}
            </div>

            {/* Algorithm Groups */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  2. Algorithm Approximation Fronts ({totalSelectedRuns} run files selected)
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAlgorithmGroup}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Algorithm
                </Button>
              </div>

              <div className="space-y-2">
                {groups.map((grp, index) => (
                  <div
                    key={grp.id}
                    className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground w-5">
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={grp.algorithm}
                        onChange={(e) => updateGroupName(grp.id, e.target.value)}
                        placeholder="Algorithm name (e.g. NSGA-II)"
                        className="flex h-8 flex-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                      />
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        {grp.files.length} {grp.files.length === 1 ? 'run' : 'runs'}
                      </span>
                      {groups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAlgorithmGroup(grp.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Remove algorithm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".tsv,.csv,.txt,.pf"
                      onChange={(e) => updateGroupFiles(grp.id, e.target.files)}
                      className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted/60 file:px-2.5 file:py-1 file:text-[11px] file:font-medium hover:file:bg-muted cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: TIDY CSV */}
        {importMode === 'tidy-csv' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Tidy Fronts CSV File *
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={(e) => setSingleFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted cursor-pointer"
              />
              <pre className="mt-2 p-2.5 rounded-lg bg-background border border-border/60 text-[11px] font-mono text-muted-foreground overflow-x-auto">
                {`algorithm,instance,run_id,f1,f2\nNSGA-II,ZDT1,0,0.12,0.68\nMOEA/D,ZDT1,0,0.10,0.70\nReference,ZDT1,0,0.00,1.00`}
              </pre>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                External Reference Front (.pf / .csv, optional)
              </label>
              <input
                type="file"
                accept=".pf,.csv,.tsv,.txt"
                onChange={(e) => setCsvRefFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* MODE 3: JMETAL / PLATEMO ZIP */}
        {importMode === 'zip' && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
            <label className="text-xs font-semibold text-foreground block">
              Experiment ZIP Archive *
            </label>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setSingleFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              Expected folder layout inside the ZIP (standard jMetal / PlatEMO output):
            </p>
            <pre className="p-2.5 rounded-lg bg-background border border-border/60 text-[11px] font-mono text-muted-foreground overflow-x-auto">
              {`experiment/\n├── NSGA-II/ZDT1/FUN.0.tsv, FUN.1.tsv, ...\n├── MOEAD/ZDT1/FUN.0.tsv, FUN.1.tsv, ...\n└── reference_fronts/ZDT1.pf`}
            </pre>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="pt-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetAndClose}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
            className="text-xs gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Create &amp; Visualize Study
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
