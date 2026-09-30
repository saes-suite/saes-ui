import axios, { AxiosInstance } from 'axios'
import {
  AnalysisResponse,
  ChatRequest,
  ChatResponse,
  DatasetDetail,
  DatasetItem,
  HealthResponse,
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
    const res = await this.client.get<DatasetDetail>(`/api/v1/datasets/${encodeURIComponent(filename)}`)
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
}

// Global default instance with configurable base url from localStorage if present
const storedBaseUrl = typeof window !== 'undefined' ? localStorage.getItem('saes_api_url') : null
export const apiClient = new SaesApiClient(storedBaseUrl || 'http://127.0.0.1:8000')
