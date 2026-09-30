import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { apiClient } from '../../api/client'
import { CheckCircle2, RefreshCw, Server, XCircle } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  apiOnline: boolean
  onRefreshHealth: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiOnline,
  onRefreshHealth,
}) => {
  const [apiUrl, setApiUrl] = useState<string>(() => apiClient.getBaseUrl())
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')

  const handleSave = () => {
    apiClient.setBaseUrl(apiUrl.trim())
    if (typeof window !== 'undefined') {
      localStorage.setItem('saes_api_url', apiUrl.trim())
    }
    onRefreshHealth()
    onClose()
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    try {
      apiClient.setBaseUrl(apiUrl.trim())
      const health = await apiClient.getHealth()
      if (health.status === 'ok') {
        setTestStatus('success')
        onRefreshHealth()
      } else {
        setTestStatus('failed')
      }
    } catch {
      setTestStatus('failed')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Backend Connection & Settings
          </DialogTitle>
          <DialogDescription>
            Configure communication with the SAES core FastAPI analysis service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">SAES API Server URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value)
                  setTestStatus('idle')
                }}
                placeholder="http://127.0.0.1:8000"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className="flex items-center gap-1.5 shrink-0"
              >
                {testStatus === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Status:</span>
              {apiOnline || testStatus === 'success' ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Connected (FastAPI v0.1.0)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <XCircle className="w-4 h-4" /> Standalone / Server Offline
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefreshHealth}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Recheck
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              💡 <strong>Server command:</strong> To launch the FastAPI server in the background:
            </p>
            <pre className="p-2 bg-muted/60 rounded text-[11px] font-mono text-foreground overflow-x-auto">
              cd ../saes && make start-api
            </pre>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
