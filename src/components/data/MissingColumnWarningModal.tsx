import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Trash2, Ban } from 'lucide-react'

interface MissingColumnWarningModalProps {
  isOpen: boolean
  filename: string
  missingColumns: string[]
  columnCount: number
  onAcknowledge: () => void
}

export const MissingColumnWarningModal: React.FC<MissingColumnWarningModalProps> = ({
  isOpen,
  filename,
  missingColumns,
  columnCount,
  onAcknowledge,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onAcknowledge()}>
      <DialogContent className="sm:max-w-md border-rose-200 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 text-rose-600 mb-1">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Dataset Rejected: Required Column Missing
              </DialogTitle>
              <span className="text-[11px] text-rose-700 font-semibold">
                Cannot be introduced into SAES
              </span>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-2 space-y-2">
            <p>
              The file <strong className="text-foreground font-mono">{filename}</strong> cannot
              be accepted or processed because it is missing an entire required column:
            </p>

            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1.5">
              <span className="text-[11px] font-bold text-rose-900 block">
                Missing Required Column(s):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {missingColumns.map((col) => (
                  <span
                    key={col}
                    className="px-2 py-0.5 rounded bg-rose-200/70 border border-rose-300 font-mono text-xs font-bold text-rose-900"
                  >
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-rose-800 pt-1">
                The file contains only <strong>{columnCount}</strong> column(s), but SAES
                strictly requires all 6 standard columns: <code className="text-rose-950 font-semibold font-mono text-[10px]">algorithm, instance, metric, run_id, value, maximize</code>.
              </p>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <Trash2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Automatic Action:</strong> The uploaded file has been rejected and discarded to prevent pipeline failures.
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onAcknowledge}
            className="w-full text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
          >
            Understood, return to Datasets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
