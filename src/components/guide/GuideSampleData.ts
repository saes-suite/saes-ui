export interface GuideExampleDataset {
  id: string
  filename: string
  title: string
  domain: string
  badgeColor: string
  description: string
  highlights: string[]
  recommendedFeatures: string[]
  previewRows: Array<{
    algorithm: string
    instance: string
    metric: string
    run_id: number
    value: number
    maximize: boolean
  }>
  generateCsv: () => string
}

export interface SchemaColumnSpec {
  name: 'algorithm' | 'instance' | 'metric' | 'run_id' | 'value' | 'maximize'
  typeLabel: string
  colorClass: string
  badgeClass: string
  shortRole: string
  description: string
  validExamples: string[]
  invalidExamples: string[]
  rules: string[]
}

export const SCHEMA_COLUMNS: SchemaColumnSpec[] = [
  {
    name: 'algorithm',
    typeLabel: 'string (categorical)',
    colorClass: 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/70 dark:text-indigo-200',
    shortRole: 'Method or solver being compared',
    description:
      'Identifies the stochastic algorithm, ML model, or experimental configuration. SAES groups and compares performance across every unique algorithm name.',
    validExamples: ['NSGA-II', 'XGBoost', 'GA_v2', 'RandomForest'],
    invalidExamples: ['"" (empty cell)', 'null / NaN'],
    rules: [
      'Must be a non-empty text label.',
      'Use consistent naming (e.g., avoid mixing "GA" and "ga" unless intended as separate methods).',
      'At least 2 distinct algorithms are required for comparative hypothesis tests.',
    ],
  },
  {
    name: 'instance',
    typeLabel: 'string (categorical)',
    colorClass:
      'border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200',
    shortRole: 'Benchmark problem or dataset',
    description:
      'Represents the problem instance, benchmark function, or dataset on which the algorithm was evaluated. Used as the blocking factor in paired/omnibus tests (e.g., Friedman, Wilcoxon).',
    validExamples: ['Sphere', 'ZDT1', 'Iris (Fisher, 1936)', 'CIFAR-10'],
    invalidExamples: ['"" (empty cell)', 'whitespace-only'],
    rules: [
      'Must be a non-empty string.',
      'For paired multi-instance tests (Friedman, Critical Distance, Bayesian), evaluate all algorithms on the same set of instances.',
    ],
  },
  {
    name: 'metric',
    typeLabel: 'string (categorical)',
    colorClass: 'border-sky-300 dark:border-sky-700 bg-sky-50/70 dark:bg-sky-950/40',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/70 dark:text-sky-200',
    shortRole: 'Evaluation indicator name',
    description:
      'Names the quantitative indicator recorded in the row. A single CSV can contain multiple metrics (e.g., accuracy and loss, or IGD and Hypervolume) — SAES lets you switch between them seamlessly.',
    validExamples: ['accuracy', 'loss', 'IGD', 'Hypervolume', 'Runtime_ms'],
    invalidExamples: ['"" (empty cell)'],
    rules: [
      'Must be a non-empty string.',
      'Each metric should have a consistent optimization direction (maximize = true or false).',
    ],
  },
  {
    name: 'run_id',
    typeLabel: 'integer (≥ 0)',
    colorClass: 'border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/40',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-200',
    shortRole: 'Independent stochastic run index',
    description:
      'Identifies each independent repetition or random seed for a given (algorithm, instance, metric) cell. Enables sample-size, normality, and power calculations.',
    validExamples: ['0', '1', '2', '29'],
    invalidExamples: ['1.5 (float)', '"run_1" (text)', '-1 (negative)', 'empty'],
    rules: [
      'Must be a non-negative integer (0, 1, 2, ... or 1, 2, 3, ...).',
      'Recommended: at least 10–30 independent runs per cell for reliable normality checks and statistical power.',
    ],
  },
  {
    name: 'value',
    typeLabel: 'float (finite number)',
    colorClass: 'border-violet-300 dark:border-violet-700 bg-violet-50/70 dark:bg-violet-950/40',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/70 dark:text-violet-200',
    shortRole: 'Observed numerical measurement',
    description:
      'The numeric outcome of that specific run. Used for descriptive statistics (mean ± std, median ± IQR), hypothesis tests, rankings, and plots.',
    validExamples: ['0.9421', '85.4', '1.23e-4', '-12.5'],
    invalidExamples: ['NaN', 'inf', '"N/A"', '"" (empty)'],
    rules: [
      'Must be a finite real number (no NaN, Inf, or text strings).',
      'Use a dot (.) as the decimal separator.',
      'If your raw CSV has missing or NaN cells, the SAES Quality Fixer isolates only those rows so you can repair or drop them.',
    ],
  },
  {
    name: 'maximize',
    typeLabel: 'boolean',
    colorClass: 'border-rose-300 dark:border-rose-700 bg-rose-50/70 dark:bg-rose-950/40',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-200',
    shortRole: 'Optimization direction',
    description:
      'Tells SAES whether higher values are better (true, e.g. Accuracy, Hypervolume) or lower values are better (false, e.g. Loss, Error, IGD, Runtime). Controls rankings, bolding of winners, and Performance Profiles.',
    validExamples: ['true', 'false', 'True', 'False', '1', '0'],
    invalidExamples: ['"maximize"', '"higher"', 'empty'],
    rules: [
      'Canonical CSV values: true / false (case-insensitive) or 1 / 0.',
      'During upload, the Column Mapping Wizard can also normalize yes/no or max/min.',
    ],
  },
]

export const STARTER_CSV_TEMPLATE = `algorithm,instance,metric,run_id,value,maximize
AlgoA,Benchmark_1,Score,0,0.842,true
AlgoA,Benchmark_1,Score,1,0.856,true
AlgoA,Benchmark_1,Score,2,0.839,true
AlgoB,Benchmark_1,Score,0,0.791,true
AlgoB,Benchmark_1,Score,1,0.804,true
AlgoB,Benchmark_1,Score,2,0.788,true
AlgoA,Benchmark_2,Score,0,0.912,true
AlgoA,Benchmark_2,Score,1,0.905,true
AlgoA,Benchmark_2,Score,2,0.918,true
AlgoB,Benchmark_2,Score,0,0.874,true
AlgoB,Benchmark_2,Score,1,0.869,true
AlgoB,Benchmark_2,Score,2,0.881,true`

export const PYTHON_API_SNIPPET = `import saes

# 1. Load & validate a tidy long-format benchmark CSV
dataset = saes.load("example_metaheuristics.csv")
assert saes.validate(dataset).is_valid

# 2. Automated cell-level analysis (independent runs by default; paired=True for CV folds)
report = saes.analyze(dataset, alpha=0.05, generate_plots=False, paired=False)
print(report.to_dataframe().head())

# 3. Blocked multi-instance ranking (Friedman+Nemenyi & Bayesian Plackett-Luce)
cd = saes.statistics.friedman_nemenyi(dataset, metric="Fitness", alpha=0.05)
pl = saes.statistics.bayesian_plackett_luce(dataset, metric="Fitness")
print(cd.summary())
print(pl.summary())

# 4. Standardized Effect-Size Forest (95% CIs) & publication SVG export
forest = saes.statistics.effect_size_forest(dataset, metric="Fitness", instance="Sphere")
svg_bytes, _, _ = saes.export_plot(dataset, plot_type="critical-distance", metric="Fitness", export_format="svg")`

// Deterministic pseudo-random helper so example datasets are reproducible
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x) - 0.5
}

function buildCsv(
  rows: Array<{
    algorithm: string
    instance: string
    metric: string
    run_id: number
    value: number
    maximize: boolean
  }>
): string {
  const header = 'algorithm,instance,metric,run_id,value,maximize'
  const lines = rows.map(
    (r) =>
      `${r.algorithm},"${r.instance}",${r.metric},${r.run_id},${r.value},${r.maximize ? 'true' : 'false'}`
  )
  return [header, ...lines].join('\n')
}

export const GUIDE_EXAMPLES: GuideExampleDataset[] = [
  {
    id: 'metaheuristics',
    filename: 'example_metaheuristics.csv',
    title: 'Continuous Optimization (Metaheuristics)',
    domain: 'Evolutionary Computation',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
    description:
      'Compares 3 metaheuristics (DE, PSO, GA) across 4 classic benchmark functions (Sphere, Rosenbrock, Rastrigin, Ackley) over 10 independent runs, minimizing objective fitness.',
    highlights: [
      'Single metric (Fitness) with maximize = false',
      '3 algorithms × 4 instances × 10 runs = 120 observations',
      'Ideal for Friedman + Nemenyi Critical Distance & Dolan-Moré Profiles',
    ],
    recommendedFeatures: ['Statistical Workbench', 'Critical Distance', 'Benchmark Profiles'],
    previewRows: [
      {
        algorithm: 'DE',
        instance: 'Sphere',
        metric: 'Fitness',
        run_id: 0,
        value: 0.0142,
        maximize: false,
      },
      {
        algorithm: 'PSO',
        instance: 'Sphere',
        metric: 'Fitness',
        run_id: 0,
        value: 0.0385,
        maximize: false,
      },
      {
        algorithm: 'GA',
        instance: 'Sphere',
        metric: 'Fitness',
        run_id: 0,
        value: 0.1124,
        maximize: false,
      },
      {
        algorithm: 'DE',
        instance: 'Rastrigin',
        metric: 'Fitness',
        run_id: 0,
        value: 2.341,
        maximize: false,
      },
    ],
    generateCsv: () => {
      const algos = [
        { name: 'DE', bias: 1.0 },
        { name: 'PSO', bias: 1.45 },
        { name: 'GA', bias: 2.15 },
      ]
      const instances = [
        { name: 'Sphere', base: 0.015, spread: 0.008 },
        { name: 'Rosenbrock', base: 1.85, spread: 0.65 },
        { name: 'Rastrigin', base: 2.4, spread: 0.9 },
        { name: 'Ackley', base: 0.42, spread: 0.14 },
      ]
      const rows: GuideExampleDataset['previewRows'] = []
      let seed = 1
      for (const inst of instances) {
        for (const algo of algos) {
          for (let run = 0; run < 10; run++) {
            const val = Math.max(0.0001, inst.base * algo.bias + seededNoise(seed++) * inst.spread)
            rows.push({
              algorithm: algo.name,
              instance: inst.name,
              metric: 'Fitness',
              run_id: run,
              value: Number(val.toFixed(4)),
              maximize: false,
            })
          }
        }
      }
      return buildCsv(rows)
    },
  },
  {
    id: 'ml-classification',
    filename: 'example_ml_classification.csv',
    title: 'Machine Learning Classification (Multi-Metric)',
    domain: 'Supervised Learning',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    description:
      'Evaluates XGBoost, RandomForest, and SVM on 4 UCI datasets (Iris, Wine, BreastCancer, Glass) with two metrics in the same CSV: accuracy (maximize=true) and log_loss (maximize=false).',
    highlights: [
      'Demonstrates mixed optimization directions in one file',
      '3 models × 4 datasets × 2 metrics × 10 CV runs = 240 observations',
      'Shows how SAES switches metrics cleanly in every tab',
    ],
    recommendedFeatures: ['Data & Assumptions', 'Boxplots & Violins', 'Bayesian Simplex'],
    previewRows: [
      {
        algorithm: 'XGBoost',
        instance: 'Iris',
        metric: 'accuracy',
        run_id: 0,
        value: 0.9612,
        maximize: true,
      },
      {
        algorithm: 'XGBoost',
        instance: 'Iris',
        metric: 'log_loss',
        run_id: 0,
        value: 0.1145,
        maximize: false,
      },
      {
        algorithm: 'SVM',
        instance: 'Iris',
        metric: 'accuracy',
        run_id: 0,
        value: 0.9348,
        maximize: true,
      },
      {
        algorithm: 'SVM',
        instance: 'Iris',
        metric: 'log_loss',
        run_id: 0,
        value: 0.1682,
        maximize: false,
      },
    ],
    generateCsv: () => {
      const algos = [
        { name: 'XGBoost', accBoost: 0.035, lossScale: 0.82 },
        { name: 'RandomForest', accBoost: 0.018, lossScale: 0.95 },
        { name: 'SVM', accBoost: 0.0, lossScale: 1.12 },
      ]
      const instances = [
        { name: 'Iris', baseAcc: 0.925, baseLoss: 0.16 },
        { name: 'Wine', baseAcc: 0.94, baseLoss: 0.14 },
        { name: 'BreastCancer', baseAcc: 0.935, baseLoss: 0.15 },
        { name: 'Glass', baseAcc: 0.745, baseLoss: 0.58 },
      ]
      const rows: GuideExampleDataset['previewRows'] = []
      let seed = 101
      for (const inst of instances) {
        for (const algo of algos) {
          for (let run = 0; run < 10; run++) {
            const acc = Math.min(
              0.999,
              Math.max(0.5, inst.baseAcc + algo.accBoost + seededNoise(seed++) * 0.03)
            )
            const loss = Math.max(0.01, inst.baseLoss * algo.lossScale + seededNoise(seed++) * 0.04)
            rows.push({
              algorithm: algo.name,
              instance: inst.name,
              metric: 'accuracy',
              run_id: run,
              value: Number(acc.toFixed(4)),
              maximize: true,
            })
            rows.push({
              algorithm: algo.name,
              instance: inst.name,
              metric: 'log_loss',
              run_id: run,
              value: Number(loss.toFixed(4)),
              maximize: false,
            })
          }
        }
      }
      return buildCsv(rows)
    },
  },
  {
    id: 'moo-swarm',
    filename: 'example_moo_swarm.csv',
    title: 'Multi-Objective Swarm Intelligence',
    domain: 'Pareto Optimization',
    badgeColor: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200',
    description:
      'Compares NSGA-II, MOEA/D, and SPEA2 across ZDT1, ZDT2, ZDT3, and DTLZ2 using Inverted Generational Distance (IGD, minimize) and Hypervolume (HV, maximize) over 12 runs.',
    highlights: [
      'Standard multi-objective quality indicators (IGD & HV)',
      '3 algorithms × 4 benchmarks × 2 metrics × 12 runs = 288 observations',
      'Great for Power & Sample Size auditing and LaTeX table export',
    ],
    recommendedFeatures: ['Power & Sample Size', 'LaTeX Export', 'Code & Reproducibility'],
    previewRows: [
      {
        algorithm: 'MOEA/D',
        instance: 'ZDT1',
        metric: 'IGD',
        run_id: 0,
        value: 0.0048,
        maximize: false,
      },
      {
        algorithm: 'NSGA-II',
        instance: 'ZDT1',
        metric: 'IGD',
        run_id: 0,
        value: 0.0061,
        maximize: false,
      },
      {
        algorithm: 'MOEA/D',
        instance: 'ZDT1',
        metric: 'HV',
        run_id: 0,
        value: 0.7195,
        maximize: true,
      },
      {
        algorithm: 'SPEA2',
        instance: 'ZDT1',
        metric: 'HV',
        run_id: 0,
        value: 0.7082,
        maximize: true,
      },
    ],
    generateCsv: () => {
      const algos = [
        { name: 'MOEA/D', igdMult: 0.85, hvOffset: 0.015 },
        { name: 'NSGA-II', igdMult: 1.0, hvOffset: 0.0 },
        { name: 'SPEA2', igdMult: 1.18, hvOffset: -0.012 },
      ]
      const instances = [
        { name: 'ZDT1', baseIgd: 0.0058, baseHv: 0.708 },
        { name: 'ZDT2', baseIgd: 0.0064, baseHv: 0.435 },
        { name: 'ZDT3', baseIgd: 0.0072, baseHv: 0.512 },
        { name: 'DTLZ2', baseIgd: 0.054, baseHv: 0.398 },
      ]
      const rows: GuideExampleDataset['previewRows'] = []
      let seed = 202
      for (const inst of instances) {
        for (const algo of algos) {
          for (let run = 0; run < 12; run++) {
            const igd = Math.max(
              0.0005,
              inst.baseIgd * algo.igdMult + seededNoise(seed++) * inst.baseIgd * 0.25
            )
            const hv = Math.min(
              0.99,
              Math.max(0.1, inst.baseHv + algo.hvOffset + seededNoise(seed++) * 0.018)
            )
            rows.push({
              algorithm: algo.name,
              instance: inst.name,
              metric: 'IGD',
              run_id: run,
              value: Number(igd.toFixed(5)),
              maximize: false,
            })
            rows.push({
              algorithm: algo.name,
              instance: inst.name,
              metric: 'HV',
              run_id: run,
              value: Number(hv.toFixed(4)),
              maximize: true,
            })
          }
        }
      }
      return buildCsv(rows)
    },
  },
]
