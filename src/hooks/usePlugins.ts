import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { PluginManifest, PluginRegistryResponse } from '../api/types'

export interface UsePluginsResult {
  plugins: PluginManifest[]
  registeredTests: string[]
  registeredRenderers: string[]
  registeredPlotters: string[]
  isLoadingPlugins: boolean
  hasPlugin: (pluginId: string) => boolean
  refreshPlugins: () => Promise<void>
}

export function usePlugins(apiOnline: boolean): UsePluginsResult {
  const [registry, setRegistry] = useState<PluginRegistryResponse>({
    plugins: [],
    registered_tests: [],
    registered_renderers: [],
    registered_plotters: [],
  })
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false)

  const refreshPlugins = useCallback(async () => {
    if (!apiOnline) {
      setRegistry({
        plugins: [],
        registered_tests: [],
        registered_renderers: [],
        registered_plotters: [],
      })
      return
    }
    setIsLoadingPlugins(true)
    try {
      const data = await apiClient.getPlugins()
      setRegistry(data)
    } catch {
      // Older backend or temporary disconnect — degrade gracefully with no plugins
      setRegistry({
        plugins: [],
        registered_tests: [],
        registered_renderers: [],
        registered_plotters: [],
      })
    } finally {
      setIsLoadingPlugins(false)
    }
  }, [apiOnline])

  useEffect(() => {
    refreshPlugins()
  }, [refreshPlugins])

  const hasPlugin = useCallback(
    (pluginId: string) => {
      const target = pluginId.trim().toLowerCase()
      return registry.plugins.some((p) => p.id.toLowerCase() === target)
    },
    [registry.plugins]
  )

  return {
    plugins: registry.plugins,
    registeredTests: registry.registered_tests,
    registeredRenderers: registry.registered_renderers,
    registeredPlotters: registry.registered_plotters,
    isLoadingPlugins,
    hasPlugin,
    refreshPlugins,
  }
}
