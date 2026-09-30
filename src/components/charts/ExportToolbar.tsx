import { FileImage, FileCode, FileText } from 'lucide-react'
import { Button } from '../ui/button'

interface ExportToolbarProps {
  onExport: (format: 'png' | 'svg' | 'pdf') => void
  isExporting?: boolean
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({ onExport, isExporting = false }) => {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground mr-1 hidden sm:inline">
        Export Figure:
      </span>

      {/* PNG 300 DPI */}
      <Button
        variant="outline"
        size="sm"
        disabled={isExporting}
        onClick={() => onExport('png')}
        className="h-8 px-2.5 text-xs gap-1 hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-300"
        title="Export publication PNG at 300 DPI"
      >
        <FileImage className="w-3.5 h-3.5" />
        PNG (300 DPI)
      </Button>

      {/* SVG Vector */}
      <Button
        variant="outline"
        size="sm"
        disabled={isExporting}
        onClick={() => onExport('svg')}
        className="h-8 px-2.5 text-xs gap-1 hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300"
        title="Export lossless vector graphic SVG"
      >
        <FileCode className="w-3.5 h-3.5" />
        SVG
      </Button>

      {/* PDF Document */}
      <Button
        variant="outline"
        size="sm"
        disabled={isExporting}
        onClick={() => onExport('pdf')}
        className="h-8 px-2.5 text-xs gap-1 hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-300"
        title="Export publication ready PDF"
      >
        <FileText className="w-3.5 h-3.5" />
        PDF
      </Button>
    </div>
  )
}
