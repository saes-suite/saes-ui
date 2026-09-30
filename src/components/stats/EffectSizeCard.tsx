import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Gauge } from 'lucide-react'

interface EffectSizeCardProps {
  name: string | null
  value: number | null
  magnitude: string | null
  testName: string
}

export const EffectSizeCard: React.FC<EffectSizeCardProps> = ({
  name,
  value,
  magnitude,
  testName,
}) => {
  if (value === null || value === undefined) {
    return (
      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-4 text-xs text-muted-foreground">
          No standardized effect size calculated for {testName}.
        </CardContent>
      </Card>
    )
  }

  const mag = (magnitude || 'unclassified').toLowerCase()
  const absVal = Math.abs(value)

  // Progress percentage based on standard thresholds (up to 1.5 for d or 0.3 for eta2)
  const isEta = name?.toLowerCase().includes('eta')
  const maxScale = isEta ? 0.25 : 1.2
  const progressPercent = Math.min(100, Math.round((absVal / maxScale) * 100))

  const getMagnitudeColor = () => {
    switch (mag) {
      case 'large':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      case 'medium':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30'
      case 'small':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      case 'negligible':
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30'
    }
  }

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-primary" />
            Practical Effect Size
          </CardTitle>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border uppercase ${getMagnitudeColor()}`}
          >
            {mag}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div className="text-xl font-bold font-mono text-foreground">{value.toFixed(3)}</div>
          <span className="text-xs font-mono text-muted-foreground">{name || "Cohen's d"}</span>
        </div>

        {/* Magnitude Visual Indicator Bar */}
        <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              mag === 'large'
                ? 'bg-emerald-500'
                : mag === 'medium'
                  ? 'bg-sky-500'
                  : mag === 'small'
                    ? 'bg-amber-500'
                    : 'bg-zinc-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          {mag === 'large'
            ? 'Substantial algorithmic difference; real-world impact is significant.'
            : mag === 'medium'
              ? 'Moderate difference detectable across standard benchmark budgets.'
              : mag === 'small'
                ? 'Minor divergence; difference may have limited practical importance.'
                : 'Negligible practical distinction between algorithm distributions.'}
        </p>
      </CardContent>
    </Card>
  )
}
