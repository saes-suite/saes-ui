<p align="center">
  <img src="public/saes-logo.svg" alt="SAES Logo" width="128" />
</p>

# SAES-UI — Web & Desktop Frontend for SAES

> **Stochastic Algorithm Evaluation Suite (SAES)**  
> Thin-client publication-grade interactive workbench for frequentist, exact Bayesian, equivalence (TOST), power/sensitivity (MDES), and Dolan–Moré meta-benchmark analysis — backed 100% by the `saes` (`:8060`) and `saes-ai` (`:8070`) Python REST APIs.

---

## 🏛️ Architecture Overview (API-First & Thin Client)

`saes-ui` performs **zero statistical or domain computation in TypeScript**. All assumption checks, hypothesis tests, post-hoc adjustments, Bayesian posteriors, effect-size confidence intervals, dataset capability guards, and exports are computed by `saes` (`:8060`), while conversational AI interpretation is served by `saes-ai` (`:8070`).

1. **Standalone Single Page Application (Web SPA)**:
   - Zero-install browser interface (`http://localhost:1420`).
   - Drag-and-drop CSV inspection, column-mapping wizard, and interactive row fixer.
   - Communicates directly with `saes` (`:8060`) and `saes-ai` (`:8070`).

2. **Native Lightweight Desktop Application (Umbrella Tauri v2)**:
   - Bundled by the umbrella repository's **Tauri v2** wrapper (`../src-tauri/`) with the unified `saes-backend` sidecar.
   - Native file dialogs (`@tauri-apps/plugin-dialog`) and filesystem access (`@tauri-apps/plugin-fs`).

---

## ✨ Workspace Capabilities

- **Data & Assumptions (`DataTable.tsx`)**: Multi-metric side-by-side pivot, Shapiro–Wilk / **Lilliefors KS** / **Anderson–Darling** normality diagnostics, Brown–Forsythe Levene variance checks, backend dataset design-capability indicators (`can_run_cell_tests`, `can_run_blocked_omnibus`), and dataset-aware test recommendations that route directly to the relevant tab/mode.
- **Statistical Workbench (`StatsTable.tsx`)**:
  - Explicit **Independent Runs vs. Paired (CRN / Matched Folds)** design toggle (`paired=false` default) and backend suitability badges on test selectors.
  - Supports **Brunner–Munzel**, **Friedman Aligned-Ranks**, **Quade**, **RM-ANOVA (GG $\varepsilon$)**, plus all **13 multiplicity adjustments** (Holm, Bonferroni, Hochberg, Hommel, Finner, Holland, Rom, Li, BH, BY, Shaffer, Bergmann–Hommel, None).
  - Blocked Multi-Instance Omnibus Suite panel in **Global Rankings** and a dedicated **Post-Hoc Lab** tab (Auto, **Tukey HSD**, **Games–Howell**, **Dunnett**, **Dunn**, **Conover–Iman** with 95% CIs & CSV export).
  - Publication table export in LaTeX (`booktabs`), Vector PDF (live themed preview), DOCX, CSV, Markdown, and HTML.
- **Visualizations (`ChartWorkbench.tsx`)**: All **10 publication chart types** organized by category (**Distributions**: Boxplot, Violin, ECDF, Mean $\pm$ SD Bar; **Rankings**: Critical Distance, **Bayesian Plackett–Luce**, **Effect-Size Forest (95% CI)**; **Bayesian**: Bayes Sign, Bayes Signed-Rank with relative/absolute ROPE & prior strength, **Bayesian Correlated $t$-test**), WYSIWYG journal aspect-ratio presets, and 300-DPI PNG / SVG export.
- **Benchmark Profiles (`PerformanceProfilesWorkspace.tsx`)**: Dolan–Moré $\rho(\tau)$ step curves, Copeland meta-rankings, and multiplicity-adjusted Win/Tie/Loss matrix with paired/independent toggle.
- **Power, Sensitivity & Equivalence (`PowerAnalysisWorkspace.tsx`)**: A priori sample size planning, power curves, post-hoc power audit, **MDES sensitivity audit** (Hoenig & Heisey 2001), and interactive **TOST Equivalence Calculator** with Plotly $(1-2\alpha)$ equivalence interval chart.
- **Code & Reproducibility (`ReproducibilityWorkspace.tsx`)**: Standalone Python script, Jupyter Notebook (`.ipynb`), and FAIR SHA-256 environment manifest (including `statsmodels_version`).

---

## 🛠️ Tech Stack

- **Framework & Tooling**: [Vite 6](https://vitejs.dev/) + [React 18](https://react.dev/) + [TypeScript 5.7](https://www.typescriptlang.org/) (strict mode).
- **Desktop Runtime**: **Tauri v2** (`@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`).
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) + Radix UI Primitives + [Lucide Icons](https://lucide.dev/).
- **Data Tables & Plots**: `@tanstack/react-table` + `plotly.js-dist-min`.
- **Math & AI Streaming**: `react-markdown` + `remark-math` + `rehype-katex` + KaTeX + Axios.

---

## ⚡ Quick Start & Development Commands

```bash
# Install frontend dependencies via pnpm
make install

# Launch web development server (http://localhost:1420)
make dev

# Build production static web SPA into dist/
make build-web

# Run ESLint, strict TypeScript typecheck, and full CI gate
make lint
make typecheck
make ci
```

> To launch or build the full stack or native Tauri desktop app, run `make start`, `make start-desktop`, or `make build-desktop` from the umbrella root (`../`).

---

## 🔌 Backend API Integration

| Endpoints | Service | Purpose |
| :--- | :--- | :--- |
| `/health` | `saes` / `saes-ai` | Health check and live version reporting |
| `/api/v1/validate`, `/explore`, `/analyze` | `saes` (`:8060`) | Schema validation, normality diagnostics, dataset-aware recommendations, and automated testing |
| `/api/v1/ranking`, `/tables`, `/tables/export`, `/plots/export` | `saes` (`:8060`) | Blocked omnibus tests, Bayesian simplex & Plackett–Luce, publication tables, and figure export |
| `/api/v1/posthoc`, `/tost`, `/bayesian/correlated-ttest`, `/effect-sizes` | `saes` (`:8060`) | Post-Hoc Lab, TOST equivalence, Bayesian Correlated $t$-test, and Effect-Size Forest (95% CIs) |
| `/api/v1/profiles`, `/power`, `/reproducibility` | `saes` (`:8060`) | Dolan–Moré profiles, power/MDES sensitivity, and FAIR reproducibility packs |
| `/api/v1/chat`, `/api/v1/chat/stream` | `saes-ai` (`:8070`) | Conversational statistical assistant with live tool-call & artifact streaming |
