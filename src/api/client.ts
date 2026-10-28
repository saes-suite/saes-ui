import axios, { AxiosInstance } from 'axios'
import {
  AnalysisResponse,
  ChatRequest,
  ChatResponse,
  DatasetDetail,
  DatasetItem,
  HealthResponse,
  ProviderProbeResponse,
  RankingAnalysisResponse,
  ValidationResponse,
} from './types'

export class SaesApiClient {
  private client: AxiosInstance
  private baseUrl: string

  constructor(baseUrl: string = 'http://127.0.0.1:8000') {
    this.baseUrl = baseUrl
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    })
  }

  public setBaseUrl(newUrl: string): void {
    this.baseUrl = newUrl
    this.client.defaults.baseURL = newUrl
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Check API health status
   */
  public async getHealth(): Promise<HealthResponse> {
    const res = await this.client.get<HealthResponse>('/health')
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

  /**
   * Send question to statistical chat assistant via POST /api/v1/chat
   */
  public async chat(req: ChatRequest): Promise<ChatResponse> {
    const res = await this.client.post<ChatResponse>('/api/v1/chat', req, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return res.data
  }

  /**
   * Send question to statistical chat assistant with live token streaming via POST /api/v1/chat/stream
   */
  public async chatStream(
    req: ChatRequest,
    onToken: (token: string, contextUsed: boolean) => void,
    signal?: AbortSignal
  ): Promise<{ fullText: string; contextUsed: boolean }> {
    const targetUrl = `${this.getBaseUrl().replace(/\/+$/, '')}/api/v1/chat/stream`
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
          if (typeof data.context_used === 'boolean') {
            contextUsed = data.context_used
          }
          if (data.token) {
            fullText += data.token
            onToken(data.token, contextUsed)
          }
        } catch (e: unknown) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e
          }
        }
      }
    }

    return { fullText, contextUsed }
  }

  /**
   * Fetch installed models from local Ollama via backend proxy
   */
  public async fetchLocalModels(baseUrl?: string): Promise<string[]> {
    try {
      const res = await this.client.get<{ models: string[]; status: string }>(
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
    const res = await this.client.post<ProviderProbeResponse>('/api/v1/chat/probe', {
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
    const res = await this.client.post<{ started: boolean }>('/api/v1/chat/ollama/start')
    return res.data
  }

  /**
   * Request backend to trigger Ollama model pull/download
   */
  public async pullOllamaModel(
    name: string,
    baseUrl?: string
  ): Promise<{ status: string; message: string }> {
    const res = await this.client.post<{ status: string; message: string }>(
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
    const targetUrl = `${this.getBaseUrl().replace(/\/+$/, '')}/api/v1/chat/ollama/pull/stream`
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
export const apiClient = new SaesApiClient(storedBaseUrl || 'http://127.0.0.1:8000')
