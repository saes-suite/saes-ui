/**
 * SAES Core Schema & TypeScript Interfaces
 * Mirroring saes.server.schemas and scientific domain definitions
 */

export type SeverityType = 'ERROR' | 'WARNING' | 'INFO'

export interface ValidationIssue {
  severity: SeverityType | string
  issue_type: string
  message: string
  column?: string | null
  row_index?: number | null
}

export interface ValidationResponse {
  is_valid: boolean
  error_count: number
  warning_count: number
  issues: ValidationIssue[]
}

export interface CellAnalysis {
  instance: string
  metric: string
  test_name: string
  statistic: number
  p_value: number
  degrees_of_freedom: number | [number, number] | string | null
  is_significant: boolean
  effect_size_name: string | null
  effect_size_value: number | null
  effect_size_magnitude: 'negligible' | 'small' | 'medium' | 'large' | string | null
  warnings: string[]
  // Extended diagnostic details (computed or enriched for UI drilldown)
  assumptions?: {
    normality?: {
      passed: boolean
      test: string
      p_values: Record<string, number>
    }
    homoscedasticity?: {
      passed: boolean
      test: string
      p_value: number
    }
    sample_sizes?: Record<string, number>
    decision_reasoning?: string
  }
}

export interface AnalysisResponse {
  cells_count: number
  results: CellAnalysis[]
}

export interface HealthResponse {
  status: string
  version: string
  service: string
}

export interface DatasetItem {
  name: string
  filename: string
  path: string
  size_bytes: number
  row_count?: number
  modified_at?: number
}

export interface DatasetDetail {
  name: string
  filename: string
  path: string
  size_bytes: number
  row_count: number
  content: string
}

export interface ChatRequest {
  query: string
  dataset_name?: string | null
  csv_data?: string | null
  alpha?: number
}

export interface ChatResponse {
  response: string
  context_used: boolean
}

export interface BenchmarkRecord {
  algorithm: string
  instance: string
  metric: string
  run_id: number
  value: number
  maximize: boolean
}

export interface DatasetSummary {
  rowCount: number
  algorithms: string[]
  instances: string[]
  metrics: string[]
  runsPerCell: number
  hasMissing: boolean
  filename?: string
}

export interface AppConfig {
  apiUrl: string
  alpha: number
  colorPalette: string
  chartFontScale: number
  theme: 'dark' | 'light'
}
