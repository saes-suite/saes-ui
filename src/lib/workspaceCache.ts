import {
  PerformanceProfilesResponse,
  PowerAnalysisResponse,
  ReproducibilityResponse,
} from '../api/types'

// In-memory response caches
const profilesCache = new Map<string, PerformanceProfilesResponse>()
const powerCache = new Map<string, PowerAnalysisResponse>()
const reproducibilityCache = new Map<string, ReproducibilityResponse>()

/**
 * Generate a cache key for Dolan-Moré performance profiles
 */
export function getProfilesCacheKey(datasetId: string, metric: string, alpha: number): string {
  return `profiles:${datasetId}:${metric}:${alpha}`
}

export function getCachedProfiles(key: string): PerformanceProfilesResponse | undefined {
  return profilesCache.get(key)
}

export function setCachedProfiles(key: string, data: PerformanceProfilesResponse): void {
  profilesCache.set(key, data)
}

/**
 * Generate a cache key for statistical power analysis & sample sizing
 */
export function getPowerCacheKey(
  datasetId: string,
  metric: string,
  alpha: number,
  targetPower: number,
  targetEffectSize: number
): string {
  return `power:${datasetId}:${metric}:${alpha}:${targetPower}:${targetEffectSize}`
}

export function getCachedPower(key: string): PowerAnalysisResponse | undefined {
  return powerCache.get(key)
}

export function setCachedPower(key: string, data: PowerAnalysisResponse): void {
  powerCache.set(key, data)
}

/**
 * Generate a cache key for FAIR reproducibility scripts & artifacts
 */
export function getReproducibilityCacheKey(
  datasetId: string,
  metric: string,
  alpha: number
): string {
  return `repro:${datasetId}:${metric}:${alpha}`
}

export function getCachedReproducibility(key: string): ReproducibilityResponse | undefined {
  return reproducibilityCache.get(key)
}

export function setCachedReproducibility(key: string, data: ReproducibilityResponse): void {
  reproducibilityCache.set(key, data)
}

/**
 * Invalidate all or dataset-specific workspace caches
 */
export function clearWorkspaceCache(datasetId?: string): void {
  if (!datasetId) {
    profilesCache.clear()
    powerCache.clear()
    reproducibilityCache.clear()
    return
  }

  // Selective clear by datasetId
  for (const key of profilesCache.keys()) {
    if (key.includes(`:${datasetId}:`)) profilesCache.delete(key)
  }
  for (const key of powerCache.keys()) {
    if (key.includes(`:${datasetId}:`)) powerCache.delete(key)
  }
  for (const key of reproducibilityCache.keys()) {
    if (key.includes(`:${datasetId}:`)) reproducibilityCache.delete(key)
  }
}
