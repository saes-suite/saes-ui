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

export interface AssumptionResult {
  name: string
  statistic: number
  p_value: number
  passed: boolean
  alpha: number
  details?: string
}

export interface DiagnosticAssumptions {
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
  interpretation?: string
  group_summaries?: Record<string, Record<string, number>>
  // Extended diagnostic details (formatted from backend assumptions for UI drilldown)
  assumptions?: DiagnosticAssumptions
  raw_assumptions?: AssumptionResult[]
}

export interface AnalysisResponse {
  cells_count: number
  results: CellAnalysis[]
}

export interface AlgorithmRankItem {
  algorithm: string
  avg_rank: number
  mean_value: number
}

export interface CriticalDistanceResult {
  metric: string
  scope: string
  scope_label: string
  metrics_list: string[]
  instances_list: string[]
  metrics_label: string
  instances_label: string
  params_label: string
  alpha: number
  k: number
  n_blocks: number
  cd: number
  friedman_stat: number
  friedman_p_value: number
  iman_davenport_f: number
  iman_davenport_p_value: number
  maximize: boolean
  ranks: AlgorithmRankItem[]
  cliques: [number, number][]
}

export interface BayesianPosteriorItem {
  algorithm: string
  mean_rank: number
  median_rank: number
  ci_lower: number
  ci_upper: number
  q25: number
  q75: number
  prob_best: number
  prob_better_than_ref: number
  prob_rope_with_ref: number
  samples: number[]
}

export interface BayesianRankResult {
  metric: string
  scope: string
  scope_label: string
  bayesian_method?: 'sign' | 'signed-rank' | string
  metrics_list: string[]
  instances_list: string[]
  metrics_label: string
  instances_label: string
  params_label: string
  k: number
  n_blocks: number
  rope_percent: number
  reference_algo: string
  maximize: boolean
  algo_a: string
  algo_b: string
  algorithms: string[]
  p_left: number
  p_rope: number
  p_right: number
  label_left: string
  label_rope: string
  label_right: string
  points_x: number[]
  points_y: number[]
  points_density: number[]
  points_p_left: number[]
  points_p_rope: number[]
  points_p_right: number[]
  triangle_x: number[]
  triangle_y: number[]
  boundary_lines: [number, number, number, number][]
  items: BayesianPosteriorItem[]
}

export interface RankingAnalysisResponse {
  critical_distance: CriticalDistanceResult
  bayesian_ranking: BayesianRankResult
  bayesian_sign?: BayesianRankResult
  bayesian_signed_rank?: BayesianRankResult
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

export type AIProvider = 'local' | 'openai' | 'anthropic' | 'gemini' | 'offline'

export interface AISettings {
  provider: AIProvider
  localBaseUrl: string
  localModel: string
  openaiApiKey: string
  openaiModel: string
  openaiBaseUrl?: string
  anthropicApiKey: string
  anthropicModel: string
  geminiApiKey: string
  geminiModel: string
}

export interface ChatRequest {
  query: string
  dataset_name?: string | null
  csv_data?: string | null
  alpha?: number
  provider?: AIProvider | string
  model?: string | null
  api_key?: string | null
  base_url?: string | null
}

export interface ChatResponse {
  response: string
  context_used: boolean
}

export interface LocalModelsResponse {
  models: string[]
  status: string
}

export interface ProviderProbeResponse {
  status: string
  models: string[]
  message?: string | null
  can_start_ollama?: boolean
  binary_path?: string | null
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
