/**
 * Utility functions for client-side data, table CSV and figure exports
 */
import Plotly from 'plotly.js-dist-min'

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportPlotlyImage(
  chartDiv: HTMLDivElement | null,
  filename: string,
  format: 'png' | 'svg' = 'png',
  width = 1200,
  height = 600,
  scale = 3
): Promise<void> {
  if (!chartDiv) return
  const opts = {
    format,
    filename: filename.replace(/\.(png|svg)$/i, ''),
    width,
    height,
    scale: format === 'png' ? scale : 1,
  } as unknown as Parameters<typeof Plotly.downloadImage>[1]

  await Plotly.downloadImage(chartDiv, opts)
}
