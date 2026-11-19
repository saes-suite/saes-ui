import { useState, useCallback } from 'react'
import { Header } from './components/layout/Header'
import { DatasetHub } from './components/data/DatasetHub'
import { DatasetEditor } from './components/data/DatasetEditor'
import { VisualizeWorkspace, WorkspaceTab } from './components/visualization/VisualizeWorkspace'
import { ChatDrawer } from './components/chat/ChatDrawer'
import { useAnalysis } from './hooks/useAnalysis'
import { useTauri } from './hooks/useTauri'
import { useChat } from './hooks/useChat'
import { StatisticalTestType, TableType, UIAction } from './api/types'
import { Sparkles, AlertCircle, WifiOff, Loader2 } from 'lucide-react'
import { MissingColumnWarningModal } from './components/data/MissingColumnWarningModal'
import { ColumnMappingModal } from './components/data/ColumnMappingModal'
import { ProblematicRowsFixerView } from './components/data/ProblematicRowsFixerView'
import { SaveDatasetModal } from './components/data/SaveDatasetModal'
import { SettingsModal } from './components/layout/SettingsModal'
import { GuideView } from './components/guide/GuideView'
import {
  inspectDatasetStructure,
  applyColumnMapping,
  analyzeRowByRow,
  DatasetStructureResult,
} from './lib/datasetInspection'

type AppView = 'hub' | 'fix-issues' | 'editor' | 'visualize' | 'guide'

export function App() {
  const [view, setView] = useState<AppView>('hub')
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('data')
  const [agentTestType, setAgentTestType] = useState<StatisticalTestType | undefined>(undefined)
  const [agentTableType, setAgentTableType] = useState<TableType | undefined>(undefined)
  const [agentMetric, setAgentMetric] = useState<string | undefined>(undefined)
  const [editorOriginView, setEditorOriginView] = useState<'hub' | 'visualize'>('hub')
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

  const [settingsModal, setSettingsModal] = useState<{
    isOpen: boolean
    initialTab: 'server' | 'ai'
  }>({ isOpen: false, initialTab: 'ai' })

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
    fetchDatasets,
    validateDataset,
    saveDataset,
    updateRecords,
    runAnalysis,
    checkHealth,
  } = useAnalysis()

  const handleUIAction = useCallback(
    async (action: UIAction) => {
      if (action.type === 'refresh_datasets') {
        await fetchDatasets()
        return
      }
      if (action.type === 'select_dataset' && action.dataset_name) {
        await selectDataset(action.dataset_name)
        return
      }
      if (action.type === 'navigate_ui') {
        if (action.alpha !== undefined) {
          setAlpha(action.alpha)
        }
        if (action.dataset_name && action.dataset_name !== selectedDatasetFilename) {
          await selectDataset(action.dataset_name)
        }
        if (action.metric) setAgentMetric(action.metric)
        if (action.test_type) setAgentTestType(action.test_type)
        if (action.table_type) setAgentTableType(action.table_type)
        if (action.tab) {
          setWorkspaceTab(action.tab as WorkspaceTab)
        }
        if (action.view === 'hub' || action.view === 'editor' || action.view === 'visualize') {
          setView(action.view)
        }
      }
    },
    [fetchDatasets, selectDataset, setAlpha, selectedDatasetFilename]
  )

  const isDatasetView = view === 'visualize' || view === 'editor'

  const {
    messages,
    isOpen: isChatOpen,
    setIsOpen: setIsChatOpen,
    isLoading: isChatLoading,
    error: chatError,
    attachment: chatAttachment,
    attachFile: attachChatFile,
    clearAttachment: clearChatAttachment,
    sendMessage: sendChatMessage,
    clearHistory: clearChatHistory,
  } = useChat(
    isDatasetView ? rawCsv : null,
    isDatasetView ? analysis : null,
    alpha,
    isDatasetView ? selectedDatasetFilename : null,
    view,
    view === 'visualize' ? workspaceTab : null,
    handleUIAction
  )

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
    const csvText = typeof fileOrContent === 'string' ? fileOrContent : await fileOrContent.text()

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
      setEditorOriginView('hub')
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
    setEditorOriginView('hub')
    setView('editor')
  }

  // Handle dataset deletion
  const handleDelete = async (targetFilename: string) => {
    await deleteDataset(targetFilename)
    if (selectedDatasetFilename === targetFilename) {
      setView('hub')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Application Header */}
      <Header
        isTauri={isTauri}
        apiOnline={apiOnline}
        onNavigateHub={() => {
          setStagedUpload(null)
          setView('hub')
        }}
        onNavigateGuide={() => {
          setStagedUpload(null)
          setView(view === 'guide' ? 'hub' : 'guide')
        }}
        isGuideActive={view === 'guide'}
        onRefreshHealth={checkHealth}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        onOpenSettings={(tab) => setSettingsModal({ isOpen: true, initialTab: tab || 'ai' })}
      />

      {/* API Offline Warning Banner */}
      {!apiOnline && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>
                <strong>Backend API Disconnected:</strong> The SAES backend service is offline.
                Connect to http://127.0.0.1:8060 for schema validation and automated hypothesis
                testing.
              </span>
            </div>
            <button
              type="button"
              onClick={checkHealth}
              className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-800/60 text-rose-900 dark:text-rose-200 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
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
            onOpenGuide={() => setView('guide')}
          />
        )}

        {/* VIEW 1B: INTERACTIVE GUIDE & TUTORIAL */}
        {view === 'guide' && (
          <GuideView
            apiOnline={apiOnline}
            onBackToHub={() => setView('hub')}
            onTryExample={async (csvContent, exampleFilename) => {
              await uploadAndLoadDataset(csvContent, exampleFilename)
              setWorkspaceTab('data')
              setView('visualize')
            }}
            onOpenChat={() => setIsChatOpen(true)}
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
            onBack={() => setView(editorOriginView)}
            backLabel={editorOriginView === 'visualize' ? 'Back to Analysis' : 'Back to Datasets'}
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
            selectedDatasetFilename={selectedDatasetFilename}
            rawCsv={rawCsv}
            records={records}
            summary={summary}
            analysis={analysis}
            alpha={alpha}
            isAnalyzing={isAnalyzing}
            apiOnline={apiOnline}
            activeTab={workspaceTab}
            onTabChange={setWorkspaceTab}
            initialTestType={agentTestType}
            initialTableType={agentTableType}
            initialMetric={agentMetric}
            onAlphaChange={setAlpha}
            onRunAnalysis={runAnalysis}
            onBackToHub={() => setView('hub')}
            onOpenEditor={() => {
              setEditorOriginView('visualize')
              setView('editor')
            }}
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
          {isChatLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-300" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>
            {isChatLoading ? 'Advisor is generating response...' : 'Ask Statistical Consultant'}
          </span>
        </button>
      )}

      {/* Embedded AI Consultant Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        isLoading={isChatLoading}
        error={chatError}
        attachment={chatAttachment}
        onAttachFile={attachChatFile}
        onClearAttachment={clearChatAttachment}
        onSendMessage={sendChatMessage}
        onClearHistory={clearChatHistory}
        onOpenSettings={() => setSettingsModal({ isOpen: true, initialTab: 'ai' })}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModal.isOpen}
        onClose={() => setSettingsModal((prev) => ({ ...prev, isOpen: false }))}
        apiOnline={apiOnline}
        onRefreshHealth={checkHealth}
        initialTab={settingsModal.initialTab}
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
