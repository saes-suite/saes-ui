import { useState, useCallback } from 'react'
import { apiClient } from '../api/client'
import { AnalysisResponse, CellAnalysis } from '../api/types'
import { useAISettings } from '../context/AISettingsContext'

export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  contextUsed?: boolean
}

export function useChat(
  rawCsv: string | null,
  analysis: AnalysisResponse | null,
  alpha: number = 0.05,
  datasetName: string | null = null
) {
  const { settings: aiSettings } = useAISettings()
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### Welcome to SAES Statistical Consultant 🔬

I am your embedded AI methodology advisor. I can help interpret hypothesis test results, evaluate normality and homoscedasticity diagnostics, and verify effect sizes.

Try one of the quick suggestions below or ask any question about your algorithmic benchmarks!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (queryText: string) => {
      if (!queryText.trim()) return

      const userMsg: ChatMessageItem = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: queryText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)
      setError(null)

      try {
        let answer = ''
        let contextUsed = false

        // Determine AI parameters from active settings
        let model: string | undefined
        let apiKey: string | undefined
        let baseUrl: string | undefined

        if (aiSettings.provider === 'local') {
          model = aiSettings.localModel
          baseUrl = aiSettings.localBaseUrl
        } else if (aiSettings.provider === 'openai') {
          model = aiSettings.openaiModel
          apiKey = aiSettings.openaiApiKey || undefined
          baseUrl = aiSettings.openaiBaseUrl || undefined
        } else if (aiSettings.provider === 'anthropic') {
          model = aiSettings.anthropicModel
          apiKey = aiSettings.anthropicApiKey || undefined
        } else if (aiSettings.provider === 'gemini') {
          model = aiSettings.geminiModel
          apiKey = aiSettings.geminiApiKey || undefined
        }

        // Try calling the FastAPI backend /api/v1/chat
        try {
          const res = await apiClient.chat({
            query: queryText,
            dataset_name: datasetName || undefined,
            csv_data: rawCsv || undefined,
            alpha: alpha,
            provider: aiSettings.provider,
            model,
            api_key: apiKey,
            base_url: baseUrl,
          })
          answer = res.response
          contextUsed = res.context_used
        } catch {
          // If server cannot be reached, fallback to placeholder response
          const localAnswer = generateLocalConsultantResponse(
            queryText,
            analysis?.results || [],
            alpha
          )
          answer = `> 💬 **Placeholder Message** *(Backend API disconnected / service unreachable)*:\n\n${localAnswer}`
          contextUsed = Boolean(analysis && analysis.results.length > 0)
        }

        const botMsg: ChatMessageItem = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contextUsed,
        }

        setMessages((prev) => [...prev, botMsg])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    },
    [rawCsv, analysis, alpha, datasetName, aiSettings]
  )

  const clearHistory = useCallback(() => {
    setMessages([
      {
        id: 'reset',
        role: 'assistant',
        content: 'Conversation history reset. Ready for your benchmark analysis queries.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }, [])

  return {
    messages,
    isOpen,
    setIsOpen,
    isLoading,
    error,
    sendMessage,
    clearHistory,
  }
}

/**
 * Intelligent local response generator when offline or in standalone mode
 */
function generateLocalConsultantResponse(
  query: string,
  cells: CellAnalysis[],
  alpha: number
): string {
  const lower = query.toLowerCase()

  if (lower.includes('summarize') || lower.includes('findings') || lower.includes('summary')) {
    if (cells.length === 0) {
      return `### Benchmark Summary\n\nNo analysis results are currently loaded. Please run **Run Automated Analysis** in the Workbench tab first.`
    }

    const sigCount = cells.filter((c) => c.is_significant).length
    const total = cells.length
    return (
      `### 📊 Summary of Experimental Findings\n\n- **Evaluated Experimental Cells**: ${total}\n- **Statistically Significant Differences**: **${sigCount} / ${total}** at significance level $\\alpha = ${alpha}$.\n\n#### Key Observations:\n` +
      cells
        .map(
          (c) =>
            `- **${c.instance} [${c.metric}]**: ${c.test_name} produced test statistic $t = ${c.statistic.toFixed(3)}$ ($p = ${c.p_value < 0.001 ? '< 0.001' : c.p_value.toFixed(4)}$). Effect size: **${c.effect_size_name}** = $${c.effect_size_value !== null ? c.effect_size_value.toFixed(3) : 'N/A'}$ (*${c.effect_size_magnitude || 'unclassified'}* magnitude).`
        )
        .join('\n') +
      `\n\n> **Methodological Note:** Rejection of the null hypothesis indicates significant distributional divergence between algorithms, backed by ${sigCount > 0 ? 'substantial' : 'minimal'} practical effect sizes.`
    )
  }

  if (lower.includes('welch') || lower.includes('why was welch')) {
    return `### 🔍 Why Welch's Test Was Selected\n\nIn stochastic algorithm comparisons, the assumption of **homoscedasticity** (equal variances across stochastic runs) is frequently violated because metaheuristics exhibit different convergence dynamics.\n\nAccording to SAES statistical decision rules:\n1. **Normality** is assessed via Shapiro-Wilk ($p > ${alpha}$).\n2. **Homogeneity of Variance** is assessed via Levene's test.\n3. When variance equality is violated ($p < ${alpha}$), standard Student's $t$-test exhibits an inflated Type I error rate (often exceeding $10\\%$ when nominal $\\alpha = 5\\%$).\n4. **Welch's $t$-test** employs the Welch–Satterthwaite equation for degrees of freedom:\n\n$$\\nu \\approx \\frac{\\left(\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}\\right)^2}{\\frac{(s_1^2/n_1)^2}{n_1 - 1} + \\frac{(s_2^2/n_2)^2}{n_2 - 1}}$$\n\nThis guarantees exact Type I error control under heteroscedasticity without loss of statistical power.`
  }

  if (lower.includes('effect size') || lower.includes('cohen') || lower.includes('eta')) {
    return `### 📐 Effect Size Interpretation Guide\n\nStatistical significance ($p < \\alpha$) confirms that observed differences are unlikely due to random seed variation alone, but does **not** convey the practical magnitude of algorithmic advantage.\n\n#### Benchmarks & Standards:\n- **Cohen's $d$** (for pairwise 2-sample comparisons):\n  - $|d| < 0.2$: **Negligible** difference\n  - $0.2 \\le |d| < 0.5$: **Small** effect\n  - $0.5 \\le |d| < 0.8$: **Medium** effect\n  - $|d| \\ge 0.8$: **Large** effect\n\n- **Eta-Squared ($\\eta^2$)** (for ANOVA multi-algorithm omnibus):\n  - $\\eta^2 < 0.01$: Negligible\n  - $0.01 \\le \\eta^2 < 0.06$: Small proportion of total variance explained\n  - $0.06 \\le \\eta^2 < 0.14$: Medium effect\n  - $\\eta^2 \\ge 0.14$: Large effect\n\nIn publication tables, always report both the exact test statistic with degrees of freedom and the standardized effect size.`
  }

  if (lower.includes('assumption') || lower.includes('violation')) {
    return `### ⚠️ Diagnostic Assessment of Statistical Assumptions\n\nSAES validates three critical foundations before selecting hypothesis tests:\n\n1. **Independence of Replicates**: Ensured by using independent pseudo-random seed sequences across runs ($run\\_id = 0 \\dots N-1$).\n2. **Normality of Metrics**: Evaluated for each algorithm group via Shapiro-Wilk test. When sample size per group $N \\ge 30$, Central Limit Theorem (CLT) stabilizes the distribution of the mean, but nonparametric rank-sum alternatives are recommended if skewness is severe.\n3. **Homoscedasticity (Equal Variances)**: Tested via Levene's Brown-Forsythe test. Violations automatically steer the SAES pipeline to **Welch's $t$-test** or **Welch's ANOVA**.`
  }

  return `### 💡 Scientific Consultation Note\n\nRegarding your question: *"${query}"*\n\nIn stochastic algorithm evaluation (CEC, GECCO, IEEE TEVC guidelines):\n- Multi-run experiments require rigorous non-overlapping confidence intervals or paired/independent hypothesis tests.\n- With current significance threshold set at $\\alpha = ${alpha}$, p-values below this threshold demonstrate statistical divergence.\n- Feel free to ask more specific questions about assumption checks, post-hoc corrections, or figure generation parameters!`
}
