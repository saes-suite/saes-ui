import { useState } from 'react'
import { Header } from './components/layout/Header'
import { DatasetHub } from './components/data/DatasetHub'
import { DatasetEditor } from './components/data/DatasetEditor'
import { VisualizeWorkspace } from './components/visualization/VisualizeWorkspace'
import { ChatDrawer } from './components/chat/ChatDrawer'
import { useAnalysis } from './hooks/useAnalysis'
import { useTauri } from './hooks/useTauri'
import { useChat } from './hooks/useChat'
import { Sparkles, AlertCircle, WifiOff } from 'lucide-react'
import { MissingColumnWarningModal } from './components/data/MissingColumnWarningModal'
import { ColumnMappingModal } from './components/data/ColumnMappingModal'
import { ProblematicRowsFixerView } from './components/data/ProblematicRowsFixerView'
import { SaveDatasetModal } from './components/data/SaveDatasetModal'
import {
  inspectDatasetStructure,
  applyColumnMapping,
  analyzeRowByRow,
  DatasetStructureResult,
} from './lib/datasetInspection'

type AppView = 'hub' | 'fix-issues' | 'editor' | 'visualize'

export function App() {
  const [view, setView] = useState<AppView>('hub')
  const { isTauri, openDesktopFile } = useTauri()

  const [stagedUpload, setStagedUpload] = useState<{
    filename: string
    rawCsv: string
  } | null>(null)

  const [saveModalState, setSaveModalState] = useState<{
    isOpen: boolean
    content: string
    defaultFilename: string
    onSaved?: () => void
  } | null>(null)

  const [rejectedDatasetInfo, setRejectedDatasetInfo] = useState<{
    filename: string
    missingColumns: string[]
    columnCount: number
  } | null>(null)

  const [mappingWizardInfo, setMappingWizardInfo] = useState<{
    filename: string
    structureResult: DatasetStructureResult
    rawContent: string
  } | null>(null)

  const {
    rawCsv,
    filename,
    records,
    summary,
    validation,
    analysis,
    alpha,
    isValidating,
    isAnalyzing,
    error,
    apiOnline,
    datasets,
    datasetsValidity,
    selectedDatasetFilename,
    setAlpha,
    uploadAndLoadDataset,
    selectDataset,
    deleteDataset,
    validateDataset,
    saveDataset,
    updateRecords,
    runAnalysis,
    checkHealth,
  } = useAnalysis()

  const {
    messages,
    isOpen: isChatOpen,
    setIsOpen: setIsChatOpen,
    isLoading: isChatLoading,
    error: chatError,
    sendMessage: sendChatMessage,
    clearHistory: clearChatHistory,
  } = useChat(rawCsv, analysis, alpha, selectedDatasetFilename)

  // Confirm saving dataset with user-chosen name and conflict check
  const handleConfirmSaveDataset = async (finalFilename: string) => {
    if (!saveModalState) return
    const { content, onSaved } = saveModalState
    await uploadAndLoadDataset(content, finalFilename)
    onSaved?.()
    setSaveModalState(null)
  }

  // Handle new dataset upload: intelligently check structure, missing columns, or mapping needs
  const handleUpload = async (fileOrContent: File | string, uploadFilename: string) => {
    const csvText =
      typeof fileOrContent === 'string' ? fileOrContent : await fileOrContent.text()

    // 1. Inspect dataset structure immediately
    const structure = inspectDatasetStructure(csvText)

    // Case 1: Missing entire required column (fewer than 6 columns or required column missing)
    if (structure.isMissingEntireColumn) {
      setRejectedDatasetInfo({
        filename: uploadFilename,
        missingColumns: structure.missingColumnsList,
        columnCount: structure.columnCount,
      })
      return
    }

    // Case 2: Column count is sufficient (>= 6), but header names differ
    if (structure.canMapColumns) {
      setMappingWizardInfo({
        filename: uploadFilename,
        structureResult: structure,
        rawContent: csvText,
      })
      return
    }

    // Case 3: Exact SAES schema match
    const rowCheck = analyzeRowByRow(csvText)
    if (rowCheck.isValid) {
      setSaveModalState({
        isOpen: true,
        content: csvText,
        defaultFilename: uploadFilename,
        onSaved: () => setView('visualize'),
      })
    } else {
      // Must solve problems before dataset can be saved to backend
      setStagedUpload({ filename: uploadFilename, rawCsv: csvText })
      setView('fix-issues')
    }
  }

  // Handle confirming column mapping from upload flow
  const handleConfirmMappingFromUpload = async (mapping: Record<string, string>) => {
    if (!mappingWizardInfo) return
    const remappedCsv = applyColumnMapping(mappingWizardInfo.rawContent, mapping)
    const targetFilename = mappingWizardInfo.filename
    setMappingWizardInfo(null)
    const rowCheck = analyzeRowByRow(remappedCsv)
    if (rowCheck.isValid) {
      setSaveModalState({
        isOpen: true,
        content: remappedCsv,
        defaultFilename: targetFilename,
        onSaved: () => setView('visualize'),
      })
    } else {
      // Must solve problems before dataset can be saved to backend
      setStagedUpload({ filename: targetFilename, rawCsv: remappedCsv })
      setView('fix-issues')
    }
  }

  // Handle dataset selection for visualization with strict validity guard
  const handleVisualize = async (targetFilename: string) => {
    const validity = datasetsValidity[targetFilename]
    if (validity && !validity.isValid) {
      if (selectedDatasetFilename !== targetFilename) {
        await selectDataset(targetFilename)
      }
      setView('editor')
      return
    }

    if (selectedDatasetFilename !== targetFilename) {
      await selectDataset(targetFilename)
    }
    setView('visualize')
  }

  // Handle dataset selection for editing
  const handleEdit = async (targetFilename: string) => {
    if (selectedDatasetFilename !== targetFilename) {
      await selectDataset(targetFilename)
    }
    setView('editor')
  }

  // Handle dataset deletion
  const handleDelete = async (targetFilename: string) => {
    await deleteDataset(targetFilename)
    if (selectedDatasetFilename === targetFilename) {
      setView('hub')
    }
  }

  // Switch dataset from header dropdown
  const handleSelectFromHeader = async (targetFilename: string) => {
    await selectDataset(targetFilename)
    const validity = datasetsValidity[targetFilename]
    if (validity && !validity.isValid) {
      setView('editor')
    } else if (view === 'hub') {
      setView('visualize')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Application Header */}
      <Header
        isTauri={isTauri}
        apiOnline={apiOnline}
        datasets={datasets}
        selectedDatasetFilename={stagedUpload ? stagedUpload.filename : selectedDatasetFilename}
        currentView={view}
        onNavigateHub={() => {
          setStagedUpload(null)
          setView('hub')
        }}
        onSelectDataset={handleSelectFromHeader}
        onRefreshHealth={checkHealth}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
      />

      {/* API Offline Warning Banner */}
      {!apiOnline && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Backend API Disconnected:</strong> The SAES backend service is offline.
              Connect to http://127.0.0.1:8000 for schema validation and automated hypothesis testing.
            </span>
          </div>
          <button
            type="button"
            onClick={checkHealth}
            className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* VIEW 1: DATASETS HUB (Manage & Upload) */}
        {view === 'hub' && (
          <DatasetHub
            isTauri={isTauri}
            apiOnline={apiOnline}
            datasets={datasets}
            datasetsValidity={datasetsValidity}
            selectedDatasetFilename={selectedDatasetFilename}
            onUpload={handleUpload}
            onOpenDesktopDialog={openDesktopFile}
            onVisualize={handleVisualize}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {/* VIEW 2: DEDICATED QUALITY FIXER (Only defective rows, cannot save until valid) */}
        {view === 'fix-issues' && stagedUpload && (
          <ProblematicRowsFixerView
            filename={stagedUpload.filename}
            rawCsv={stagedUpload.rawCsv}
            onDiscard={() => {
              setStagedUpload(null)
              setView('hub')
            }}
            onSaveCleanDataset={async (cleanCsv) => {
              setSaveModalState({
                isOpen: true,
                content: cleanCsv,
                defaultFilename: stagedUpload.filename,
                onSaved: () => {
                  setStagedUpload(null)
                  setView('visualize')
                },
              })
            }}
          />
        )}

        {/* VIEW 3: DATASET EDITOR (Normal editor, only for saved datasets) */}
        {view === 'editor' && (
          <DatasetEditor
            filename={filename || selectedDatasetFilename || 'benchmark.csv'}
            records={records}
            rawCsv={rawCsv}
            validation={validation}
            isValidating={isValidating}
            apiOnline={apiOnline}
            onBack={() => setView('hub')}
            onSave={saveDataset}
            onSaveAndVisualize={async (fn, content) => {
              await saveDataset(fn, content)
              setView('visualize')
            }}
            onRevalidate={async (customCsv) => {
              return await validateDataset(customCsv)
            }}
            onUpdateRecords={updateRecords}
          />
        )}

        {/* VIEW 4: VISUALIZATION & STATISTICAL ANALYSIS WORKSPACE */}
        {view === 'visualize' && (
          <VisualizeWorkspace
            filename={filename || selectedDatasetFilename || 'benchmark.csv'}
            records={records}
            summary={summary}
            analysis={analysis}
            alpha={alpha}
            isAnalyzing={isAnalyzing}
            apiOnline={apiOnline}
            onAlphaChange={setAlpha}
            onRunAnalysis={runAnalysis}
            onBackToHub={() => setView('hub')}
            onOpenEditor={() => setView('editor')}
            onOpenChat={() => setIsChatOpen(true)}
          />
        )}
      </main>

      {/* Floating Action Button for AI Consultant (when drawer is closed) */}
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all duration-200 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask Statistical Consultant</span>
        </button>
      )}

      {/* Embedded AI Consultant Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        isLoading={isChatLoading}
        error={chatError}
        onSendMessage={sendChatMessage}
        onClearHistory={clearChatHistory}
      />

      {/* Case 1: Missing Column Rejection Warning Modal */}
      {rejectedDatasetInfo && (
        <MissingColumnWarningModal
          isOpen={!!rejectedDatasetInfo}
          filename={rejectedDatasetInfo.filename}
          missingColumns={rejectedDatasetInfo.missingColumns}
          columnCount={rejectedDatasetInfo.columnCount}
          onAcknowledge={() => setRejectedDatasetInfo(null)}
        />
      )}

      {/* Case 2: Column Mapping Wizard Modal (Upload flow) */}
      {mappingWizardInfo && (
        <ColumnMappingModal
          isOpen={!!mappingWizardInfo}
          filename={mappingWizardInfo.filename}
          structureResult={mappingWizardInfo.structureResult}
          onConfirmMapping={handleConfirmMappingFromUpload}
          onCancel={() => setMappingWizardInfo(null)}
        />
      )}

      {/* Case 3: Save Dataset with Custom Name & Conflict Check Modal */}
      {saveModalState && (
        <SaveDatasetModal
          isOpen={saveModalState.isOpen}
          defaultFilename={saveModalState.defaultFilename}
          existingDatasets={datasets}
          onCancel={() => setSaveModalState(null)}
          onConfirm={handleConfirmSaveDataset}
        />
      )}
    </div>
  )
}

export default App
