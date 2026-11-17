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

export type TableType = 'instance_algorithm' | 'pairwise_matrix' | 'omnibus_posthoc'

export type StatisticalTestType =
  | 'auto'
  | 'wilcoxon'
  | 'friedman'
  | 'mann_whitney'
  | 'kruskal'
  | 'anova_oneway'
  | 'anova_welch'
  | 'ttest_welch'
  | 'ttest_ind'
  | 'ttest_rel'

export type PostHocCorrectionType = 'holm' | 'bonferroni' | 'hochberg' | 'fdr_bh' | 'none'

export type SummaryStatMode = 'auto' | 'mean_std' | 'median_iqr'

export type TableExportFormat = 'pdf' | 'docx' | 'latex' | 'csv' | 'markdown' | 'html'
export type LatexDocumentMode = 'standalone' | 'snippet'
export type LatexNotation = 'scientific' | 'siunitx' | 'standard'

export interface BenchmarkTableCell {
  instance: string
  algorithm: string
  n: number
  mean: number
  std: number
  median: number
  iqr: number
  min_val: number
  max_val: number
  avg_rank: number
  formatted_value: string
  is_best: boolean
  is_second_best: boolean
  is_reference: boolean
  significance_symbol: string
  pairwise_test_name: string
  pairwise_statistic: number | null
  pairwise_p_value: number | null
  pairwise_p_adjusted: number | null
  effect_size_name: string | null
  effect_size_value: number | null
  effect_size_magnitude: string | null
  a12: number | null
  cliffs_delta: number | null
  cohens_d: number | null
  normality_passed: boolean
  shapiro_stat: number | null
  shapiro_p_value: number | null
  skewness: number
  kurtosis: number
  raw_values: number[]
}

export interface BenchmarkTableInstanceRow {
  instance: string
  best_algorithm: string
  second_best_algorithm: string
  omnibus_test_name: string
  omnibus_statistic: number
  omnibus_p_value: number
  omnibus_df: string
  omnibus_significant: boolean
  omnibus_effect_size_name: string
  omnibus_effect_size_value: number
  omnibus_effect_size_magnitude: string
  levene_statistic: number
  levene_p_value: number
  levene_passed: boolean
  normality_passed_count: number
  total_groups: number
  interpretation: string
  cells: Record<string, BenchmarkTableCell>
}

export interface AlgorithmSummaryFooter {
  algorithm: string
  avg_rank: number
  rank_position: number
  mean_across_instances: number
  median_across_instances: number
  wins: number
  ties: number
  losses: number
  best_count: number
  second_best_count: number
  friedman_z_vs_ref: number | null
  friedman_p_unadjusted: number | null
  friedman_p_holm: number | null
  friedman_p_bonferroni: number | null
  friedman_p_hochberg: number | null
  global_wilcoxon_stat: number | null
  global_wilcoxon_p: number | null
  global_wilcoxon_p_holm: number | null
  bayesian_prob_best: number | null
  bayesian_prob_better_than_ref: number | null
  bayesian_prob_rope_with_ref: number | null
}

export interface PairwiseInstanceComparison {
  instance: string
  mean_row: number
  std_row: number
  median_row: number
  iqr_row: number
  mean_col: number
  std_col: number
  median_col: number
  iqr_col: number
  winner: 'row' | 'col' | 'tie' | string
  symbol: '+' | '-' | '=' | string
  is_significant: boolean
  p_value: number | null
  a12: number | null
}

export interface PairwiseMatrixCell {
  algo_row: string
  algo_col: string
  test_name: string
  statistic: number
  p_value: number
  p_adjusted: number
  is_significant: boolean
  direction: 'better' | 'worse' | 'tie' | 'self' | string
  symbol: string
  instance_symbols: string
  sig_wins: number
  sig_ties: number
  sig_losses: number
  wins: number
  ties: number
  losses: number
  mean_row: number
  mean_col: number
  median_row: number
  median_col: number
  effect_size_name: string
  effect_size_value: number
  effect_size_magnitude: string
  a12: number
  cliffs_delta: number
  cohens_d: number
  prob_row_better: number | null
  prob_rope: number | null
  prob_col_better: number | null
  interpretation: string
  instance_breakdown: PairwiseInstanceComparison[]
}

export interface StatisticalTableResponse {
  table_type: TableType | string
  metric: string
  maximize: boolean
  alpha: number
  test_type: string
  resolved_omnibus_test: string
  resolved_pairwise_test: string
  posthoc_correction: string
  summary_stat: string
  scope: string
  selected_instance: string | null
  reference_algorithm: string
  algorithms: string[]
  instances: string[]
  friedman_stat: number | null
  friedman_p_value: number | null
  iman_davenport_f: number | null
  iman_davenport_p_value: number | null
  kendalls_w: number | null
  nemenyi_cd: number | null
  global_anova_f: number | null
  global_anova_p: number | null
  global_welch_f: number | null
  global_welch_p: number | null
  global_kruskal_h: number | null
  global_kruskal_p: number | null
  instance_rows: BenchmarkTableInstanceRow[]
  algorithm_summaries: AlgorithmSummaryFooter[]
  pairwise_matrix: PairwiseMatrixCell[][]
  latex_preview: string
  markdown_preview: string
  caption: string
  latex_document_mode?: LatexDocumentMode | string
  latex_notation?: LatexNotation | string
}

export type PdfTheme = 'slate' | 'academic_bw' | 'emerald' | 'navy' | 'crimson'
export type PdfOrientation = 'landscape' | 'portrait'
export type PdfGridStyle = 'full' | 'horizontal' | 'minimal'

export interface TablePdfStyleOptions {
  pdf_title?: string
  pdf_caption?: string
  pdf_theme?: PdfTheme
  pdf_orientation?: PdfOrientation
  pdf_font_size?: number
  pdf_highlight_best?: boolean
  pdf_show_zebra?: boolean
  pdf_grid_style?: PdfGridStyle
}

export interface StatisticalTableQueryParams {
  metric?: string
  table_type?: TableType | string
  test_type?: StatisticalTestType | string
  posthoc_correction?: PostHocCorrectionType | string
  summary_stat?: SummaryStatMode | string
  reference_algorithm?: string
  scope?: 'all-instances' | 'single-instance' | string
  selected_instance?: string
  algorithms_filter?: string[]
  instances_filter?: string[]
  alpha?: number
  precision?: number
  latex_document_mode?: LatexDocumentMode | string
  latex_notation?: LatexNotation | string
  pdf_title?: string
  pdf_caption?: string
  pdf_theme?: PdfTheme | string
  pdf_orientation?: PdfOrientation | string
  pdf_font_size?: number
  pdf_highlight_best?: boolean
  pdf_show_zebra?: boolean
  pdf_grid_style?: PdfGridStyle | string
}

export interface DistributionProfile {
  algorithm: string
  instance: string
  metric: string
  maximize: boolean
  n: number
  mean: number
  std: number
  median: number
  iqr: number
  min_val: number
  max_val: number
  cv: number
  skewness: number
  kurtosis: number
  outlier_count: number
  shapiro_stat: number
  shapiro_p: number
  shapiro_passed: boolean
  dagostino_stat: number | null
  dagostino_p: number | null
  dagostino_passed: boolean | null
  ks_stat: number
  ks_p: number
  ks_passed: boolean
  is_normal: boolean
  distribution_shape: string
  quantiles: Record<string, number>
  raw_values: number[]
}

export interface PivotedObservationRow {
  algorithm: string
  instance: string
  run_id: number
  metrics_values: Record<string, number>
}

export interface AggregatedMetricRow {
  algorithm: string
  instance: string
  n_runs: number
  metrics_mean_std: Record<string, string>
  metrics_median_iqr: Record<string, string>
  metrics_normal: Record<string, boolean>
  metrics_shapiro_p: Record<string, number>
}

export interface ContextDiagnostics {
  k_algorithms: number
  n_instances: number
  n_metrics: number
  total_observations: number
  runs_per_cell: number
  is_paired: boolean
  is_balanced: boolean
  normality_pass_count: number
  normality_total_groups: number
  normality_rate: number
  all_normal: boolean
  homoscedasticity_levene_stat: number
  homoscedasticity_levene_p: number
  homoscedasticity_passed: boolean
  homoscedasticity_bartlett_stat: number
  homoscedasticity_bartlett_p: number
  total_outliers: number
}

export interface TestRecommendation {
  test_id: string
  test_name: string
  category: string
  suitability: 'recommended' | 'suitable' | 'caution' | 'not_recommended' | string
  suitability_score: number
  rationale: string
  when_to_use: string
  assumptions_satisfied: string[]
  assumptions_violated: string[]
  suggested_table_type: string
  posthoc_suggestion: string
  effect_size_suggestion: string
  reference_citation: string
}

export interface DataExplorationResponse {
  available_metrics: string[]
  available_algorithms: string[]
  available_instances: string[]
  metric_directions: Record<string, boolean>
  active_metrics: string[]
  active_algorithms: string[]
  active_instances: string[]
  alpha: number
  context_diagnostics: ContextDiagnostics
  recommendations: TestRecommendation[]
  distribution_profiles: DistributionProfile[]
  pivoted_rows: PivotedObservationRow[]
  aggregated_rows: AggregatedMetricRow[]
}

export interface DataExplorationQueryParams {
  metrics?: string[]
  algorithms?: string[]
  instances?: string[]
  alpha?: number
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
