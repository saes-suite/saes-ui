import { useState, useCallback, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { apiClient } from '../api/client'
import {
  AnalysisResponse,
  BenchmarkRecord,
  DatasetItem,
  DatasetSummary,
  ValidationIssue,
  ValidationResponse,
} from '../api/types'
import { enrichCellWithAssumptions } from '../lib/stats'
import { detectDatasetIssues } from '../lib/datasetRepairs'
import { analyzeRowByRow, inspectDatasetStructure } from '../lib/datasetInspection'
import { clearWorkspaceCache } from '../lib/workspaceCache'

export interface DatasetValidityInfo {
  isValid: boolean
  errorCount: number
  warningCount: number
  missingColumns?: string[]
}

export interface AnalysisState {
  rawCsv: string
  filename: string
  records: BenchmarkRecord[]
  summary: DatasetSummary | null
  validation: ValidationResponse | null
  analysis: AnalysisResponse | null
  alpha: number
  isValidating: boolean
  isAnalyzing: boolean
  error: string | null
  apiOnline: boolean
  datasets: DatasetItem[]
  datasetsValidity: Record<string, DatasetValidityInfo>
  selectedDatasetFilename: string | null
  isLoadingDatasets: boolean
}

/**
 * Parses raw CSV into BenchmarkRecord objects, preserving observations even if
 * some columns (like 'value' or 'maximize') are missing or have empty values.
 */
function parseCsvRecords(csvText: string): BenchmarkRecord[] {
  if (!csvText.trim()) return []

  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  })

  const records: BenchmarkRecord[] = []
  parsed.data.forEach((row) => {
    // Keep row if at least one identification field is present
    if (
      row.algorithm ||
      row.instance ||
      row.metric ||
      row.run_id !== undefined ||
      row.value !== undefined
    ) {
      const parsedVal =
        row.value !== undefined && row.value !== null && row.value !== ''
          ? parseFloat(row.value)
          : NaN

      records.push({
        algorithm: String(row.algorithm || '').trim(),
        instance: String(row.instance || '').trim(),
        metric: String(row.metric || '').trim(),
        run_id: parseInt(row.run_id || '0', 10) || 0,
        value: parsedVal,
        maximize: String(row.maximize).toLowerCase() === 'true',
      })
    }
  })

  return records
}

/**
 * Builds a robust ValidationResponse by merging backend validation results with
 * direct frontend header and cell inspection.
 */
function buildValidationReport(
  backendResponse: ValidationResponse | null,
  csvText: string
): ValidationResponse {
  const issuesInfo = detectDatasetIssues(csvText)
  const issues: ValidationIssue[] = backendResponse ? [...backendResponse.issues] : []

  // If backend reported missing columns without specifying the column field, extract from message
  issues.forEach((issue) => {
    if (!issue.column && issue.message) {
      const match = issue.message.match(/Missing required column\(s\):\s*([a-zA-Z0-9_,\s]+)/i)
      if (match && match[1]) {
        issue.column = match[1].trim()
      }
    }
  })

  // Ensure missing columns detected on frontend are included
  issuesInfo.missingColumns.forEach((col) => {
    const alreadyPresent = issues.some(
      (i) =>
        i.column === col ||
        (i.issue_type.toLowerCase().includes('missing') &&
          i.message.toLowerCase().includes(col.toLowerCase()))
    )
    if (!alreadyPresent) {
      issues.push({
        severity: 'ERROR',
        issue_type: 'MissingColumns',
        column: col,
        message: `Missing required column(s): ${col}`,
      })
    }
  })

  // Ensure empty maximize cells detected on frontend are included
  if (issuesInfo.emptyMaximizeRows.length > 0) {
    const alreadyPresent = issues.some((i) => i.column === 'maximize')
    if (!alreadyPresent) {
      issues.push({
        severity: 'ERROR',
        issue_type: 'MissingValues',
        column: 'maximize',
        row_index: issuesInfo.emptyMaximizeRows[0],
        message: `Column 'maximize' contains ${issuesInfo.emptyMaximizeRows.length} empty or missing cell(s) (first at row ${issuesInfo.emptyMaximizeRows[0]}).`,
      })
    }
  }

  // Ensure empty value cells detected on frontend are included
  if (issuesInfo.emptyValueRows.length > 0 && !issuesInfo.missingColumns.includes('value')) {
    const alreadyPresent = issues.some((i) => i.column === 'value')
    if (!alreadyPresent) {
      issues.push({
        severity: 'ERROR',
        issue_type: 'MissingValues',
        column: 'value',
        row_index: issuesInfo.emptyValueRows[0],
        message: `Column 'value' contains ${issuesInfo.emptyValueRows.length} empty or invalid numeric cell(s).`,
      })
    }
  }

  // Ensure row-by-row consistency issues are represented as errors
  const rowAnalysis = analyzeRowByRow(csvText)
  rowAnalysis.issues.forEach((rIssue) => {
    const alreadyPresent = issues.some(
      (i) => i.column === rIssue.column && i.row_index === rIssue.rowIndex
    )
    if (!alreadyPresent) {
      issues.push({
        severity: 'ERROR',
        issue_type: rIssue.issueType,
        column: rIssue.column !== 'all' ? rIssue.column : null,
        row_index: rIssue.rowIndex,
        message: rIssue.message,
      })
    }
  })

  const errors = issues.filter((i) => i.severity.toUpperCase() === 'ERROR')
  const warnings = issues.filter((i) => i.severity.toUpperCase() === 'WARNING')

  return {
    is_valid: errors.length === 0,
    error_count: errors.length,
    warning_count: warnings.length,
    issues,
  }
}

function computeSummary(records: BenchmarkRecord[], filename: string): DatasetSummary {
  const algos = Array.from(new Set(records.map((r) => r.algorithm).filter((a) => a.length > 0)))
  const instances = Array.from(new Set(records.map((r) => r.instance).filter((i) => i.length > 0)))
  const metrics = Array.from(new Set(records.map((r) => r.metric).filter((m) => m.length > 0)))

  const runsPerCell =
    records.length > 0 && algos.length > 0 && instances.length > 0 && metrics.length > 0
      ? Math.round(records.length / (algos.length * instances.length * metrics.length))
      : 0

  return {
    rowCount: records.length,
    algorithms: algos,
    instances,
    metrics,
    runsPerCell,
    hasMissing: records.some((r) => isNaN(r.value)),
    filename,
  }
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    rawCsv: '',
    filename: '',
    records: [],
    summary: null,
    validation: null,
    analysis: null,
    alpha: 0.05,
    isValidating: false,
    isAnalyzing: false,
    error: null,
    apiOnline: false,
    datasets: [],
    datasetsValidity: {},
    selectedDatasetFilename: null,
    isLoadingDatasets: false,
  })

  // List saved datasets from backend and check their validity
  const fetchDatasets = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoadingDatasets: true }))
      const items = await apiClient.listDatasets()
      const validityMap: Record<string, DatasetValidityInfo> = {}

      await Promise.all(
        items.map(async (item) => {
          try {
            const detail = await apiClient.getDataset(item.filename)
            const structure = inspectDatasetStructure(detail.content)
            const rowCheck = analyzeRowByRow(detail.content)
            const isStructValid = !structure.isMissingEntireColumn && !structure.canMapColumns
            const isRowsValid = rowCheck.isValid

            let backendOk = true
            try {
              const bVal = await apiClient.validateDatasetFromPath(item.filename)
              backendOk = bVal.is_valid && bVal.error_count === 0
            } catch {
              backendOk = false
            }

            const isValid = isStructValid && isRowsValid && backendOk
            validityMap[item.filename] = {
              isValid,
              errorCount: isValid
                ? 0
                : Math.max(1, rowCheck.problematicRowsCount + (isStructValid ? 0 : 1)),
              warningCount: 0,
              missingColumns: structure.missingColumnsList,
            }
          } catch {
            validityMap[item.filename] = {
              isValid: false,
              errorCount: 1,
              warningCount: 0,
            }
          }
        })
      )

      setState((prev) => ({
        ...prev,
        datasets: items,
        datasetsValidity: validityMap,
        isLoadingDatasets: false,
      }))
    } catch {
      setState((prev) => ({ ...prev, isLoadingDatasets: false }))
    }
  }, [])

  const apiOnlineRef = useRef(false)
  const initialDatasetsFetchedRef = useRef(false)

  // Check API health on startup and periodically (without re-fetching and re-validating all datasets repeatedly)
  const checkHealth = useCallback(async () => {
    try {
      const res = await apiClient.getHealth()
      const isOnline = res.status === 'ok'
      const wasOnline = apiOnlineRef.current
      apiOnlineRef.current = isOnline
      setState((prev) => ({ ...prev, apiOnline: isOnline }))
      // Fetch datasets only on initial connect or when connection is restored after being offline
      if (isOnline && (!initialDatasetsFetchedRef.current || !wasOnline)) {
        initialDatasetsFetchedRef.current = true
        fetchDatasets()
      }
    } catch {
      apiOnlineRef.current = false
      setState((prev) => ({ ...prev, apiOnline: false }))
    }
  }, [fetchDatasets])

  useEffect(() => {
    checkHealth()
    // Poll faster while offline so the desktop sidecar connects as soon as it finishes booting
    const intervalMs = state.apiOnline ? 30000 : 1500
    const timer = setInterval(checkHealth, intervalMs)
    return () => clearInterval(timer)
  }, [checkHealth, state.apiOnline])

  const setAlpha = useCallback((alpha: number) => {
    setState((prev) => ({ ...prev, alpha }))
  }, [])

  // Parse CSV text and load records & summary in-memory
  const loadCsvContent = useCallback((csvText: string, filename: string = 'benchmark.csv') => {
    try {
      const records = parseCsvRecords(csvText)
      const summary = computeSummary(records, filename)

      setState((prev) => ({
        ...prev,
        rawCsv: csvText,
        filename,
        records,
        summary,
        validation: null,
        analysis: null,
        error: null,
      }))
      return { records, summary }
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        error: `CSV Parsing error: ${err instanceof Error ? err.message : String(err)}`,
      }))
      return null
    }
  }, [])

  // Select an existing dataset from the backend path and validate it
  const selectDataset = useCallback(async (filename: string) => {
    if (!filename) {
      setState((prev) => ({
        ...prev,
        rawCsv: '',
        filename: '',
        records: [],
        summary: null,
        validation: null,
        analysis: null,
        selectedDatasetFilename: null,
      }))
      return
    }

    try {
      const detail = await apiClient.getDataset(filename)
      const records = parseCsvRecords(detail.content)
      const summary = computeSummary(records, detail.filename)

      let validation: ValidationResponse
      try {
        const backendVal = await apiClient.validateDatasetFromPath(detail.filename)
        validation = buildValidationReport(backendVal, detail.content)
      } catch {
        validation = buildValidationReport(null, detail.content)
      }

      setState((prev) => ({
        ...prev,
        rawCsv: detail.content,
        filename: detail.filename,
        records,
        summary,
        selectedDatasetFilename: detail.filename,
        validation,
        analysis: null,
      }))
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        error: `Failed to load dataset '${filename}': ${err instanceof Error ? err.message : String(err)}`,
      }))
    }
  }, [])

  // Upload a new dataset: persists, loads, and immediately validates without race conditions
  const uploadAndLoadDataset = useCallback(
    async (fileOrContent: File | string, filename: string = 'benchmark.csv') => {
      const csvText = typeof fileOrContent === 'string' ? fileOrContent : await fileOrContent.text()

      const records = parseCsvRecords(csvText)
      const summary = computeSummary(records, filename)

      let validation: ValidationResponse
      let selectedFilename = filename

      setState((prev) => ({
        ...prev,
        rawCsv: csvText,
        filename,
        records,
        summary,
        isValidating: true,
        error: null,
      }))

      if (state.apiOnline) {
        try {
          const item = await apiClient.uploadDataset(fileOrContent, filename)
          selectedFilename = item.filename
          const backendVal = await apiClient.validateCsv(csvText, item.filename)
          validation = buildValidationReport(backendVal, csvText)
          await fetchDatasets()
        } catch {
          validation = buildValidationReport(null, csvText)
        }
      } else {
        validation = buildValidationReport(null, csvText)
      }

      setState((prev) => ({
        ...prev,
        rawCsv: csvText,
        filename,
        records,
        summary,
        validation,
        selectedDatasetFilename: selectedFilename,
        isValidating: false,
      }))

      return { records, summary, validation }
    },
    [state.apiOnline, fetchDatasets]
  )

  // Delete a saved dataset from backend
  const deleteDataset = useCallback(
    async (filename: string) => {
      try {
        await apiClient.deleteDataset(filename)
        if (state.selectedDatasetFilename === filename) {
          setState((prev) => ({
            ...prev,
            rawCsv: '',
            filename: '',
            records: [],
            summary: null,
            validation: null,
            analysis: null,
            selectedDatasetFilename: null,
          }))
        }
        await fetchDatasets()
      } catch (err: unknown) {
        const is404 =
          (err as { response?: { status?: number } })?.response?.status === 404 ||
          (err instanceof Error && err.message.includes('404'))
        if (!is404) {
          setState((prev) => ({
            ...prev,
            error: `Failed to delete dataset '${filename}': ${err instanceof Error ? err.message : String(err)}`,
          }))
        }
        await fetchDatasets()
      }
    },
    [state.selectedDatasetFilename, fetchDatasets]
  )

  // Save dataset changes to backend and update validation
  // Save dataset changes to backend and update validation
  const saveDataset = useCallback(
    async (filename: string, content: string) => {
      clearWorkspaceCache(filename)
      const records = parseCsvRecords(content)
      const summary = computeSummary(records, filename)

      setState((prev) => ({
        ...prev,
        rawCsv: content,
        filename,
        records,
        summary,
        isValidating: true,
      }))

      let validation: ValidationResponse
      if (state.apiOnline) {
        try {
          await apiClient.saveDataset(filename, content)
        } catch {
          try {
            await apiClient.uploadDataset(content, filename)
          } catch {
            // ignore fallback error
          }
        }

        try {
          const backendVal = await apiClient.validateCsv(content, filename)
          validation = buildValidationReport(backendVal, content)
        } catch {
          validation = buildValidationReport(null, content)
        }

        setState((prev) => ({
          ...prev,
          selectedDatasetFilename: filename,
          validation,
          isValidating: false,
        }))
        await fetchDatasets()
        return
      } else {
        validation = buildValidationReport(null, content)
      }

      setState((prev) => ({
        ...prev,
        validation,
        isValidating: false,
      }))
    },
    [state.apiOnline, fetchDatasets]
  )

  // Update records in-memory and re-generate raw CSV
  const updateRecords = useCallback(
    (newRecords: BenchmarkRecord[], currentFilename?: string) => {
      const fn = currentFilename || state.filename || 'benchmark.csv'
      clearWorkspaceCache(fn)
      const rows = newRecords.map((r) => [
        r.algorithm,
        r.instance,
        r.metric,
        r.run_id,
        isNaN(r.value) ? '' : r.value,
        r.maximize ? 'True' : 'False',
      ])
      const newCsv = Papa.unparse({
        fields: ['algorithm', 'instance', 'metric', 'run_id', 'value', 'maximize'],
        data: rows,
      })
      const summary = computeSummary(newRecords, fn)

      setState((prev) => ({
        ...prev,
        rawCsv: newCsv,
        filename: fn,
        records: newRecords,
        summary,
        analysis: null,
      }))
    },
    [state.filename]
  )

  // Clear currently active dataset
  const clearDataset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      rawCsv: '',
      filename: '',
      records: [],
      summary: null,
      validation: null,
      analysis: null,
      selectedDatasetFilename: null,
    }))
  }, [])

  // Run validation directly on raw CSV
  const validateDataset = useCallback(
    async (customCsv?: string) => {
      const csvToValidate = customCsv !== undefined ? customCsv : state.rawCsv
      if (!csvToValidate) return

      setState((prev) => ({ ...prev, isValidating: true, error: null }))

      let response: ValidationResponse
      try {
        if (state.apiOnline) {
          const backendVal = await apiClient.validateCsv(
            csvToValidate,
            state.filename || 'benchmark.csv'
          )
          response = buildValidationReport(backendVal, csvToValidate)
        } else {
          response = buildValidationReport(null, csvToValidate)
        }

        setState((prev) => ({
          ...prev,
          validation: response,
          isValidating: false,
        }))
        return response
      } catch {
        response = buildValidationReport(null, csvToValidate)
        setState((prev) => ({
          ...prev,
          validation: response,
          isValidating: false,
        }))
        return response
      }
    },
    [state.rawCsv, state.filename, state.apiOnline]
  )

  // Run automated statistical analysis
  const runAnalysis = useCallback(async () => {
    if ((!state.rawCsv && !state.selectedDatasetFilename) || state.records.length === 0) return

    if (!state.apiOnline) {
      setState((prev) => ({
        ...prev,
        error:
          'API connection required: Cannot run analysis while backend is disconnected. Please connect the SAES API server.',
      }))
      return
    }

    setState((prev) => ({ ...prev, isAnalyzing: true, error: null }))

    try {
      let response: AnalysisResponse
      if (state.selectedDatasetFilename) {
        response = await apiClient.analyzeDatasetFromPath(
          state.selectedDatasetFilename,
          state.alpha
        )
      } else {
        response = await apiClient.analyzeCsv(state.rawCsv, state.alpha, state.filename)
      }

      // Enrich cells with assumption checks and reasoning
      const enrichedResults = response.results.map((cell) =>
        enrichCellWithAssumptions(cell, state.records, state.alpha)
      )

      setState((prev) => ({
        ...prev,
        analysis: {
          ...response,
          results: enrichedResults,
        },
        isAnalyzing: false,
      }))
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        error: `Analysis execution failed: ${err instanceof Error ? err.message : String(err)}`,
      }))
    }
  }, [
    state.rawCsv,
    state.records,
    state.alpha,
    state.filename,
    state.selectedDatasetFilename,
    state.apiOnline,
  ])

  return {
    ...state,
    setAlpha,
    loadCsvContent,
    uploadAndLoadDataset,
    selectDataset,
    deleteDataset,
    fetchDatasets,
    validateDataset,
    saveDataset,
    updateRecords,
    clearDataset,
    runAnalysis,
    checkHealth,
  }
}
