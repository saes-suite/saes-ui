import { AssumptionResult, BenchmarkRecord, CellAnalysis } from '../api/types'

/**
 * Formats backend-computed CellAnalysis assumptions (Shapiro-Wilk & Levene from SciPy)
 * and group summaries into the UI DiagnosticAssumptions view structure without
 * recomputing or approximating statistical p-values on the client.
 */
export function enrichCellWithAssumptions(
  cell: CellAnalysis,
  records: BenchmarkRecord[],
  alpha: number = 0.05
): CellAnalysis {
  const rawAssumptions: AssumptionResult[] = Array.isArray(cell.raw_assumptions)
    ? cell.raw_assumptions
    : Array.isArray(cell.assumptions)
      ? (cell.assumptions as unknown as AssumptionResult[])
      : []

  const normalityPValues: Record<string, number> = {}
  let allNormal = true

  rawAssumptions.forEach((a) => {
    if (a.name.toLowerCase().includes('shapiro')) {
      // Backend formats name as: "Normality (Shapiro-Wilk) [AlgoName]" or "(AlgoName)"
      const bracketMatch = a.name.match(/\[(.*?)\]/) || a.name.match(/\(([^)]+)\)$/)
      const algoName = bracketMatch ? bracketMatch[1] : a.name
      if (typeof a.p_value === 'number' && !Number.isNaN(a.p_value)) {
        normalityPValues[algoName] = a.p_value
      }
      if (!a.passed) {
        allNormal = false
      }
    }
  })

  const leveneRes = rawAssumptions.find((a) => a.name.toLowerCase().includes('levene'))
  const levenePValue =
    leveneRes && typeof leveneRes.p_value === 'number' && !Number.isNaN(leveneRes.p_value)
      ? leveneRes.p_value
      : 1.0
  const finalHomoPassed = leveneRes ? leveneRes.passed : true

  // Extract sample sizes from backend group_summaries if present, otherwise count records
  const sampleSizes: Record<string, number> = {}
  if (cell.group_summaries && Object.keys(cell.group_summaries).length > 0) {
    Object.entries(cell.group_summaries).forEach(([algo, summary]) => {
      if (typeof summary.n === 'number') {
        sampleSizes[algo] = summary.n
      }
    })
  } else {
    records
      .filter((r) => r.instance === cell.instance && r.metric === cell.metric)
      .forEach((r) => {
        sampleSizes[r.algorithm] = (sampleSizes[r.algorithm] || 0) + 1
      })
  }

  const algos = Object.keys(sampleSizes)
  const testName = cell.test_name.toLowerCase()
  let decisionReasoning = cell.interpretation || ''

  if (!decisionReasoning) {
    if (testName.includes('welch') && testName.includes('t-test')) {
      decisionReasoning = `Evaluated 2 independent groups (${algos.join(' vs ')}). Levene's test for equality of variances was violated (p = ${levenePValue.toFixed(4)} < ${alpha}). Welch's t-test was selected by the SAES decision engine.`
    } else if (
      testName.includes('student') ||
      (testName.includes('t-test') && !testName.includes('welch'))
    ) {
      decisionReasoning = `Evaluated 2 independent groups (${algos.join(' vs ')}). Both Shapiro-Wilk normality and Levene's homoscedasticity (p = ${levenePValue.toFixed(4)} ≥ ${alpha}) were satisfied.`
    } else if (testName.includes('welch') && testName.includes('anova')) {
      decisionReasoning = `Evaluated ${algos.length} algorithm groups. Variances were unequal across groups (Levene p = ${levenePValue.toFixed(4)} < ${alpha}), selecting Welch's ANOVA.`
    } else {
      decisionReasoning = `Evaluated ${algos.length} algorithm groups using Fisher's One-Way ANOVA (Levene p = ${levenePValue.toFixed(4)} ≥ ${alpha}).`
    }
  }

  return {
    ...cell,
    raw_assumptions: rawAssumptions,
    assumptions: {
      normality: {
        passed: allNormal,
        test: 'Shapiro-Wilk',
        p_values: normalityPValues,
      },
      homoscedasticity: {
        passed: finalHomoPassed,
        test: "Levene's Test (Median / Brown-Forsythe)",
        p_value: levenePValue,
      },
      sample_sizes: sampleSizes,
      decision_reasoning: decisionReasoning,
    },
  }
}
