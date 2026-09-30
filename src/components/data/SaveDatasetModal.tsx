import React, { useState, useEffect } from 'react'
import { AlertTriangle, Database, Save } from 'lucide-react'
import { Button } from '../ui/button'
import { DatasetItem } from '../../api/types'

interface SaveDatasetModalProps {
  isOpen: boolean
  defaultFilename: string
  existingDatasets: DatasetItem[]
  onCancel: () => void
  onConfirm: (finalFilename: string) => Promise<void> | void
  isSubmitting?: boolean
}

export const SaveDatasetModal: React.FC<SaveDatasetModalProps> = ({
  isOpen,
  defaultFilename,
  existingDatasets,
  onCancel,
  onConfirm,
  isSubmitting = false,
}) => {
  const initialStem = defaultFilename.replace(/\.csv$/i, '')
  const [datasetName, setDatasetName] = useState(initialStem)

  useEffect(() => {
    if (isOpen) {
      setDatasetName(defaultFilename.replace(/\.csv$/i, ''))
    }
  }, [isOpen, defaultFilename])

  if (!isOpen) return null

  // Sanitize name: remove leading/trailing spaces, remove any trailing .csv if user typed it
  const cleanStem = datasetName.trim().replace(/\.csv$/i, '')
  const targetFilename = cleanStem ? `${cleanStem}.csv` : ''

  // Check if filename already exists
  const isConflict = Boolean(
    targetFilename &&
      existingDatasets.some(
        (d) =>
          d.filename.toLowerCase() === targetFilename.toLowerCase() ||
          d.name.toLowerCase() === cleanStem.toLowerCase()
      )
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cleanStem || isSubmitting) return
    onConfirm(targetFilename)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Save Dataset</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose a name to store this benchmark dataset
                </p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="dataset-name-input" className="block text-xs font-semibold text-foreground">
                Dataset Name
              </label>
              <div className="flex items-center rounded-lg border border-input bg-background shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                <input
                  id="dataset-name-input"
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g. cec2013_benchmark"
                  autoFocus
                  className="flex-1 px-3 py-2 text-xs bg-transparent focus:outline-none font-mono text-foreground"
                />
                <span className="px-3 py-2 text-xs text-muted-foreground font-mono select-none bg-muted/40 border-l border-border/60">
                  .csv
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Target file:{' '}
                <span className="font-mono font-medium text-foreground">
                  {targetFilename || '(enter a valid name)'}
                </span>
              </p>
            </div>

            {/* Conflict Warning */}
            {isConflict && (
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-950 space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2 font-semibold text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Dataset Already Exists</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  A dataset named <span className="font-mono font-bold">&ldquo;{targetFilename}&rdquo;</span> already
                  exists in your workspace. Saving with this name will replace the existing file.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-muted/30 border-t border-border/80 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant={isConflict ? 'destructive' : 'default'}
              size="sm"
              disabled={!cleanStem || isSubmitting}
              className={`gap-1.5 text-xs font-semibold shadow-xs ${
                !isConflict ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting
                ? 'Saving...'
                : isConflict
                  ? 'Replace & Save'
                  : 'Save Dataset'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
