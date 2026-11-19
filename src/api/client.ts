import axios, { AxiosInstance } from 'axios'
import {
  AnalysisResponse,
  ChatArtifact,
  ChatRequest,
  ChatResponse,
  DataExplorationQueryParams,
  DataExplorationResponse,
  DatasetDetail,
  DatasetItem,
  HealthResponse,
  PerformanceProfilesResponse,
  PlotExportFormat,
  PowerAnalysisResponse,
  ProviderProbeResponse,
  RankingAnalysisResponse,
  ReproducibilityResponse,
  StatisticalTableQueryParams,
  StatisticalTableResponse,
  TableExportFormat,
  UIAction,
  ValidationResponse,
} from './types'

const isViteDev = (): boolean =>
  Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV)

export class SaesApiClient {
  private client: AxiosInstance
  private aiClient: AxiosInstance
  private baseUrl: string
  private aiBaseUrl: string
  private hasExplicitAiBaseUrl: boolean

  constructor(baseUrl: string = 'http://127.0.0.1:8060', aiBaseUrl?: string) {
    this.baseUrl = baseUrl
    this.hasExplicitAiBaseUrl = Boolean(aiBaseUrl)
    this.aiBaseUrl = aiBaseUrl || (isViteDev() ? 'http://127.0.0.1:8070' : baseUrl)
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    })
    this.aiClient = axios.create({
      baseURL: this.aiBaseUrl,
      timeout: 30000,
    })
  }

  public setBaseUrl(newUrl: string): void {
    this.baseUrl = newUrl
    this.client.defaults.baseURL = newUrl
    if (!this.hasExplicitAiBaseUrl && !isViteDev()) {
      this.aiBaseUrl = newUrl
      this.aiClient.defaults.baseURL = newUrl
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  public setAiBaseUrl(newUrl: string): void {
    this.hasExplicitAiBaseUrl = true
    this.aiBaseUrl = newUrl
    this.aiClient.defaults.baseURL = newUrl
  }

  public resetAiBaseUrl(): void {
    this.hasExplicitAiBaseUrl = false
    this.aiBaseUrl = isViteDev() ? 'http://127.0.0.1:8070' : this.baseUrl
    this.aiClient.defaults.baseURL = this.aiBaseUrl
  }

  public getAiBaseUrl(): string {
    return this.aiBaseUrl
  }

  /**
   * Check API health status
   */
  public async getHealth(): Promise<HealthResponse> {
    const res = await this.client.get<HealthResponse>('/health')
    return res.data
  }

  /**
   * Check SAES-AI API health status
   */
  public async getAiHealth(): Promise<HealthResponse> {
    const res = await this.aiClient.get<HealthResponse>('/health')
    return res.data
  }

  /**
   * List saved datasets in the backend storage directory
   */
  public async listDatasets(): Promise<DatasetItem[]> {
    const res = await this.client.get<DatasetItem[]>('/api/v1/datasets')
    return res.data
  }

  /**
   * Upload and save a CSV dataset file into backend storage
   */
  public async uploadDataset(
    fileOrContent: File | Blob | string,
    filename: string = 'benchmark.csv'
  ): Promise<DatasetItem> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      const blob = new Blob([fileOrContent], { type: 'text/csv' })
      formData.append('file', blob, filename)
    } else {
      formData.append('file', fileOrContent, filename)
    }

    const res = await this.client.post<DatasetItem>('/api/v1/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  }

  /**
   * Get full details and CSV content of a saved dataset
   */
  public async getDataset(filename: string): Promise<DatasetDetail> {
    const res = await this.client.get<DatasetDetail>(
      `/api/v1/datasets/${encodeURIComponent(filename)}`
    )
    return res.data
  }

  /**
   * Save / update CSV content of a dataset in backend storage
   */
  public async saveDataset(filename: string, content: string): Promise<DatasetDetail> {
    const res = await this.client.put<DatasetDetail>(
      `/api/v1/datasets/${encodeURIComponent(filename)}`,
      { content }
    )
    return res.data
  }

  /**
   * Validate a saved dataset directly from its backend path
   */
  public async validateDatasetFromPath(filename: string): Promise<ValidationResponse> {
    const res = await this.client.post<ValidationResponse>(
      `/api/v1/datasets/${encodeURIComponent(filename)}/validate`
    )
    return res.data
  }

  /**
   * Execute statistical analysis on a saved dataset directly from its backend path
   */
  public async analyzeDatasetFromPath(
    filename: string,
    alpha: number = 0.05
  ): Promise<AnalysisResponse> {
    const formData = new FormData()
    formData.append('alpha', alpha.toString())

    const res = await this.client.post<AnalysisResponse>(
      `/api/v1/datasets/${encodeURIComponent(filename)}/analyze`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return res.data
  }

  /**
   * Delete a dataset from backend storage
   */
  public async deleteDataset(filename: string): Promise<void> {
    await this.client.delete(`/api/v1/datasets/${encodeURIComponent(filename)}`)
  }

  /**
   * Validate CSV benchmark file via POST /api/v1/validate
   */
  public async validateCsv(
    fileOrContent: File | Blob | string,
    filename: string = 'data.csv'
  ): Promise<ValidationResponse> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      const blob = new Blob([fileOrContent], { type: 'text/csv' })
      formData.append('file', blob, filename)
    } else {
      formData.append('file', fileOrContent, filename)
    }

    const res = await this.client.post<ValidationResponse>('/api/v1/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  }

  /**
   * Execute full automated statistical analysis via POST /api/v1/analyze
   */
  public async analyzeCsv(
    fileOrContent: File | Blob | string,
    alpha: number = 0.05,
    filename: string = 'data.csv'
  ): Promise<AnalysisResponse> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      const blob = new Blob([fileOrContent], { type: 'text/csv' })
      formData.append('file', blob, filename)
    } else {
      formData.append('file', fileOrContent, filename)
    }
    formData.append('alpha', alpha.toString())

    const res = await this.client.post<AnalysisResponse>('/api/v1/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  }

  /**
   * Compute Friedman + Nemenyi Critical Distance and Bayesian Simplex ROPE test on a saved dataset
   */
  public async getRankingFromPath(
    filename: string,
    metric: string,
    alpha: number = 0.05,
    scope: string = 'all-instances',
    instance?: string,
    ropePercent: number = 1.0,
    algoA?: string,
    algoB?: string,
    bayesianMethod: 'sign' | 'signed-rank' = 'signed-rank'
  ): Promise<RankingAnalysisResponse> {
    const formData = new FormData()
    formData.append('metric', metric)
    formData.append('alpha', alpha.toString())
    formData.append('scope', scope)
    if (instance) {
      formData.append('instance', instance)
    }
    formData.append('rope_percent', ropePercent.toString())
    if (algoA) {
      formData.append('algo_a', algoA)
    }
    if (algoB) {
      formData.append('algo_b', algoB)
    }
    formData.append('bayesian_method', bayesianMethod)

    const res = await this.client.post<RankingAnalysisResponse>(
      `/api/v1/datasets/${encodeURIComponent(filename)}/ranking`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return res.data
  }

  /**
   * Compute Friedman + Nemenyi Critical Distance and Bayesian Simplex ROPE test on raw CSV
   */
  public async getRankingFromCsv(
    fileOrContent: File | Blob | string,
    metric: string,
    alpha: number = 0.05,
    scope: string = 'all-instances',
    instance?: string,
    ropePercent: number = 1.0,
    algoA?: string,
    algoB?: string,
    filename: string = 'data.csv',
    bayesianMethod: 'sign' | 'signed-rank' = 'signed-rank'
  ): Promise<RankingAnalysisResponse> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      const blob = new Blob([fileOrContent], { type: 'text/csv' })
      formData.append('file', blob, filename)
    } else {
      formData.append('file', fileOrContent, filename)
    }
    formData.append('metric', metric)
    formData.append('alpha', alpha.toString())
    formData.append('scope', scope)
    if (instance) {
      formData.append('instance', instance)
    }
    formData.append('rope_percent', ropePercent.toString())
    if (algoA) {
      formData.append('algo_a', algoA)
    }
    if (algoB) {
      formData.append('algo_b', algoB)
    }
    formData.append('bayesian_method', bayesianMethod)

    const res = await this.client.post<RankingAnalysisResponse>('/api/v1/ranking', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  }

  private appendTableParams(formData: FormData, params: StatisticalTableQueryParams): void {
    if (params.metric) formData.append('metric', params.metric)
    if (params.table_type) formData.append('table_type', params.table_type)
    if (params.test_type) formData.append('test_type', params.test_type)
    if (params.posthoc_correction) formData.append('posthoc_correction', params.posthoc_correction)
    if (params.summary_stat) formData.append('summary_stat', params.summary_stat)
    if (params.reference_algorithm) {
      formData.append('reference_algorithm', params.reference_algorithm)
    }
    if (params.scope) formData.append('scope', params.scope)
    if (params.selected_instance) formData.append('selected_instance', params.selected_instance)
    if (params.algorithms_filter && params.algorithms_filter.length > 0) {
      formData.append('algorithms_filter', params.algorithms_filter.join(','))
    }
    if (params.instances_filter && params.instances_filter.length > 0) {
      formData.append('instances_filter', params.instances_filter.join(','))
    }
    if (params.alpha !== undefined) formData.append('alpha', params.alpha.toString())
    if (params.precision !== undefined) formData.append('precision', params.precision.toString())
    if (params.latex_document_mode)
      formData.append('latex_document_mode', params.latex_document_mode)
    if (params.latex_notation) formData.append('latex_notation', params.latex_notation)
    if (params.pdf_title) formData.append('pdf_title', params.pdf_title)
    if (params.pdf_caption) formData.append('pdf_caption', params.pdf_caption)
    if (params.pdf_theme) formData.append('pdf_theme', params.pdf_theme)
    if (params.pdf_orientation) formData.append('pdf_orientation', params.pdf_orientation)
    if (params.pdf_font_size !== undefined)
      formData.append('pdf_font_size', params.pdf_font_size.toString())
    if (params.pdf_highlight_best !== undefined)
      formData.append('pdf_highlight_best', params.pdf_highlight_best ? 'true' : 'false')
    if (params.pdf_show_zebra !== undefined)
      formData.append('pdf_show_zebra', params.pdf_show_zebra ? 'true' : 'false')
    if (params.pdf_grid_style) formData.append('pdf_grid_style', params.pdf_grid_style)
  }

  private buildTableQueryRecord(
    params: StatisticalTableQueryParams
  ): Record<string, string | number> {
    const q: Record<string, string | number> = {}
    if (params.metric) q.metric = params.metric
    if (params.table_type) q.table_type = params.table_type
    if (params.test_type) q.test_type = params.test_type
    if (params.posthoc_correction) q.posthoc_correction = params.posthoc_correction
    if (params.summary_stat) q.summary_stat = params.summary_stat
    if (params.reference_algorithm) q.reference_algorithm = params.reference_algorithm
    if (params.scope) q.scope = params.scope
    if (params.selected_instance) q.selected_instance = params.selected_instance
    if (params.algorithms_filter && params.algorithms_filter.length > 0) {
      q.algorithms_filter = params.algorithms_filter.join(',')
    }
    if (params.instances_filter && params.instances_filter.length > 0) {
      q.instances_filter = params.instances_filter.join(',')
    }
    if (params.alpha !== undefined) q.alpha = params.alpha
    if (params.precision !== undefined) q.precision = params.precision
    if (params.latex_document_mode) q.latex_document_mode = params.latex_document_mode
    if (params.latex_notation) q.latex_notation = params.latex_notation
    if (params.pdf_title) q.pdf_title = params.pdf_title
    if (params.pdf_caption) q.pdf_caption = params.pdf_caption
    if (params.pdf_theme) q.pdf_theme = params.pdf_theme
    if (params.pdf_orientation) q.pdf_orientation = params.pdf_orientation
    if (params.pdf_font_size !== undefined) q.pdf_font_size = params.pdf_font_size
    if (params.pdf_highlight_best !== undefined)
      q.pdf_highlight_best = params.pdf_highlight_best ? 'true' : 'false'
    if (params.pdf_show_zebra !== undefined)
      q.pdf_show_zebra = params.pdf_show_zebra ? 'true' : 'false'
    if (params.pdf_grid_style) q.pdf_grid_style = params.pdf_grid_style
    return q
  }

  /**
   * Generate a statistical benchmark table (ANOVA, Friedman, Wilcoxon, Pairwise) for a saved dataset via HTTP GET
   */
  public async generateTableFromPath(
    filename: string,
    params: StatisticalTableQueryParams = {}
  ): Promise<StatisticalTableResponse> {
    const res = await this.client.get<StatisticalTableResponse>(
      `/api/v1/datasets/${encodeURIComponent(filename)}/tables`,
      {
        params: this.buildTableQueryRecord(params),
      }
    )
    return res.data
  }

  /**
   * Generate a statistical benchmark table (ANOVA, Friedman, Wilcoxon, Pairwise) from raw CSV
   */
  public async generateTableFromCsv(
    fileOrContent: File | Blob | string,
    params: StatisticalTableQueryParams = {},
    filename: string = 'data.csv'
  ): Promise<StatisticalTableResponse> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      const blob = new Blob([fileOrContent], { type: 'text/csv' })
      formData.append('file', blob, filename)
    } else {
      formData.append('file', fileOrContent, filename)
    }
    this.appendTableParams(formData, params)
    const res = await this.client.post<StatisticalTableResponse>('/api/v1/tables', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  }

  /**
   * Export a statistical benchmark table for a saved dataset in PDF, DOCX, LaTeX, CSV, Markdown, or HTML
   */
  public async exportTableFromPath(
    filename: string,
    exportFormat: TableExportFormat,
    params: StatisticalTableQueryParams = {}
  ): Promise<Blob> {
    const res = await this.client.get(
      `/api/v1/datasets/${encodeURIComponent(filename)}/tables/export`,
      {
        params: {
          ...this.buildTableQueryRecord(params),
          export_format: exportFormat,
        },
        responseType: 'blob',
      }
    )
    return res.data
  }

  /**
   * Export a statistical benchmark table from raw CSV in PDF, DOCX, LaTeX, CSV, Markdown, or HTML
   */
  public async exportTableFromCsv(
    fileOrContent: File | Blob | string,
    exportFormat: TableExportFormat,
    params: StatisticalTableQueryParams = {},
    filename: string = 'data.csv'
  ): Promise<Blob> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      const blob = new Blob([fileOrContent], { type: 'text/csv' })
      formData.append('file', blob, filename)
    } else {
      formData.append('file', fileOrContent, filename)
    }
    formData.append('export_format', exportFormat)
    this.appendTableParams(formData, params)
    const res = await this.client.post('/api/v1/tables/export', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    })
    return res.data
  }

  private appendExploreParams(formData: FormData, params: DataExplorationQueryParams): void {
    if (params.metrics && params.metrics.length > 0) {
      formData.append('metrics', params.metrics.join(','))
    }
    if (params.algorithms && params.algorithms.length > 0) {
      formData.append('algorithms', params.algorithms.join(','))
    }
    if (params.instances && params.instances.length > 0) {
      formData.append('instances', params.instances.join(','))
    }
    if (params.alpha !== undefined) {
      formData.append('alpha', params.alpha.toString())
    }
  }

  private buildExploreQueryRecord(
    params: DataExplorationQueryParams
  ): Record<string, string | number> {
    const q: Record<string, string | number> = {}
    if (params.metrics && params.metrics.length > 0) q.metrics = params.metrics.join(',')
    if (params.algorithms && params.algorithms.length > 0) {
      q.algorithms = params.algorithms.join(',')
    }
    if (params.instances && params.instances.length > 0) q.instances = params.instances.join(',')
    if (params.alpha !== undefined) q.alpha = params.alpha
    return q
  }

  /**
   * Explore a saved dataset via HTTP GET: reveal multi-metric pivots, normality profiles, and test recommendations
   */
  public async exploreDatasetFromPath(
    filename: string,
    params: DataExplorationQueryParams = {}
  ): Promise<DataExplorationResponse> {
    const res = await this.client.get<DataExplorationResponse>(
      `/api/v1/datasets/${encodeURIComponent(filename)}/explore`,
      {
        params: this.buildExploreQueryRecord(params),
      }
    )
    return res.data
  }

  /**
   * Explore raw CSV dataset: reveal multi-metric pivots, normality profiles, and test recommendations
   */
  public async exploreDatasetFromCsv(
    fileOrContent: File | Blob | string,
    params: DataExplorationQueryParams = {},
    filename: string = 'data.csv'
  ): Promise<DataExplorationResponse> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      const blob = new Blob([fileOrContent], { type: 'text/csv' })
      formData.append('file', blob, filename)
    } else {
      formData.append('file', fileOrContent, filename)
    }
    this.appendExploreParams(formData, params)
    const res = await this.client.post<DataExplorationResponse>('/api/v1/explore', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  }

  /**
   * Export an Observations & Data exploration view for a saved dataset in PDF, DOCX, LaTeX, CSV, Markdown, or HTML
   */
  public async exportExplorationFromPath(
    filename: string,
    exportFormat: TableExportFormat,
    viewMode: string = 'reveal_metrics',
    statFormat: string = 'mean_std',
    normalityFilter: string = 'all',
    params: DataExplorationQueryParams = {}
  ): Promise<Blob> {
    const res = await this.client.get(
      `/api/v1/datasets/${encodeURIComponent(filename)}/explore/export`,
      {
        params: {
          ...this.buildExploreQueryRecord(params),
          export_format: exportFormat,
          view_mode: viewMode,
          stat_format: statFormat,
          normality_filter: normalityFilter,
        },
        responseType: 'blob',
      }
    )
    return res.data
  }

  /**
   * Export an Observations & Data exploration view from raw CSV in PDF, DOCX, LaTeX, CSV, Markdown, or HTML
   */
  public async exportExplorationFromCsv(
    fileOrContent: File | Blob | string,
    exportFormat: TableExportFormat,
    viewMode: string = 'reveal_metrics',
    statFormat: string = 'mean_std',
    normalityFilter: string = 'all',
    params: DataExplorationQueryParams = {},
    filename: string = 'data.csv'
  ): Promise<Blob> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      const blob = new Blob([fileOrContent], { type: 'text/csv' })
      formData.append('file', blob, filename)
    } else {
      formData.append('file', fileOrContent, filename)
    }
    formData.append('export_format', exportFormat)
    formData.append('view_mode', viewMode)
    formData.append('stat_format', statFormat)
    formData.append('normality_filter', normalityFilter)
    this.appendExploreParams(formData, params)
    const res = await this.client.post('/api/v1/explore/export', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    })
    return res.data
  }

  // ==========================================
  // PERFORMANCE PROFILES & META-BENCHMARK
  // ==========================================
  public async getPerformanceProfilesFromPath(
    filename: string,
    params: { metric?: string; alpha?: number; max_tau?: number } = {}
  ): Promise<PerformanceProfilesResponse> {
    const res = await this.client.get<PerformanceProfilesResponse>(
      `/api/v1/datasets/${encodeURIComponent(filename)}/profiles`,
      { params }
    )
    return res.data
  }

  public async getPerformanceProfilesFromCsv(
    fileOrContent: File | Blob | string,
    params: { metric?: string; alpha?: number; max_tau?: number } = {}
  ): Promise<PerformanceProfilesResponse> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      formData.append('file', new Blob([fileOrContent], { type: 'text/csv' }), 'data.csv')
    } else {
      formData.append('file', fileOrContent, 'data.csv')
    }
    if (params.metric) formData.append('metric', params.metric)
    if (params.alpha !== undefined) formData.append('alpha', params.alpha.toString())
    if (params.max_tau !== undefined) formData.append('max_tau', params.max_tau.toString())

    const res = await this.client.post<PerformanceProfilesResponse>('/api/v1/profiles', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  // ==========================================
  // STATISTICAL POWER & EXPERIMENTAL DESIGN
  // ==========================================
  public async getPowerAnalysisFromPath(
    filename: string,
    params: {
      metric?: string
      alpha?: number
      target_power?: number
      target_effect_size?: number
    } = {}
  ): Promise<PowerAnalysisResponse> {
    const res = await this.client.get<PowerAnalysisResponse>(
      `/api/v1/datasets/${encodeURIComponent(filename)}/power`,
      { params }
    )
    return res.data
  }

  public async getPowerAnalysisFromCsv(
    fileOrContent: File | Blob | string,
    params: {
      metric?: string
      alpha?: number
      target_power?: number
      target_effect_size?: number
    } = {}
  ): Promise<PowerAnalysisResponse> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      formData.append('file', new Blob([fileOrContent], { type: 'text/csv' }), 'data.csv')
    } else {
      formData.append('file', fileOrContent, 'data.csv')
    }
    if (params.metric) formData.append('metric', params.metric)
    if (params.alpha !== undefined) formData.append('alpha', params.alpha.toString())
    if (params.target_power !== undefined)
      formData.append('target_power', params.target_power.toString())
    if (params.target_effect_size !== undefined)
      formData.append('target_effect_size', params.target_effect_size.toString())

    const res = await this.client.post<PowerAnalysisResponse>('/api/v1/power', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  // ==========================================
  // REPRODUCIBILITY & SCRIPTING
  // ==========================================
  public async getReproducibilityFromPath(
    filename: string,
    params: { metric?: string; alpha?: number } = {}
  ): Promise<ReproducibilityResponse> {
    const res = await this.client.get<ReproducibilityResponse>(
      `/api/v1/datasets/${encodeURIComponent(filename)}/reproducibility`,
      { params }
    )
    return res.data
  }

  public async getReproducibilityFromCsv(
    fileOrContent: File | Blob | string,
    params: { metric?: string; alpha?: number; filename?: string } = {}
  ): Promise<ReproducibilityResponse> {
    const formData = new FormData()
    if (typeof fileOrContent === 'string') {
      formData.append('file', new Blob([fileOrContent], { type: 'text/csv' }), 'data.csv')
    } else {
      formData.append('file', fileOrContent, 'data.csv')
    }
    if (params.metric) formData.append('metric', params.metric)
    if (params.alpha !== undefined) formData.append('alpha', params.alpha.toString())
    if (params.filename) formData.append('filename', params.filename)

    const res = await this.client.post<ReproducibilityResponse>(
      '/api/v1/reproducibility',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return res.data
  }

  /**
   * Send question to statistical chat assistant via POST /api/v1/chat
   */
  public async chat(req: ChatRequest): Promise<ChatResponse> {
    const res = await this.aiClient.post<ChatResponse>('/api/v1/chat', req, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return res.data
  }

  /**
   * Send question to statistical chat assistant with live token & tool event streaming
   */
  public async chatStream(
    req: ChatRequest,
    onToken: (token: string, contextUsed: boolean) => void,
    signal?: AbortSignal,
    callbacks?: {
      onThought?: (thought: string) => void
      onToolCall?: (tool: string, args?: Record<string, unknown>) => void
      onToolResult?: (tool: string, ok: boolean, summary: string) => void
      onUIAction?: (action: UIAction) => void
      onArtifact?: (artifact: ChatArtifact) => void
    }
  ): Promise<{
    fullText: string
    contextUsed: boolean
    uiActions: UIAction[]
    artifacts: ChatArtifact[]
  }> {
    const targetUrl = `${this.getAiBaseUrl().replace(/\/+$/, '')}/api/v1/chat/stream`
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
      signal,
    })

    if (!res.ok) {
      throw new Error(`Chat API error (HTTP ${res.status}): ${res.statusText}`)
    }

    if (!res.body) {
      throw new Error('Server did not provide a streaming response body.')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let fullText = ''
    let contextUsed = false
    const uiActions: UIAction[] = []
    const artifacts: ChatArtifact[] = []

    const processLine = (line: string) => {
      if (!line.trim()) return
      let data: Record<string, unknown>
      try {
        data = JSON.parse(line) as Record<string, unknown>
      } catch {
        return
      }
      if (data.error) {
        throw new Error(String(data.error))
      }
      if (typeof data.context_used === 'boolean') {
        contextUsed = data.context_used
      }
      if (data.type === 'thought' && data.thought) {
        callbacks?.onThought?.(String(data.thought))
      } else if (data.type === 'tool_call' && data.tool) {
        callbacks?.onToolCall?.(String(data.tool), data.arguments as Record<string, unknown>)
      } else if (data.type === 'tool_result' && data.tool) {
        callbacks?.onToolResult?.(
          String(data.tool),
          Boolean(data.ok ?? true),
          String(data.summary || '')
        )
      } else if (data.type === 'ui_action' && data.action) {
        uiActions.push(data.action as UIAction)
        callbacks?.onUIAction?.(data.action as UIAction)
      } else if (data.type === 'artifact' && data.artifact) {
        artifacts.push(data.artifact as ChatArtifact)
        callbacks?.onArtifact?.(data.artifact as ChatArtifact)
      } else if (typeof data.token === 'string' && data.token) {
        fullText += data.token
        onToken(data.token, contextUsed)
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        processLine(line)
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) {
      processLine(buffer)
    }

    return { fullText, contextUsed, uiActions, artifacts }
  }

  /**
   * Export a plot/diagram for a stored dataset as PNG, SVG, or PDF
   */
  public async exportPlotFromPath(
    filename: string,
    params: {
      plot_type: string
      export_format: PlotExportFormat
      metric?: string
      instance?: string | null
      scope?: string
      alpha?: number
      rope_percent?: number
      palette?: string | null
      dpi?: number
    }
  ): Promise<Blob> {
    const formData = new FormData()
    formData.append('plot_type', params.plot_type)
    formData.append('export_format', params.export_format)
    if (params.metric) formData.append('metric', params.metric)
    if (params.instance) formData.append('instance', params.instance)
    if (params.scope) formData.append('scope', params.scope)
    if (params.alpha !== undefined) formData.append('alpha', String(params.alpha))
    if (params.rope_percent !== undefined)
      formData.append('rope_percent', String(params.rope_percent))
    if (params.palette) formData.append('palette', params.palette)
    if (params.dpi !== undefined) formData.append('dpi', String(params.dpi))

    const res = await this.client.post(
      `/api/v1/datasets/${encodeURIComponent(filename)}/plots/export`,
      formData,
      { responseType: 'blob' }
    )
    return res.data
  }

  /**
   * Export a plot/diagram from raw CSV content as PNG, SVG, or PDF
   */
  public async exportPlotFromCsv(
    csvContent: string,
    params: {
      plot_type: string
      export_format: PlotExportFormat
      metric?: string
      instance?: string | null
      scope?: string
      alpha?: number
      rope_percent?: number
      palette?: string | null
      dpi?: number
    }
  ): Promise<Blob> {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const formData = new FormData()
    formData.append('file', blob, 'dataset.csv')
    formData.append('plot_type', params.plot_type)
    formData.append('export_format', params.export_format)
    if (params.metric) formData.append('metric', params.metric)
    if (params.instance) formData.append('instance', params.instance)
    if (params.scope) formData.append('scope', params.scope)
    if (params.alpha !== undefined) formData.append('alpha', String(params.alpha))
    if (params.rope_percent !== undefined)
      formData.append('rope_percent', String(params.rope_percent))
    if (params.palette) formData.append('palette', params.palette)
    if (params.dpi !== undefined) formData.append('dpi', String(params.dpi))

    const res = await this.client.post('/api/v1/plots/export', formData, {
      responseType: 'blob',
    })
    return res.data
  }

  /**
   * Fetch installed models from local Ollama via backend proxy
   */
  public async fetchLocalModels(baseUrl?: string): Promise<string[]> {
    try {
      const res = await this.aiClient.get<{ models: string[]; status: string }>(
        '/api/v1/chat/models/local',
        {
          params: baseUrl ? { base_url: baseUrl } : undefined,
          timeout: 4000,
        }
      )
      return res.data.models || []
    } catch {
      return []
    }
  }

  /**
   * Probe AI provider connectivity and dynamically fetch available models
   */
  public async probeProvider(
    provider: string,
    apiKey?: string,
    baseUrl?: string
  ): Promise<ProviderProbeResponse> {
    const res = await this.aiClient.post<ProviderProbeResponse>('/api/v1/chat/probe', {
      provider,
      api_key: apiKey || undefined,
      base_url: baseUrl || undefined,
    })
    return res.data
  }

  /**
   * Attempt to start local Ollama server daemon
   */
  public async startOllama(): Promise<{ started: boolean }> {
    const res = await this.aiClient.post<{ started: boolean }>('/api/v1/chat/ollama/start')
    return res.data
  }

  /**
   * Request backend to trigger Ollama model pull/download
   */
  public async pullOllamaModel(
    name: string,
    baseUrl?: string
  ): Promise<{ status: string; message: string }> {
    const res = await this.aiClient.post<{ status: string; message: string }>(
      '/api/v1/chat/ollama/pull',
      {
        name,
        base_url: baseUrl || undefined,
      },
      {
        timeout: 600000,
      }
    )
    return res.data
  }

  /**
   * Request backend to stream Ollama model pull progress
   */
  public async pullOllamaModelStream(
    name: string,
    baseUrl?: string,
    onProgress?: (progress: {
      status: string
      completed?: number
      total?: number
      percent?: number
    }) => void
  ): Promise<{ status: string; message: string }> {
    const targetUrl = `${this.getAiBaseUrl().replace(/\/+$/, '')}/api/v1/chat/ollama/pull/stream`
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, base_url: baseUrl || undefined }),
    })

    if (!res.ok) {
      throw new Error(`Failed to pull model (HTTP ${res.status})`)
    }

    if (!res.body) {
      throw new Error('Server did not provide a streaming response body.')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let lastStatus = 'Downloading...'

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.error) {
            throw new Error(data.error)
          }
          if (data.status) {
            lastStatus = data.status
          }
          let percent: number | undefined
          if (
            typeof data.total === 'number' &&
            data.total > 0 &&
            typeof data.completed === 'number'
          ) {
            percent = Math.min(100, Math.round((data.completed / data.total) * 100))
          }
          onProgress?.({
            status: data.status || lastStatus,
            completed: data.completed,
            total: data.total,
            percent,
          })
        } catch (e: unknown) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e
          }
        }
      }
    }

    return { status: 'ok', message: `Model '${name}' downloaded successfully.` }
  }
}

// Global default instance with configurable base url from localStorage if present
const storedBaseUrl = typeof window !== 'undefined' ? localStorage.getItem('saes_api_url') : null
const storedAiBaseUrl = typeof window !== 'undefined' ? localStorage.getItem('saes_ai_url') : null
export const apiClient = new SaesApiClient(
  storedBaseUrl || 'http://127.0.0.1:8060',
  storedAiBaseUrl || undefined
)
