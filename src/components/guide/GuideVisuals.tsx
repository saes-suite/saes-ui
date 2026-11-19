import React from 'react'
import {
  Upload,
  ShieldCheck,
  BarChart2,
  PieChart,
  TrendingUp,
  Code,
  ArrowRight,
  Check,
  X,
} from 'lucide-react'

export const WorkflowPipelineDiagram: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Ingest & Repair',
      subtitle: 'CSV upload, column mapping & row fixer',
      icon: Upload,
      dot: 'bg-slate-500',
      ring: 'group-hover:border-slate-400/70',
    },
    {
      step: '02',
      title: 'Assumptions',
      subtitle: 'Shapiro-Wilk, Levene & sphericity',
      icon: ShieldCheck,
      dot: 'bg-emerald-500',
      ring: 'group-hover:border-emerald-500/50',
    },
    {
      step: '03',
      title: 'Hypothesis Tests',
      subtitle: 'Parametric, non-parametric & LaTeX',
      icon: BarChart2,
      dot: 'bg-indigo-500',
      ring: 'group-hover:border-indigo-500/50',
    },
    {
      step: '04',
      title: 'Visualizations',
      subtitle: 'Boxplots, CD diagram & Bayesian simplex',
      icon: PieChart,
      dot: 'bg-sky-500',
      ring: 'group-hover:border-sky-500/50',
    },
    {
      step: '05',
      title: 'Profiles & Power',
      subtitle: 'Dolan-Moré curves & sample size audit',
      icon: TrendingUp,
      dot: 'bg-violet-500',
      ring: 'group-hover:border-violet-500/50',
    },
    {
      step: '06',
      title: 'Reproduce & AI',
      subtitle: 'Python script, .ipynb & AI consultant',
      icon: Code,
      dot: 'bg-blue-500',
      ring: 'group-hover:border-blue-500/50',
    },
  ]

  return (
    <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs">
      <div className="mb-6">
        <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
          Analysis Workflow
        </span>
        <h3 className="text-base font-semibold text-foreground mt-0.5">
          From Raw Benchmark CSV to Publication-Ready Evidence
        </h3>
      </div>

      <div className="relative">
        {/* Continuous horizontal connector line on desktop */}
        <div
          className="hidden lg:block absolute top-5 left-8 right-8 h-px bg-gradient-to-r from-border via-primary/35 to-border"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {steps.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.step} className="group relative flex flex-col">
                {/* Node header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={`relative z-10 w-10 h-10 rounded-xl border border-border bg-background flex items-center justify-center shadow-xs transition-colors ${s.ring}`}
                  >
                    <Icon className="w-4 h-4 text-foreground/85" />
                    <span
                      className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-background ${s.dot}`}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                    {s.step}
                  </span>
                </div>

                {/* Card body */}
                <div
                  className={`flex-1 rounded-lg border border-border/70 bg-muted/25 p-3 transition-all group-hover:bg-muted/45 ${s.ring}`}
                >
                  <div className="text-xs font-semibold text-foreground">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {s.subtitle}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const WideToLongDiagram: React.FC = () => {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Wide Matrix vs. Tidy Long-Format CSV
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Wide summary tables discard individual run variance. SAES requires one row per
            independent run so normality, power, and distribution plots remain exact.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
        {/* Wide Format */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <X className="w-3 h-3" />
              </span>
              <span className="text-xs font-semibold text-foreground">Wide Summary Table</span>
            </div>
            <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
              Aggregated
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-border/80 bg-background">
            <table className="w-full text-[11px] font-mono">
              <thead className="bg-muted/60 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="px-2.5 py-2 text-left font-medium">instance</th>
                  <th className="px-2.5 py-2 text-right font-medium">DE</th>
                  <th className="px-2.5 py-2 text-right font-medium">PSO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-muted-foreground">
                <tr className="bg-primary/[0.04]">
                  <td className="px-2.5 py-2 text-foreground font-medium">Sphere</td>
                  <td className="px-2.5 py-2 text-right text-foreground">0.015 ± 0.002</td>
                  <td className="px-2.5 py-2 text-right">0.039 ± 0.006</td>
                </tr>
                <tr>
                  <td className="px-2.5 py-2">Rastrigin</td>
                  <td className="px-2.5 py-2 text-right">2.341 ± 0.410</td>
                  <td className="px-2.5 py-2 text-right">3.480 ± 0.720</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug">
            Missing <code className="font-mono text-foreground">run_id</code>,{' '}
            <code className="font-mono text-foreground">metric</code>, and{' '}
            <code className="font-mono text-foreground">maximize</code>.
          </p>
        </div>

        {/* Connector */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-1.5 py-1">
          <div className="px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] font-mono font-semibold">
            1 cell → N runs
          </div>
          <ArrowRight className="w-4 h-4 text-primary rotate-90 lg:rotate-0" />
          <span className="text-[10px] text-muted-foreground font-mono">Tidy Unpivot</span>
        </div>

        {/* Long Format */}
        <div className="lg:col-span-5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
              <span className="text-xs font-semibold text-foreground">SAES Tidy Long Format</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              6 Columns
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/80 bg-background">
            <table className="w-full text-[11px] font-mono">
              <thead className="bg-muted/60 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">algorithm</th>
                  <th className="px-2 py-2 text-left font-medium">instance</th>
                  <th className="px-2 py-2 text-left font-medium">metric</th>
                  <th className="px-2 py-2 text-right font-medium">run_id</th>
                  <th className="px-2 py-2 text-right font-medium">value</th>
                  <th className="px-2 py-2 text-center font-medium">maximize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr className="bg-primary/[0.04]">
                  <td className="px-2 py-1.5 font-semibold text-foreground">DE</td>
                  <td className="px-2 py-1.5">Sphere</td>
                  <td className="px-2 py-1.5">Fitness</td>
                  <td className="px-2 py-1.5 text-right text-amber-600 dark:text-amber-400">0</td>
                  <td className="px-2 py-1.5 text-right">0.0142</td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">false</td>
                </tr>
                <tr className="bg-primary/[0.04]">
                  <td className="px-2 py-1.5 font-semibold text-foreground">DE</td>
                  <td className="px-2 py-1.5">Sphere</td>
                  <td className="px-2 py-1.5">Fitness</td>
                  <td className="px-2 py-1.5 text-right text-amber-600 dark:text-amber-400">1</td>
                  <td className="px-2 py-1.5 text-right">0.0158</td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">false</td>
                </tr>
                <tr>
                  <td className="px-2 py-1.5 font-semibold text-foreground">PSO</td>
                  <td className="px-2 py-1.5">Sphere</td>
                  <td className="px-2 py-1.5">Fitness</td>
                  <td className="px-2 py-1.5 text-right text-amber-600 dark:text-amber-400">0</td>
                  <td className="px-2 py-1.5 text-right">0.0385</td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">false</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug">
            Preserves all stochastic runs, supports multiple metrics in one file, and tracks
            direction per metric.
          </p>
        </div>
      </div>
    </div>
  )
}

export const BoxplotMiniSvg: React.FC = () => (
  <svg viewBox="0 0 260 116" className="w-full h-28 rounded-lg bg-muted/30 border border-border/70">
    {/* Horizontal gridlines */}
    {[22, 44, 66, 88].map((y) => (
      <line
        key={y}
        x1="28"
        y1={y}
        x2="244"
        y2={y}
        stroke="currentColor"
        strokeOpacity="0.08"
        strokeDasharray="3 3"
      />
    ))}
    {/* Axes */}
    <line
      x1="28"
      y1="14"
      x2="28"
      y2="96"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="1"
    />
    <line
      x1="28"
      y1="96"
      x2="244"
      y2="96"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="1"
    />

    {/* Violin + Box 1 (Indigo) */}
    <path
      d="M72 22 C84 34, 86 58, 72 78 C58 58, 60 34, 72 22 Z"
      fill="#6366f1"
      fillOpacity="0.14"
    />
    <line x1="72" y1="22" x2="72" y2="78" stroke="#6366f1" strokeWidth="1.4" />
    <rect
      x="60"
      y="36"
      width="24"
      height="26"
      rx="2.5"
      fill="#6366f1"
      fillOpacity="0.28"
      stroke="#6366f1"
      strokeWidth="1.5"
    />
    <line x1="60" y1="48" x2="84" y2="48" stroke="#6366f1" strokeWidth="2.2" />
    <circle cx="70" cy="42" r="1.6" fill="#6366f1" />
    <circle cx="75" cy="54" r="1.6" fill="#6366f1" />

    {/* Violin + Box 2 (Emerald) */}
    <path
      d="M136 18 C149 30, 150 50, 136 68 C122 50, 123 30, 136 18 Z"
      fill="#10b981"
      fillOpacity="0.14"
    />
    <line x1="136" y1="18" x2="136" y2="68" stroke="#10b981" strokeWidth="1.4" />
    <rect
      x="124"
      y="28"
      width="24"
      height="24"
      rx="2.5"
      fill="#10b981"
      fillOpacity="0.28"
      stroke="#10b981"
      strokeWidth="1.5"
    />
    <line x1="124" y1="38" x2="148" y2="38" stroke="#10b981" strokeWidth="2.2" />
    <circle cx="133" cy="33" r="1.6" fill="#10b981" />
    <circle cx="139" cy="44" r="1.6" fill="#10b981" />

    {/* Violin + Box 3 (Amber) */}
    <path
      d="M200 36 C212 46, 213 68, 200 84 C187 68, 188 46, 200 36 Z"
      fill="#f59e0b"
      fillOpacity="0.14"
    />
    <line x1="200" y1="36" x2="200" y2="84" stroke="#f59e0b" strokeWidth="1.4" />
    <rect
      x="188"
      y="47"
      width="24"
      height="23"
      rx="2.5"
      fill="#f59e0b"
      fillOpacity="0.28"
      stroke="#f59e0b"
      strokeWidth="1.5"
    />
    <line x1="188" y1="58" x2="212" y2="58" stroke="#f59e0b" strokeWidth="2.2" />
    <circle cx="197" cy="52" r="1.6" fill="#f59e0b" />
    <circle cx="203" cy="64" r="1.6" fill="#f59e0b" />

    <text
      x="72"
      y="108"
      textAnchor="middle"
      fontSize="8.5"
      fill="currentColor"
      opacity="0.65"
      fontFamily="monospace"
    >
      DE
    </text>
    <text
      x="136"
      y="108"
      textAnchor="middle"
      fontSize="8.5"
      fill="currentColor"
      opacity="0.65"
      fontFamily="monospace"
    >
      PSO
    </text>
    <text
      x="200"
      y="108"
      textAnchor="middle"
      fontSize="8.5"
      fill="currentColor"
      opacity="0.65"
      fontFamily="monospace"
    >
      GA
    </text>
  </svg>
)

export const CriticalDistanceMiniSvg: React.FC = () => (
  <svg viewBox="0 0 260 116" className="w-full h-28 rounded-lg bg-muted/30 border border-border/70">
    {/* CD Bracket at top */}
    <line x1="42" y1="18" x2="112" y2="18" stroke="#6366f1" strokeWidth="2" />
    <line x1="42" y1="14" x2="42" y2="22" stroke="#6366f1" strokeWidth="1.5" />
    <line x1="112" y1="14" x2="112" y2="22" stroke="#6366f1" strokeWidth="1.5" />
    <text
      x="77"
      y="12"
      textAnchor="middle"
      fontSize="8"
      fill="#6366f1"
      fontWeight="600"
      fontFamily="monospace"
    >
      CD = 1.42
    </text>

    {/* Rank axis */}
    <line
      x1="42"
      y1="36"
      x2="218"
      y2="36"
      stroke="currentColor"
      strokeOpacity="0.55"
      strokeWidth="1.5"
    />
    {[
      { x: 42, label: '1' },
      { x: 100, label: '2' },
      { x: 158, label: '3' },
      { x: 218, label: '4' },
    ].map((t) => (
      <g key={t.label}>
        <line
          x1={t.x}
          y1="32"
          x2={t.x}
          y2="40"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
        <text
          x={t.x}
          y="29"
          textAnchor="middle"
          fontSize="8"
          fill="currentColor"
          opacity="0.65"
          fontFamily="monospace"
        >
          {t.label}
        </text>
      </g>
    ))}

    {/* Connectors */}
    <polyline
      points="68,36 68,72 34,72"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.6"
      strokeWidth="1.3"
    />
    <text
      x="12"
      y="75"
      fontSize="8.5"
      fill="currentColor"
      opacity="0.85"
      fontFamily="monospace"
      fontWeight="600"
    >
      DE
    </text>

    <polyline
      points="118,36 118,92 34,92"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.6"
      strokeWidth="1.3"
    />
    <text x="12" y="95" fontSize="8.5" fill="currentColor" opacity="0.85" fontFamily="monospace">
      PSO
    </text>

    <polyline
      points="172,36 172,72 224,72"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.6"
      strokeWidth="1.3"
    />
    <text x="228" y="75" fontSize="8.5" fill="currentColor" opacity="0.85" fontFamily="monospace">
      GA
    </text>

    <polyline
      points="204,36 204,92 224,92"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.6"
      strokeWidth="1.3"
    />
    <text x="228" y="95" fontSize="8.5" fill="currentColor" opacity="0.85" fontFamily="monospace">
      SA
    </text>

    {/* Clique bars */}
    <line
      x1="64"
      y1="60"
      x2="122"
      y2="60"
      stroke="#10b981"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <line
      x1="168"
      y1="60"
      x2="208"
      y2="60"
      stroke="#f59e0b"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  </svg>
)

export const BayesianSimplexMiniSvg: React.FC = () => (
  <svg viewBox="0 0 260 116" className="w-full h-28 rounded-lg bg-muted/30 border border-border/70">
    {/* Soft region fills */}
    <polygon points="130,18 96,62 130,62" fill="#10b981" fillOpacity="0.1" />
    <polygon points="130,18 164,62 130,62" fill="#10b981" fillOpacity="0.1" />
    <polygon points="74,94 130,62 130,94" fill="#6366f1" fillOpacity="0.1" />
    <polygon points="186,94 130,62 130,94" fill="#f59e0b" fillOpacity="0.1" />

    {/* Triangle outline */}
    <polygon
      points="130,18 74,94 186,94"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.45"
      strokeWidth="1.5"
    />
    {/* Decision boundaries */}
    <line
      x1="130"
      y1="62"
      x2="130"
      y2="18"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeDasharray="3 2"
    />
    <line
      x1="130"
      y1="62"
      x2="102"
      y2="94"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeDasharray="3 2"
    />
    <line
      x1="130"
      y1="62"
      x2="158"
      y2="94"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeDasharray="3 2"
    />

    {/* Posterior cloud */}
    {[
      [104, 68, 0.7],
      [109, 72, 0.85],
      [100, 74, 0.9],
      [113, 76, 0.8],
      [105, 79, 0.95],
      [97, 78, 0.65],
      [108, 65, 0.55],
      [116, 71, 0.6],
    ].map(([cx, cy, op], i) => (
      <circle key={i} cx={cx} cy={cy} r="2.5" fill="#6366f1" opacity={op} />
    ))}

    <text
      x="130"
      y="12"
      textAnchor="middle"
      fontSize="8"
      fill="currentColor"
      opacity="0.75"
      fontFamily="monospace"
    >
      p(ROPE)
    </text>
    <text
      x="52"
      y="98"
      textAnchor="middle"
      fontSize="8"
      fill="#6366f1"
      fontWeight="600"
      fontFamily="monospace"
    >
      p(A)
    </text>
    <text
      x="208"
      y="98"
      textAnchor="middle"
      fontSize="8"
      fill="#f59e0b"
      fontWeight="600"
      fontFamily="monospace"
    >
      p(B)
    </text>
  </svg>
)

export const PerformanceProfileMiniSvg: React.FC = () => (
  <svg viewBox="0 0 260 116" className="w-full h-28 rounded-lg bg-muted/30 border border-border/70">
    {[24, 48, 72].map((y) => (
      <line
        key={y}
        x1="30"
        y1={y}
        x2="242"
        y2={y}
        stroke="currentColor"
        strokeOpacity="0.08"
        strokeDasharray="3 3"
      />
    ))}
    <line
      x1="30"
      y1="14"
      x2="30"
      y2="94"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="1"
    />
    <line
      x1="30"
      y1="94"
      x2="242"
      y2="94"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="1"
    />

    {/* Area under top curve */}
    <polygon
      points="30,94 30,44 68,44 68,30 120,30 120,20 238,20 238,94"
      fill="#6366f1"
      fillOpacity="0.08"
    />
    <polyline
      points="30,44 68,44 68,30 120,30 120,20 238,20"
      fill="none"
      stroke="#6366f1"
      strokeWidth="2.2"
    />
    <polyline
      points="30,66 84,66 84,50 144,50 144,34 192,34 192,26 238,26"
      fill="none"
      stroke="#10b981"
      strokeWidth="2"
    />
    <polyline
      points="30,82 104,82 104,68 168,68 168,52 238,52"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="2"
    />

    <text
      x="136"
      y="107"
      textAnchor="middle"
      fontSize="8"
      fill="currentColor"
      opacity="0.65"
      fontFamily="monospace"
    >
      Performance Ratio τ
    </text>
    <text
      x="14"
      y="54"
      textAnchor="middle"
      fontSize="8"
      fill="currentColor"
      opacity="0.65"
      fontFamily="monospace"
      transform="rotate(-90 14 54)"
    >
      ρ(τ)
    </text>
  </svg>
)

export const PowerCurveMiniSvg: React.FC = () => (
  <svg viewBox="0 0 260 116" className="w-full h-28 rounded-lg bg-muted/30 border border-border/70">
    <line
      x1="30"
      y1="14"
      x2="30"
      y2="94"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="1"
    />
    <line
      x1="30"
      y1="94"
      x2="242"
      y2="94"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="1"
    />

    {/* 80% target line */}
    <line
      x1="30"
      y1="34"
      x2="238"
      y2="34"
      stroke="#ef4444"
      strokeOpacity="0.55"
      strokeDasharray="4 3"
      strokeWidth="1.2"
    />
    <text x="36" y="29" fontSize="7.5" fill="#ef4444" fontFamily="monospace">
      Target 0.80
    </text>

    {/* Power curve */}
    <path
      d="M 30 88 C 78 84, 112 52, 152 34 C 182 21, 210 18, 238 17"
      fill="none"
      stroke="#8b5cf6"
      strokeWidth="2.4"
    />
    <circle cx="152" cy="34" r="4" fill="#8b5cf6" stroke="white" strokeWidth="1.5" />
    <line
      x1="152"
      y1="34"
      x2="152"
      y2="94"
      stroke="#8b5cf6"
      strokeOpacity="0.35"
      strokeDasharray="2 2"
    />

    <text
      x="152"
      y="107"
      textAnchor="middle"
      fontSize="8"
      fill="#8b5cf6"
      fontWeight="600"
      fontFamily="monospace"
    >
      n = 14 runs/cell
    </text>
  </svg>
)
