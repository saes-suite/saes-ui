import React, { useEffect, useRef } from 'react'
import Plotly, { Data, Layout, Config } from 'plotly.js-dist-min'

export interface PlotlyChartProps {
  data: Data[]
  layout?: Partial<Layout>
  config?: Partial<Config>
  onPlotlyRef?: (chartDiv: HTMLDivElement | null) => void
  style?: React.CSSProperties
  className?: string
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout,
  config,
  onPlotlyRef,
  style,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (onPlotlyRef) {
      onPlotlyRef(containerRef.current)
    }
  }, [onPlotlyRef])

  useEffect(() => {
    if (!containerRef.current) return

    const defaultLayout: Partial<Layout> = {
      autosize: true,
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#1e293b',
        size: 12,
      },
      margin: { l: 60, r: 30, t: 40, b: 60 },
      ...layout,
    }

    const defaultConfig: Partial<Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      toImageButtonOptions: {
        format: 'png',
        filename: 'saes_benchmark_chart',
        height: 700,
        width: 1000,
        scale: 3, // 300 DPI equivalent
      },
      ...config,
    }

    Plotly.react(containerRef.current, data, defaultLayout, defaultConfig)

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [data, layout, config])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '480px', ...style }}
      className={className}
    />
  )
}
