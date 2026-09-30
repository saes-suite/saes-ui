import Papa from 'papaparse'
import { REQUIRED_COLUMNS } from './datasetInspection'

export { REQUIRED_COLUMNS }

export interface DetectedIssueInfo {
  missingColumns: string[]
  emptyMaximizeRows: number[]
  emptyValueRows: number[]
  invalidRunIdRows: number[]
  totalRows: number
}

/**
 * Directly inspects CSV text and parsed data to detect all schema and data corruptions.
 */
export function detectDatasetIssues(rawCsv: string): DetectedIssueInfo {
  const result: DetectedIssueInfo = {
    missingColumns: [],
    emptyMaximizeRows: [],
    emptyValueRows: [],
    invalidRunIdRows: [],
    totalRows: 0,
  }

  if (!rawCsv || !rawCsv.trim()) {
    result.missingColumns = [...REQUIRED_COLUMNS]
    return result
  }

  const lines = rawCsv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) {
    result.missingColumns = [...REQUIRED_COLUMNS]
    return result
  }

  // Parse header
  const headerLine = lines[0]
  const parsedHeader = Papa.parse<string[]>(headerLine).data[0] || []
  const headers = parsedHeader.map((h) => h.trim().toLowerCase())

  // Check required columns in header
  for (const reqCol of REQUIRED_COLUMNS) {
    if (!headers.includes(reqCol)) {
      result.missingColumns.push(reqCol)
    }
  }

  result.totalRows = Math.max(0, lines.length - 1)

  const runIdx = headers.indexOf('run_id')
  const valIdx = headers.indexOf('value')
  const maxIdx = headers.indexOf('maximize')

  // Inspect data rows (starting from line 2 / index 1)
  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1 // 1-indexed line number in file
    const parsedRow = Papa.parse<string[]>(lines[i]).data[0] || []

    // If maximize column exists in header, check for empty cells
    if (maxIdx >= 0) {
      const maxVal = parsedRow[maxIdx]
      if (maxVal === undefined || maxVal === null || maxVal.trim() === '') {
        result.emptyMaximizeRows.push(rowNumber)
      }
    }

    // If value column exists in header, check for empty or non-numeric values
    if (valIdx >= 0) {
      const val = parsedRow[valIdx]
      if (val === undefined || val === null || val.trim() === '' || isNaN(Number(val))) {
        result.emptyValueRows.push(rowNumber)
      }
    }

    // If run_id exists, check for invalid integer
    if (runIdx >= 0) {
      const rId = parsedRow[runIdx]
      if (rId === undefined || rId === null || rId.trim() === '' || isNaN(parseInt(rId, 10))) {
        result.invalidRunIdRows.push(rowNumber)
      }
    }
  }

  return result
}
