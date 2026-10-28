import React, { useEffect, useRef } from 'react'
import Plotly, { Data, Layout, Config } from 'plotly.js-dist-min'

export interface PlotlyChartProps {
  data: Data[]
  layout?: Partial<Layout>
  config?: Partial<Config>
  onPlotlyRef?: (chartDiv: HTMLDivElement | null) => void
  onRelayout?: (eventData: Record<string, unknown>) => void
  style?: React.CSSProperties
  className?: string
}

interface PlotlyHTMLElement extends HTMLDivElement {
  on?: (event: string, callback: (eventData: Record<string, unknown>) => void) => void
  removeAllListeners?: (event?: string) => void
  _fullLayout?: {
    xaxis?: { range?: [number, number] }
    yaxis?: { range?: [number, number] }
  }
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout,
  config,
  onPlotlyRef,
  onRelayout,
  style,
  className,
}) => {
  const containerRef = useRef<PlotlyHTMLElement | null>(null)
  const onRelayoutRef = useRef(onRelayout)

  useEffect(() => {
    onRelayoutRef.current = onRelayout
  }, [onRelayout])

  useEffect(() => {
    if (onPlotlyRef) {
      onPlotlyRef(containerRef.current)
    }
  }, [onPlotlyRef])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const hasExplicitDimensions = Boolean(layout?.width && layout?.height)

    const defaultLayout: Partial<Layout> = {
      autosize: !hasExplicitDimensions,
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
      responsive: !hasExplicitDimensions,
      displayModeBar: false,
      displaylogo: false,
      scrollZoom: false,
      ...config,
    }

    Plotly.react(el, data, defaultLayout, defaultConfig).then(() => {
      if (el.removeAllListeners) {
        el.removeAllListeners('plotly_relayout')
      }
      if (el.on) {
        el.on('plotly_relayout', (eventData) => {
          if (onRelayoutRef.current) {
            onRelayoutRef.current(eventData)
          }
        })
      }
    })

    const handleResize = () => {
      if (containerRef.current && !hasExplicitDimensions) {
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
      style={{ width: '100%', height: '100%', ...style }}
      className={className}
    />
  )
}
