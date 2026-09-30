import Papa from 'papaparse'

export const REQUIRED_COLUMNS = [
  'algorithm',
  'instance',
  'metric',
  'run_id',
  'value',
  'maximize',
] as const

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number]

export type ColumnType = 'categorical' | 'integer' | 'float' | 'boolean' | 'unknown'

export interface ColumnAnalysis {
  index: number
  name: string
  detectedType: ColumnType
  typeConfidence: number
  sampleValues: string[]
  categories: string[]
  categoryCount: number
  numericRange?: { min: number; max: number }
  emptyCount: number
  totalValues: number
}

export interface DatasetStructureResult {
  columnCount: number
  rawHeaders: string[]
  requiredColumns: readonly string[]
  matchedColumns: Record<string, string> // requiredCol -> headerCol
  unmatchedRequired: string[] // required cols not matched by exact name
  unmappedHeaders: string[] // headers in CSV not matched to any required col
  columnsAnalysis: Record<string, ColumnAnalysis>
  suggestedMapping: Record<string, string> // requiredCol -> headerCol
  isExactSchemaMatch: boolean
  isMissingEntireColumn: boolean
  missingColumnsList: string[]
  canMapColumns: boolean
  rejectionReason?: string
}

export interface RowIssue {
  rowIndex: number // 1-indexed (line 2 of file is row 1)
  column: string
  issueType: 'EMPTY_CELL' | 'NAN_VALUE' | 'INVALID_INTEGER' | 'INVALID_BOOLEAN' | 'INVALID_TYPE'
  foundValue: string
  message: string
}

export interface ProblematicRowData {
  rowIndex: number // 1-indexed (line 2 of file is row 1)
  cells: {
    algorithm: string
    instance: string
    metric: string
    run_id: string
    value: string
    maximize: string
  }
  issues: Record<string, RowIssue>
}

export interface RowAnalysisResult {
  totalRows: number
  validRowsCount: number
  problematicRowsCount: number
  isValid: boolean
  issues: RowIssue[]
  problematicRowIndices: number[]
  problematicRows: ProblematicRowData[]
  issuesByRow: Record<number, Record<string, RowIssue>>
  rawRowsWithIndex: Array<{ rowIndex: number; cells: Record<string, string> }>
  incompleteRowsCount: number
  nanValuesCount: number
  typeMismatchCount: number
}

const BOOLEAN_KEYWORDS = new Set([
  'true',
  'false',
  '1',
  '0',
  'yes',
  'no',
  'y',
  'n',
  't',
  'f',
  'si',
  'max',
  'min',
])

/**
 * Inspects values of a single column to detect its type, cardinality, and categories.
 */
export function analyzeColumnData(name: string, index: number, values: string[]): ColumnAnalysis {
  const total = values.length
  let emptyCount = 0
  const nonEmptyValues: string[] = []

  for (const v of values) {
    if (v === undefined || v === null || String(v).trim() === '') {
      emptyCount++
    } else {
      nonEmptyValues.push(String(v).trim())
    }
  }

  const sampleValues = nonEmptyValues.slice(0, 5)

  if (nonEmptyValues.length === 0) {
    return {
      index,
      name,
      detectedType: 'unknown',
      typeConfidence: 0,
      sampleValues: [],
      categories: [],
      categoryCount: 0,
      emptyCount,
      totalValues: total,
    }
  }

  // 1. Test for Boolean
  const WORD_BOOLEANS = new Set([
    'true',
    'false',
    'yes',
    'no',
    'y',
    'n',
    't',
    'f',
    'si',
    'max',
    'min',
  ])
  const hasWordBoolean = nonEmptyValues.some((v) => WORD_BOOLEANS.has(v.toLowerCase()))
  const boolMatches = nonEmptyValues.filter((v) => BOOLEAN_KEYWORDS.has(v.toLowerCase()))
  const isHeaderBoolean = /^(is_|has_|flag|max|opt|dir)/i.test(name)

  if (boolMatches.length / nonEmptyValues.length >= 0.9 && (hasWordBoolean || isHeaderBoolean)) {
    const distinctBools = Array.from(new Set(nonEmptyValues.map((v) => v.toLowerCase())))
    if (distinctBools.length <= 4) {
      return {
        index,
        name,
        detectedType: 'boolean',
        typeConfidence: boolMatches.length / nonEmptyValues.length,
        sampleValues,
        categories: distinctBools,
        categoryCount: distinctBools.length,
        emptyCount,
        totalValues: total,
      }
    }
  }

  // 2. Test for Integer
  const intRegex = /^-?\d+$/
  const intMatches = nonEmptyValues.filter((v) => intRegex.test(v))
  if (intMatches.length === nonEmptyValues.length) {
    const nums = nonEmptyValues.map((v) => parseInt(v, 10))
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    return {
      index,
      name,
      detectedType: 'integer',
      typeConfidence: 1.0,
      sampleValues,
      categories: [],
      categoryCount: 0,
      numericRange: { min, max },
      emptyCount,
      totalValues: total,
    }
  }

  // 3. Test for Float / Numeric
  const floatMatches = nonEmptyValues.filter((v) => !isNaN(Number(v)))
  if (floatMatches.length / nonEmptyValues.length >= 0.95) {
    const nums = floatMatches.map((v) => Number(v))
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    return {
      index,
      name,
      detectedType: 'float',
      typeConfidence: floatMatches.length / nonEmptyValues.length,
      sampleValues,
      categories: [],
      categoryCount: 0,
      numericRange: { min, max },
      emptyCount,
      totalValues: total,
    }
  }

  // 4. Default: Categorical / String
  const uniqueSet = new Set(nonEmptyValues)
  const categories = Array.from(uniqueSet)

  return {
    index,
    name,
    detectedType: 'categorical',
    typeConfidence: 0.95,
    sampleValues,
    categories,
    categoryCount: categories.length,
    emptyCount,
    totalValues: total,
  }
}

/**
 * Inspects overall CSV dataset structure, column count, and suggests intelligent mapping.
 */
export function inspectDatasetStructure(rawCsv: string): DatasetStructureResult {
  if (!rawCsv || !rawCsv.trim()) {
    return {
      columnCount: 0,
      rawHeaders: [],
      requiredColumns: REQUIRED_COLUMNS,
      matchedColumns: {},
      unmatchedRequired: [...REQUIRED_COLUMNS],
      unmappedHeaders: [],
      columnsAnalysis: {},
      suggestedMapping: {},
      isExactSchemaMatch: false,
      isMissingEntireColumn: true,
      missingColumnsList: [...REQUIRED_COLUMNS],
      canMapColumns: false,
      rejectionReason: 'Dataset is empty.',
    }
  }

  const parsed = Papa.parse<string[]>(rawCsv.trim(), {
    skipEmptyLines: false,
  })

  if (!parsed.data || parsed.data.length === 0) {
    return {
      columnCount: 0,
      rawHeaders: [],
      requiredColumns: REQUIRED_COLUMNS,
      matchedColumns: {},
      unmatchedRequired: [...REQUIRED_COLUMNS],
      unmappedHeaders: [],
      columnsAnalysis: {},
      suggestedMapping: {},
      isExactSchemaMatch: false,
      isMissingEntireColumn: true,
      missingColumnsList: [...REQUIRED_COLUMNS],
      canMapColumns: false,
      rejectionReason: 'No data rows found in CSV file.',
    }
  }

  const rawHeaders = (parsed.data[0] || []).map((h) => h.trim())
  const rows = parsed.data.slice(1).filter((r) => r.some((c) => c && c.trim().length > 0))

  const columnCount = rawHeaders.length
  const columnsAnalysis: Record<string, ColumnAnalysis> = {}

  for (let j = 0; j < rawHeaders.length; j++) {
    const colName = rawHeaders[j] || `Col_${j + 1}`
    const colValues = rows.map((r) => (r[j] !== undefined ? r[j] : ''))
    columnsAnalysis[colName] = analyzeColumnData(colName, j, colValues)
  }

  // Exact matching checks
  const matchedColumns: Record<string, string> = {}
  const usedHeaders = new Set<string>()

  for (const reqCol of REQUIRED_COLUMNS) {
    const foundHeader = rawHeaders.find(
      (h) => h.toLowerCase() === reqCol.toLowerCase() && !usedHeaders.has(h)
    )
    if (foundHeader) {
      matchedColumns[reqCol] = foundHeader
      usedHeaders.add(foundHeader)
    }
  }

  const unmatchedRequired = REQUIRED_COLUMNS.filter((req) => !matchedColumns[req])
  const unmappedHeaders = rawHeaders.filter((h) => !usedHeaders.has(h))

  const isExactSchemaMatch =
    unmatchedRequired.length === 0 && columnCount >= REQUIRED_COLUMNS.length

  // Case 1: Falta una columna entera (columnCount < 6)
  // O el número total de columnas es menor que las requeridas
  const isMissingEntireColumn = columnCount < REQUIRED_COLUMNS.length
  const missingColumnsList: string[] = []

  if (isMissingEntireColumn) {
    // Determine which required columns are not found
    for (const req of REQUIRED_COLUMNS) {
      if (!matchedColumns[req]) {
        missingColumnsList.push(req)
      }
    }
  }

  // Case 2: El número de columnas es el correcto (columnCount >= 6), pero no coinciden los nombres
  const canMapColumns = !isExactSchemaMatch && columnCount >= REQUIRED_COLUMNS.length

  // Build intelligent suggested mapping
  const suggestedMapping: Record<string, string> = { ...matchedColumns }
  const availableCandidates = [...unmappedHeaders]

  if (canMapColumns) {
    // Scoring function for candidate columns
    const calculateScore = (reqCol: RequiredColumn, colName: string): number => {
      const analysis = columnsAnalysis[colName]
      if (!analysis) return 0
      let score = 0
      const lower = colName.toLowerCase()

      switch (reqCol) {
        case 'maximize':
          if (analysis.detectedType === 'boolean') score += 60
          if (
            lower.includes('max') ||
            lower.includes('opt') ||
            lower.includes('dir') ||
            lower.includes('goal')
          )
            score += 40
          break

        case 'run_id':
          if (analysis.detectedType === 'integer') score += 50
          if (
            analysis.numericRange &&
            analysis.numericRange.min >= 0 &&
            analysis.numericRange.max <= 1000
          )
            score += 20
          if (
            lower.includes('run') ||
            lower.includes('rep') ||
            lower.includes('iter') ||
            lower.includes('id') ||
            lower.includes('trial') ||
            lower.includes('seed') ||
            lower.includes('ejec')
          )
            score += 40
          break

        case 'value':
          if (analysis.detectedType === 'float') score += 60
          else if (analysis.detectedType === 'integer') score += 20
          if (
            lower.includes('val') ||
            lower.includes('fit') ||
            lower.includes('score') ||
            lower.includes('res') ||
            lower.includes('perf') ||
            lower.includes('obj') ||
            lower.includes('cost') ||
            lower.includes('loss')
          )
            score += 40
          break

        case 'algorithm':
          if (analysis.detectedType === 'categorical') score += 40
          if (
            lower.includes('alg') ||
            lower.includes('model') ||
            lower.includes('solver') ||
            lower.includes('method') ||
            lower.includes('technique')
          )
            score += 50
          break

        case 'instance':
          if (analysis.detectedType === 'categorical') score += 40
          if (
            lower.includes('inst') ||
            lower.includes('prob') ||
            lower.includes('dataset') ||
            lower.includes('bench') ||
            lower.includes('func') ||
            lower.includes('case') ||
            lower.includes('task')
          )
            score += 50
          break

        case 'metric':
          if (analysis.detectedType === 'categorical') score += 40
          if (
            lower.includes('metr') ||
            lower.includes('meas') ||
            lower.includes('indic') ||
            lower.includes('criterion')
          )
            score += 50
          break
      }

      return score
    }

    // Match priority order: specialized types first (maximize, run_id, value), then categoricals
    const priorityOrder: RequiredColumn[] = [
      'maximize',
      'run_id',
      'value',
      'algorithm',
      'instance',
      'metric',
    ]

    for (const req of priorityOrder) {
      if (!suggestedMapping[req] && availableCandidates.length > 0) {
        let bestCol: string | null = null
        let bestScore = -1

        for (const cand of availableCandidates) {
          const score = calculateScore(req, cand)
          if (score > bestScore) {
            bestScore = score
            bestCol = cand
          }
        }

        if (bestCol) {
          suggestedMapping[req] = bestCol
          const idx = availableCandidates.indexOf(bestCol)
          if (idx >= 0) availableCandidates.splice(idx, 1)
        }
      }
    }

    // Assign any remaining unmapped
    for (const req of REQUIRED_COLUMNS) {
      if (!suggestedMapping[req] && availableCandidates.length > 0) {
        suggestedMapping[req] = availableCandidates.shift()!
      }
    }
  }

  let rejectionReason: string | undefined
  if (isMissingEntireColumn) {
    const missingStr = missingColumnsList.join(', ')
    rejectionReason = `The file contains only ${columnCount} column(s) (at least 6 are required). Missing required column(s): '${missingStr}'.`
  }

  return {
    columnCount,
    rawHeaders,
    requiredColumns: REQUIRED_COLUMNS,
    matchedColumns,
    unmatchedRequired,
    unmappedHeaders,
    columnsAnalysis,
    suggestedMapping,
    isExactSchemaMatch,
    isMissingEntireColumn,
    missingColumnsList,
    canMapColumns,
    rejectionReason,
  }
}

/**
 * Rewrites raw CSV using the confirmed mapping, renaming columns to SAES standard:
 * algorithm, instance, metric, run_id, value, maximize
 * Also normalizes boolean values in the 'maximize' column.
 */
export function applyColumnMapping(rawCsv: string, mapping: Record<string, string>): string {
  const parsed = Papa.parse<string[]>(rawCsv.trim(), {
    skipEmptyLines: true,
  })

  if (!parsed.data || parsed.data.length === 0) return rawCsv

  const originalHeaders = parsed.data[0].map((h) => h.trim())
  const rows = parsed.data.slice(1)

  const headerIndices: Record<string, number> = {}
  originalHeaders.forEach((h, idx) => {
    headerIndices[h] = idx
  })

  const standardHeaders = ['algorithm', 'instance', 'metric', 'run_id', 'value', 'maximize']
  const outputRows: string[][] = [standardHeaders]

  const algCol = mapping['algorithm']
  const instCol = mapping['instance']
  const metrCol = mapping['metric']
  const runCol = mapping['run_id']
  const valCol = mapping['value']
  const maxCol = mapping['maximize']

  const algIdx = algCol ? headerIndices[algCol] : -1
  const instIdx = instCol ? headerIndices[instCol] : -1
  const metrIdx = metrCol ? headerIndices[metrCol] : -1
  const runIdx = runCol ? headerIndices[runCol] : -1
  const valIdx = valCol ? headerIndices[valCol] : -1
  const maxIdx = maxCol ? headerIndices[maxCol] : -1

  for (const r of rows) {
    if (r.length === 0 || !r.some((c) => c && c.trim().length > 0)) continue

    const algVal = algIdx >= 0 && r[algIdx] !== undefined ? r[algIdx].trim() : ''
    const instVal = instIdx >= 0 && r[instIdx] !== undefined ? r[instIdx].trim() : ''
    const metrVal = metrIdx >= 0 && r[metrIdx] !== undefined ? r[metrIdx].trim() : ''
    const runVal = runIdx >= 0 && r[runIdx] !== undefined ? r[runIdx].trim() : ''
    const valVal = valIdx >= 0 && r[valIdx] !== undefined ? r[valIdx].trim() : ''

    // Normalize maximize boolean
    let maxVal = maxIdx >= 0 && r[maxIdx] !== undefined ? r[maxIdx].trim() : 'False'
    const lowerMax = maxVal.toLowerCase()
    if (['true', '1', 'yes', 'y', 't', 'si', 'max'].includes(lowerMax)) {
      maxVal = 'True'
    } else if (['false', '0', 'no', 'n', 'f', 'min'].includes(lowerMax)) {
      maxVal = 'False'
    }

    outputRows.push([algVal, instVal, metrVal, runVal, valVal, maxVal])
  }

  return Papa.unparse(outputRows)
}

/**
 * Performs deep row-by-row analysis:
 * - Incomplete rows (empty / missing cells)
 * - NaN / non-numeric values in numeric columns
 * - Type inconsistencies in run_id, value, maximize, etc.
 */
export function analyzeRowByRow(rawCsv: string): RowAnalysisResult {
  const result: RowAnalysisResult = {
    totalRows: 0,
    validRowsCount: 0,
    problematicRowsCount: 0,
    isValid: true,
    issues: [],
    problematicRowIndices: [],
    problematicRows: [],
    issuesByRow: {},
    rawRowsWithIndex: [],
    incompleteRowsCount: 0,
    nanValuesCount: 0,
    typeMismatchCount: 0,
  }

  if (!rawCsv || !rawCsv.trim()) {
    result.isValid = false
    return result
  }

  const parsed = Papa.parse<string[]>(rawCsv.trim(), {
    skipEmptyLines: false,
  })

  if (!parsed.data || parsed.data.length <= 1) {
    result.isValid = false
    return result
  }

  const headers = parsed.data[0].map((h) => h.trim().toLowerCase())
  const rows = parsed.data.slice(1)

  const algIdx = headers.indexOf('algorithm')
  const instIdx = headers.indexOf('instance')
  const metrIdx = headers.indexOf('metric')
  const runIdx = headers.indexOf('run_id')
  const valIdx = headers.indexOf('value')
  const maxIdx = headers.indexOf('maximize')

  result.totalRows = rows.length
  const problematicRowIndices = new Set<number>()
  const issuesByRow: Record<number, Record<string, RowIssue>> = {}
  const problematicRowsMap = new Map<number, ProblematicRowData>()
  const rawRowsWithIndex: Array<{ rowIndex: number; cells: Record<string, string> }> = []

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1 // 1-indexed row number
    const row = rows[i] || []

    const cellMap = {
      algorithm: algIdx >= 0 && row[algIdx] !== undefined ? row[algIdx] : '',
      instance: instIdx >= 0 && row[instIdx] !== undefined ? row[instIdx] : '',
      metric: metrIdx >= 0 && row[metrIdx] !== undefined ? row[metrIdx] : '',
      run_id: runIdx >= 0 && row[runIdx] !== undefined ? row[runIdx] : '',
      value: valIdx >= 0 && row[valIdx] !== undefined ? row[valIdx] : '',
      maximize: maxIdx >= 0 && row[maxIdx] !== undefined ? row[maxIdx] : '',
    }

    const fullCellMap: Record<string, string> = {}
    headers.forEach((h, hIdx) => {
      fullCellMap[h] = row[hIdx] !== undefined ? row[hIdx] : ''
    })
    rawRowsWithIndex.push({ rowIndex: rowNumber, cells: fullCellMap })

    const recordIssue = (issue: RowIssue) => {
      problematicRowIndices.add(issue.rowIndex)
      result.issues.push(issue)
      if (!issuesByRow[issue.rowIndex]) {
        issuesByRow[issue.rowIndex] = {}
      }
      issuesByRow[issue.rowIndex][issue.column] = issue
      problematicRowsMap.set(issue.rowIndex, {
        rowIndex: issue.rowIndex,
        cells: cellMap,
        issues: issuesByRow[issue.rowIndex],
      })
    }

    // Empty row check
    if (row.length === 0 || row.every((c) => !c || c.trim() === '')) {
      result.incompleteRowsCount++
      recordIssue({
        rowIndex: rowNumber,
        column: 'all',
        issueType: 'EMPTY_CELL',
        foundValue: '',
        message: `Row ${rowNumber} is completely empty.`,
      })
      continue
    }

    // Check algorithm
    if (algIdx >= 0) {
      const val = row[algIdx] !== undefined ? row[algIdx].trim() : ''
      if (!val) {
        result.incompleteRowsCount++
        recordIssue({
          rowIndex: rowNumber,
          column: 'algorithm',
          issueType: 'EMPTY_CELL',
          foundValue: '',
          message: `Row ${rowNumber}: Empty cell in 'algorithm'.`,
        })
      }
    }

    // Check instance
    if (instIdx >= 0) {
      const val = row[instIdx] !== undefined ? row[instIdx].trim() : ''
      if (!val) {
        result.incompleteRowsCount++
        recordIssue({
          rowIndex: rowNumber,
          column: 'instance',
          issueType: 'EMPTY_CELL',
          foundValue: '',
          message: `Row ${rowNumber}: Empty cell in 'instance'.`,
        })
      }
    }

    // Check metric
    if (metrIdx >= 0) {
      const val = row[metrIdx] !== undefined ? row[metrIdx].trim() : ''
      if (!val) {
        result.incompleteRowsCount++
        recordIssue({
          rowIndex: rowNumber,
          column: 'metric',
          issueType: 'EMPTY_CELL',
          foundValue: '',
          message: `Row ${rowNumber}: Empty cell in 'metric'.`,
        })
      }
    }

    // Check run_id
    if (runIdx >= 0) {
      const val = row[runIdx] !== undefined ? row[runIdx].trim() : ''
      if (!val) {
        result.incompleteRowsCount++
        recordIssue({
          rowIndex: rowNumber,
          column: 'run_id',
          issueType: 'EMPTY_CELL',
          foundValue: '',
          message: `Row ${rowNumber}: Empty cell in 'run_id'.`,
        })
      } else {
        const intRegex = /^-?\d+$/
        if (!intRegex.test(val)) {
          result.typeMismatchCount++
          recordIssue({
            rowIndex: rowNumber,
            column: 'run_id',
            issueType: 'INVALID_INTEGER',
            foundValue: val,
            message: `Row ${rowNumber}: 'run_id' must be a non-negative integer. Found: '${val}'.`,
          })
        } else {
          const num = parseInt(val, 10)
          if (num < 0) {
            result.typeMismatchCount++
            recordIssue({
              rowIndex: rowNumber,
              column: 'run_id',
              issueType: 'INVALID_INTEGER',
              foundValue: val,
              message: `Row ${rowNumber}: 'run_id' cannot be negative (${num}).`,
            })
          }
        }
      }
    }

    // Check value
    if (valIdx >= 0) {
      const val = row[valIdx] !== undefined ? row[valIdx].trim() : ''
      if (!val) {
        result.incompleteRowsCount++
        recordIssue({
          rowIndex: rowNumber,
          column: 'value',
          issueType: 'EMPTY_CELL',
          foundValue: '',
          message: `Row ${rowNumber}: Empty cell or missing value in 'value'.`,
        })
      } else if (isNaN(Number(val))) {
        result.nanValuesCount++
        recordIssue({
          rowIndex: rowNumber,
          column: 'value',
          issueType: 'NAN_VALUE',
          foundValue: val,
          message: `Row ${rowNumber}: 'value' contains a non-numeric / NaN value: '${val}'.`,
        })
      }
    }

    // Check maximize
    if (maxIdx >= 0) {
      const val = row[maxIdx] !== undefined ? row[maxIdx].trim() : ''
      if (!val) {
        result.incompleteRowsCount++
        recordIssue({
          rowIndex: rowNumber,
          column: 'maximize',
          issueType: 'EMPTY_CELL',
          foundValue: '',
          message: `Row ${rowNumber}: Empty cell in 'maximize'.`,
        })
      } else {
        const lower = val.toLowerCase()
        if (!['true', 'false', '1', '0', 'yes', 'no', 't', 'f', 'max', 'min'].includes(lower)) {
          result.typeMismatchCount++
          recordIssue({
            rowIndex: rowNumber,
            column: 'maximize',
            issueType: 'INVALID_BOOLEAN',
            foundValue: val,
            message: `Row ${rowNumber}: 'maximize' contains an invalid boolean value: '${val}'.`,
          })
        }
      }
    }
  }

  result.problematicRows = Array.from(problematicRowsMap.values()).sort(
    (a, b) => a.rowIndex - b.rowIndex
  )
  result.problematicRowsCount = result.problematicRows.length
  result.problematicRowIndices = result.problematicRows.map((r) => r.rowIndex)
  result.validRowsCount = Math.max(0, result.totalRows - result.problematicRowsCount)
  result.isValid = result.problematicRowsCount === 0 && result.totalRows > 0
  result.issuesByRow = issuesByRow
  result.rawRowsWithIndex = rawRowsWithIndex

  return result
}

/**
 * Removes all problematic rows from the CSV, leaving only 100% valid rows.
 */
export function cleanProblematicRows(rawCsv: string): {
  cleanedCsv: string
  droppedRowsCount: number
} {
  const analysis = analyzeRowByRow(rawCsv)
  if (analysis.problematicRowsCount === 0) {
    return { cleanedCsv: rawCsv, droppedRowsCount: 0 }
  }

  const badIndices = new Set(analysis.issues.map((i) => i.rowIndex))

  const parsed = Papa.parse<string[]>(rawCsv.trim(), {
    skipEmptyLines: false,
  })

  if (!parsed.data || parsed.data.length <= 1) {
    return { cleanedCsv: rawCsv, droppedRowsCount: 0 }
  }

  const header = parsed.data[0]
  const rows = parsed.data.slice(1)
  const keptRows: string[][] = [header]

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1
    if (!badIndices.has(rowNumber)) {
      keptRows.push(rows[i])
    }
  }

  const droppedRowsCount = rows.length - (keptRows.length - 1)
  return {
    cleanedCsv: Papa.unparse(keptRows),
    droppedRowsCount,
  }
}

/**
 * Takes the raw CSV, applies cell modifications per rowIndex (1-indexed) and drops any row in deletedRowIndices.
 * Returns the updated CSV string.
 */
export function saveRowEditsToCsv(
  rawCsv: string,
  edits: Record<number, Record<string, string>>,
  deletedRowIndices: Set<number> = new Set()
): string {
  const parsed = Papa.parse<string[]>(rawCsv.trim(), {
    skipEmptyLines: false,
  })

  if (!parsed.data || parsed.data.length <= 1) {
    return rawCsv
  }

  const header = parsed.data[0]
  const lowerHeader = header.map((h) => h.trim().toLowerCase())
  const rows = parsed.data.slice(1)

  const updatedRows: string[][] = [header]

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1
    if (deletedRowIndices.has(rowNumber)) {
      continue
    }

    const row = [...(rows[i] || [])]
    const rowEdits = edits[rowNumber]

    if (rowEdits) {
      for (const [colName, newVal] of Object.entries(rowEdits)) {
        const colIdx = lowerHeader.indexOf(colName.toLowerCase())
        if (colIdx >= 0) {
          while (row.length <= colIdx) {
            row.push('')
          }
          row[colIdx] = newVal
        }
      }
    }

    updatedRows.push(row)
  }

  return Papa.unparse(updatedRows)
}

export interface CellIssueInfo {
  label: string
}

export function getCellValidationIssue(column: string, value: string): CellIssueInfo | null {
  const trimmed = value !== undefined && value !== null ? String(value).trim() : ''
  if (!trimmed) {
    return { label: 'Empty cell' }
  }
  if (column === 'run_id') {
    if (!/^-?\d+$/.test(trimmed) || parseInt(trimmed, 10) < 0) {
      return { label: 'Integer ≥ 0 required' }
    }
  }
  if (column === 'value') {
    if (isNaN(Number(trimmed))) {
      return { label: 'NaN / Non-numeric' }
    }
  }
  if (column === 'maximize') {
    const lower = trimmed.toLowerCase()
    if (!['true', 'false', '1', '0', 'yes', 'no', 't', 'f', 'max', 'min'].includes(lower)) {
      return { label: 'True or False required' }
    }
  }
  return null
}
