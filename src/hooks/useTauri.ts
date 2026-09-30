import { useEffect, useState } from 'react'

declare global {
  interface Window {
    __TAURI_INTERNALS__?: Record<string, unknown>
    __TAURI__?: Record<string, unknown>
  }
}

export interface TauriHook {
  isTauri: boolean
  openDesktopFile: () => Promise<{ filename: string; content: string } | null>
  saveDesktopFile: (filename: string, content: string | Blob) => Promise<boolean>
}

export function useTauri(): TauriHook {
  const [isTauri, setIsTauri] = useState<boolean>(false)

  useEffect(() => {
    // Check if running inside Tauri runtime
    const detected =
      typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__)
    setIsTauri(detected)
  }, [])

  const openDesktopFile = async (): Promise<{ filename: string; content: string } | null> => {
    if (!isTauri) return null

    try {
      // Dynamically import Tauri plugins to prevent errors in web mode
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readTextFile } = await import('@tauri-apps/plugin-fs')

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Benchmark CSV Files',
            extensions: ['csv', 'txt'],
          },
        ],
      })

      if (!selected) return null

      const filePath = typeof selected === 'string' ? selected : selected[0]
      if (!filePath) return null

      const content = await readTextFile(filePath)
      const filename = filePath.split(/[/\\]/).pop() || 'data.csv'

      return { filename, content }
    } catch (err) {
      console.warn('Tauri open file failed, falling back to standard dialog:', err)
      return null
    }
  }

  const saveDesktopFile = async (
    defaultFilename: string,
    content: string | Blob
  ): Promise<boolean> => {
    if (!isTauri) return false

    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile, writeFile } = await import('@tauri-apps/plugin-fs')

      const path = await save({
        defaultPath: defaultFilename,
      })

      if (!path) return false

      if (typeof content === 'string') {
        await writeTextFile(path, content)
      } else {
        const buffer = await content.arrayBuffer()
        await writeFile(path, new Uint8Array(buffer))
      }

      return true
    } catch (err) {
      console.warn('Tauri save file error:', err)
      return false
    }
  }

  return {
    isTauri,
    openDesktopFile,
    saveDesktopFile,
  }
}
