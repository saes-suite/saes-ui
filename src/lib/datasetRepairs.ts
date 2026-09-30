import Papa from 'papaparse'

export const REQUIRED_COLUMNS = [
  'algorithm',
  'instance',
  'metric',
  'run_id',
  'value',
  'maximize',
] as const

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

/**
 * Adds the 'value' column to CSV with either a fixed value or random numbers.
 */
export function addValueColumn(
  rawCsv: string,
  mode: 'fixed' | 'random_0_1' | 'random_0_100' | 'random_normal' = 'random_0_1',
  fixedVal: number = 0.0
): string {
  const lines = rawCsv.split(/\r?\n/)
  if (lines.length === 0) return rawCsv

  const headerLine = lines[0].trim()
  const headerCols = headerLine.split(',').map((c) => c.trim())

  // Check if 'value' is already there
  let valIdx = headerCols.findIndex((c) => c.toLowerCase() === 'value')
  if (valIdx === -1) {
    headerCols.push('value')
    valIdx = headerCols.length - 1
    lines[0] = headerCols.join(',')
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    let generatedVal: string
    if (mode === 'fixed') {
      generatedVal = fixedVal.toFixed(6)
    } else if (mode === 'random_0_100') {
      generatedVal = (Math.random() * 100).toFixed(6)
    } else if (mode === 'random_normal') {
      // Box-Muller transform
      const u = Math.max(1e-9, Math.random())
      const v = Math.random()
      const norm = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
      generatedVal = norm.toFixed(6)
    } else {
      // uniform 0-1
      generatedVal = Math.random().toFixed(6)
    }

    const rowCols = line.split(',')
    if (valIdx >= rowCols.length) {
      rowCols.push(generatedVal)
    } else {
      rowCols[valIdx] = generatedVal
    }
    lines[i] = rowCols.join(',')
  }

  return lines.join('\n')
}

/**
 * Fills any empty or missing cells in the 'maximize' column with False or True.
 */
export function fillEmptyMaximize(rawCsv: string, defaultValue: boolean = false): string {
  const lines = rawCsv.split(/\r?\n/)
  if (lines.length === 0) return rawCsv

  const headerCols = lines[0].split(',').map((c) => c.trim())
  let maxIdx = headerCols.findIndex((c) => c.toLowerCase() === 'maximize')

  if (maxIdx === -1) {
    headerCols.push('maximize')
    maxIdx = headerCols.length - 1
    lines[0] = headerCols.join(',')
  }

  const fillStr = defaultValue ? 'True' : 'False'

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const rowCols = line.split(',')
    while (rowCols.length <= maxIdx) {
      rowCols.push('')
    }

    const currentVal = rowCols[maxIdx].trim()
    if (currentVal === '' || (currentVal.toLowerCase() !== 'true' && currentVal.toLowerCase() !== 'false')) {
      rowCols[maxIdx] = fillStr
    }

    lines[i] = rowCols.join(',')
  }

  return lines.join('\n')
}

/**
 * Infers 'maximize' from known rows for each metric, and fills remaining empty cells with False.
 */
export function inferAndFillMaximize(rawCsv: string): string {
  const lines = rawCsv.split(/\r?\n/)
  if (lines.length === 0) return rawCsv

  const headerCols = lines[0].split(',').map((c) => c.trim())
  const metricIdx = headerCols.findIndex((c) => c.toLowerCase() === 'metric')
  let maxIdx = headerCols.findIndex((c) => c.toLowerCase() === 'maximize')

  if (maxIdx === -1) {
    return fillEmptyMaximize(rawCsv, false)
  }

  // Build a lookup of known maximize directions per metric
  const metricDirectionMap: Record<string, string> = {}
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const rowCols = line.split(',')
    const metric = metricIdx >= 0 && rowCols[metricIdx] ? rowCols[metricIdx].trim() : ''
    const maxVal = rowCols[maxIdx] ? rowCols[maxIdx].trim().toLowerCase() : ''
    if (metric && (maxVal === 'true' || maxVal === 'false')) {
      metricDirectionMap[metric] = maxVal === 'true' ? 'True' : 'False'
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const rowCols = line.split(',')
    while (rowCols.length <= maxIdx) {
      rowCols.push('')
    }

    const currentVal = rowCols[maxIdx].trim()
    if (currentVal === '' || (currentVal.toLowerCase() !== 'true' && currentVal.toLowerCase() !== 'false')) {
      const metric = metricIdx >= 0 && rowCols[metricIdx] ? rowCols[metricIdx].trim() : ''
      rowCols[maxIdx] = metricDirectionMap[metric] || 'False'
    }

    lines[i] = rowCols.join(',')
  }

  return lines.join('\n')
}

/**
 * Adds an arbitrary missing column to CSV with a default value.
 */
export function addMissingColumn(
  rawCsv: string,
  columnName: string,
  defaultValue: string = 'unknown'
): string {
  const lines = rawCsv.split(/\r?\n/)
  if (lines.length === 0) return rawCsv

  const headerCols = lines[0].split(',').map((c) => c.trim())
  const colIdx = headerCols.findIndex((c) => c.toLowerCase() === columnName.toLowerCase())

  if (colIdx >= 0) return rawCsv

  headerCols.push(columnName)
  lines[0] = headerCols.join(',')

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    lines[i] = `${line},${defaultValue}`
  }

  return lines.join('\n')
}
