# Changelog

All notable changes to the SAES-UI repository are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [Released]

## [0.5.0] — 2026-11-27 (@rorro6787)

### Added

- Automatic SAES Python plugin discovery via `GET /api/v1/plugins` (`usePlugins` hook, `PluginManifest` / `PluginRegistryResponse` types, and **Installed SAES Python Plugins** panel in `SettingsModal`).
- Capability-gated **Pareto & EAF Suite** (`ParetoHub.tsx`, `CreateParetoStudyModal.tsx`, `ParetoWorkspace.tsx`, and top-bar `Benchmarks | Pareto & EAF` mode switcher, activated automatically when the `pareto` plugin is advertised by `:8060`):
  - Mirrors Core SAES `DatasetHub ↔ VisualizeWorkspace` lifecycle with a guided multi-file uploader (multiple `FUN.*` run files per algorithm + optional `.pf` reference front), tidy CSV, jMetal/PlatEMO `.zip`, and one-click demo benchmark (`ZDT1–3`, `DTLZ2`).
  - Uses the shared `ChartWorkbench` WYSIWYG paper figure stage (`PaletteSelector`, `ExportToolbar`, 5 paper aspect-ratio presets, fine-grained width/height sliders with reset, legend placement, font size/family, title/custom title/hidden title, axis labels, bold weight, grid toggle, light/dark paper canvas, reference-only `only` toggle alongside algorithms, and clean borderless Plotly canvas without floating modebar buttons) across 4 focused tabs (`Fronts & EAF`, `EAF Diff (A vs B)`, `Coverage & Runs`, and `Extract to SAES`).
  - Added Section **06 Pareto & EAF Plugin** to `GuideView.tsx` documenting all 3 dataset input formats with downloadable `.csv` and `.pf` samples and a live demo launcher.
  - Wired SAES-AI chat navigation (`pareto-hub`, `pareto-visualize`, `guide`) in `App.tsx` and high-DPI PNG/SVG/PDF export routing for inline `pareto:*` plot artifacts in `ChatArtifactCard.tsx`.

## [0.4.1] — 2026-11-24 (@rorro6787)

### Changed

- Updated `.github/workflows/release.yml` to authenticate release stamp pushes and GitHub Releases via the `saes-release-bot` GitHub App (`actions/create-github-app-token@v1`) so protected `main` rulesets remain enforced.

### Fixed

- Applied Prettier formatting across `ChartWorkbench.tsx`, `GuideView.tsx`, `PowerAnalysisWorkspace.tsx`, `StatsTable.tsx`, and `VisualizeWorkspace.tsx`, and added `prettier --check` to `.github/workflows/test.yml` to match the umbrella `make ci` gate.

## [0.4.0] — 2026-11-24 (@rorro6787)

### Added

- Full thin-client UI integration and dataset-aware intelligence powered by `saes` 2.0 REST APIs:
  - **API Client & Types (`src/api/types.ts`, `src/api/client.ts`, `src/lib/workspaceCache.ts`)**: Added typed bindings for `/posthoc`, `/tost`, `/bayesian/correlated-ttest`, and `/effect-sizes`, expanded `RankingAnalysisResponse` (`bayesian_plackett_luce`, `friedman_aligned`, `quade`, `rm_anova`), and passed explicit `paired`, `rope`, `prior_strength`, and `posthoc_correction` parameters across statistical endpoints.
  - **Data Explorer (`DataTable.tsx`) & Cross-Tab Routing (`VisualizeWorkspace.tsx`)**: Added Lilliefors KS & Anderson–Darling normality columns/drill-down cards, backend dataset design-capability indicators (`can_run_cell_tests`, `can_run_blocked_omnibus`), and intelligent recommendation routing to Workbench, Post-Hoc Lab, Visualizations, or TOST/Sensitivity.
  - **Statistical Workbench (`StatsTable.tsx`)**: Added explicit Paired vs. Independent Runs toggle, backend suitability badges on test options, Brunner–Munzel / Friedman Aligned-Ranks / Quade / RM-ANOVA (GG $\varepsilon$) tests, all 13 multiplicity adjustments (incl. Hommel, Finner, Holland, Rom, Li, BY, Shaffer, Bergmann–Hommel), Blocked Multi-Instance Omnibus Suite summary cards, and a dedicated **Post-Hoc Lab** tab (Tukey HSD, Games–Howell, Dunnett, Dunn, Conover–Iman with 95% CIs & CSV export).
  - **Visualizations (`ChartWorkbench.tsx`)**: Expanded to all 10 plot types by adding ECDF, Mean $\pm$ SD Bar Chart, Bayesian Plackett–Luce dual-panel ranking, Standardized Effect-Size Forest Plot (Hedges' $g$, Cohen's $d$, $A_{12}$, Cliff's $\delta$ with exact 95% CIs), and Bayesian Correlated $t$-test posterior density plot, plus relative/absolute ROPE and Dirichlet `prior_strength` controls and backend warning banners. Structured the chart selector into a balanced 2-row grid (5 charts per row), and relocated the figure export toolbar (`PNG 300 DPI`, `SVG`, `PDF`) from the top header directly into the paper figure stage header adjacent to the chart.
  - **Unified Export Actions Across Workspaces (`StatsTable.tsx`, `DataTable.tsx`, `ChartWorkbench.tsx`)**: Removed disconnected export buttons from top filter toolbars and relocated them directly into the card headers of each table and visualization view (Instance $\times$ Algorithm Table, Pairwise 1vs1 Matrix, Friedman Ranking Table, Post-Hoc Lab, Multi-Metric Reveal Table, Normality Diagnostics, Filtered Observations, and Paper Figure Canvas).
  - **Performance Profiles (`PerformanceProfilesWorkspace.tsx`) & Reproducibility (`ReproducibilityWorkspace.tsx`)**: Added Paired Design toggle and W/T/L multiplicity adjustment selector for Dolan–Moré profiles, aligned toolbar controls (`Metric`, `W/T/L Adj`, `Paired`, `Copy Summary`) at the same height as the left subtabs flush right, moved the `Refresh` button to the subtitle/citation row, and displayed `statsmodels_version` in the FAIR Environment Manifest.
  - **Power, Sensitivity & Equivalence (`PowerAnalysisWorkspace.tsx`)**: Added Paired Design toggle, a new **Sensitivity (MDES) & TOST** tab with MDES sensitivity audits and interactive TOST equivalence calculator, aligned top controls (`Metric`, `Paired Design`) at the same height as the subtabs flush right, and moved the `Recalculate` button to the subtitle/status row.
  - **Tutorial & Documentation (`GuideView.tsx`, `GuideSampleData.ts`)**: Indexed direct links to the official SAES documentation on GitHub Pages (`https://saes-suite.github.io/saes/`) across the Hero banner, left navigation sidebar, and Python API section, and updated all Python API snippets to `import saes` (`saes >= 2.0.0`).

## [0.3.3] — 2026-11-20 (@rorro6787)

### Fixed
- Copy `pnpm-workspace.yaml` before `pnpm install --frozen-lockfile` in `Dockerfile` so `esbuild` build scripts are approved (`ERR_PNPM_IGNORED_BUILDS`).

## [0.3.2] — 2026-11-20 (@rorro6787)

### Added
- Multi-stage `Dockerfile` (`node:22-alpine` + `nginx:1.27-alpine`), SPA `nginx.conf`, and `.dockerignore` for containerized web deployment.
- Automatic git tag (`vX.Y.Z`) creation and GitHub Release publishing in `.github/workflows/release.yml`.

## [0.3.1] — 2026-11-20 (@rorro6787)

### Changed

- Always route AI endpoints in `SaesApiClient` (`src/api/client.ts`) to `http://127.0.0.1:8070` by default in both development and packaged production modes instead of falling back to `:8060`, and show/save both `SAES API Server URL` and `SAES-AI API Server URL` in `SettingsModal.tsx` regardless of Tauri/Web mode.
- Removed legacy `fontSize` / `saes_font_size` compatibility layer from `AppearanceContext.tsx` in favor of `zoom`.

## [0.3.0] — 2026-11-19 (@rorro6787)

### Added

- Added an interactive **Guide & Tutorial** section (`GuideView.tsx`, `GuideVisuals.tsx`, `GuideSampleData.ts`) accessible from `Header.tsx` and `DatasetHub.tsx`, featuring a visual end-to-end workflow diagram, interactive 6-column tidy long-format CSV schema inspector, Wide-vs-Long format diagram, downloadable starter CSV template, 3 one-click runnable domain examples (Metaheuristics, Multi-Metric ML Classification, Multi-Objective Swarm Intelligence), visual previews of all statistical/chart/profile/power modules, and Python API / AI Consultant guides.
- Added `SAES-AI API Server URL` configuration, `/health` test button, and `saes_ai_url` persistence in `SettingsModal.tsx` (`client.ts` `getAiHealth()` / `resetAiBaseUrl()`), and updated server launch commands to `saesV2` and `saes-ai`.

### Changed

- Updated `ChatDrawer.tsx`, `QuickChips.tsx`, and `useChat.ts` for a natural, general-purpose conversational assistant, and scoped `App.tsx` chat dataset context to active dataset views (`visualize` and `editor`) so Hub/Guide chats do not send stale dataset state.

### Fixed

- Routed AI chat, provider probe, and Ollama management endpoints (`/api/v1/chat*`) in `SaesApiClient` (`src/api/client.ts`) through a dedicated `aiClient` / `aiBaseUrl` (defaulting to `http://127.0.0.1:8070` in Vite dev mode and configurable via `setAiBaseUrl` or `saes_ai_url` in `localStorage`) instead of the core `saesV2` API URL (`:8060`).
- Injected `__APP_VERSION__` from `package.json` in `vite.config.ts` so `Header.tsx` and `SettingsModal.tsx` display the current version dynamically instead of hardcoded `v0.1.0`.
- Updated `README.md` to reflect umbrella Tauri v2 packaging, `saesV2`/`saes-ai` endpoints, and unified logo sizing.
- Aligned `SelectDropdown` chevron to the right edge for fixed/min-width triggers (such as Bayesian `Left:` / `Right:` selectors) using `justify-between`, and moved the `Size:` selector in `ChartWorkbench.tsx` into the first control row so it does not wrap onto an isolated third row.

## [0.2.0] — 2026-11-18 (@rorro6787)

### Added

- Added `SAES-AI API Server URL` configuration, `/health` test button, and `saes_ai_url` persistence in `SettingsModal.tsx` (`client.ts` `getAiHealth()` / `resetAiBaseUrl()`), and updated server launch commands to `saesV2` and `saes-ai`.

### Fixed

- Fixed overlapping legend and X-axis title collision in Dolan-Moré Step Profile Curve $\rho(\tau)$ (`PerformanceProfilesWorkspace.tsx`) and Power Curves (`PowerAnalysisWorkspace.tsx`) by establishing top-anchored legend positioning (`yanchor: 'top'`), adding axis title standoff distance, dynamically expanding bottom margins and container height proportional to wrapped algorithm legend rows, preventing horizontal legends from encroaching onto the X-axis label.
- Fixed dropdown chevron/arrow alignment in `SelectDropdown` and native select inputs across the UI by expanding right padding (`pr-3.5` / `pr-4`) and removing asymmetric text margins, preventing the caret line from appearing crammed against the right rounded border.
- Fixed oversized and displaced `Evaluation Metric` dropdown in Statistical Workbench (`StatsTable.tsx`) by converting the primary controls row into a proportional 12-column layout (`xl:col-span-2` for metric), eliminating excessive whitespace separation between metric text and controls.

### Added

- Inline rich artifact rendering in the SAES Chatbot (`ChatArtifactCard.tsx`, `ChatMessage.tsx`, `useChat.ts`): displays interactive Plotly diagrams, static PNG images, and statistical tables directly inside assistant messages, with full-size lightbox inspection, interactive/image view toggle, and direct download buttons (PNG 300 DPI, SVG, PDF for plots/diagrams; CSV, LaTeX, Markdown, HTML, PDF, DOCX for tables).
- Typed `ChatArtifact` schemas and `exportPlotFromPath` / `exportPlotFromCsv` API client methods in `src/api/types.ts` and `src/api/client.ts`.
- Three new specialized scientific workflow tabs in `VisualizeWorkspace` (`Performance Profiles`, `Power & Design`, `Reproducibility`):
  - `Performance Profiles`: Interactive Dolan-Moré (2002) step curves $\rho(\tau)$ with linear/log scale toggle, top solver (#1 Meta-Rank) hero showcase card, global meta-ranking summary with CSV export, pairwise Win/Tie/Loss (W/T/L) score matrix with CSV export, and high-resolution chart export (PNG 300 DPI, SVG Vector).
  - `Power & Design`: A priori experimental sample size planning cards with CSV export (independent, paired, non-parametric Hodges-Lehmann bounds), interactive power curves chart with sample size reference line and high-resolution export (PNG 300 DPI, SVG Vector), and post-hoc power audit table with search filter, status chips (`All`, `Underpowered <80%`, `Optimal ≥80%`), and CSV table export.
  - `Reproducibility`: Standalone Python script viewer and download (`reproduce.py`), Jupyter Notebook download (`.ipynb`), and FAIR environment manifest with SHA-256 dataset checksum and 1-click JSON download (`fair_environment_manifest.json`).
- Removed legacy `Publication & LaTeX` tab from `VisualizeWorkspace` to eliminate redundancy with the existing LaTeX and publication tools already present in the Statistical Workbench.
- Typed client API bindings in `SaesApiClient` (`getPerformanceProfiles*`, `getPowerAnalysis*`, `getPublicationReport*`, `getReproducibility*`) for both direct file uploads and stored dataset paths.
- Overhauled Statistical Workbench (`StatsTable.tsx`) controls, UX, and naming: simplified and renamed tabs to intuitive titles ("Instance Comparison", "Pairwise Matrix", "Global Rankings & Post-Hoc", "Publication Code"), contextually adapted the Control Baseline dropdown so it is disabled with explanatory note when viewing the all-pairs matrix, structured tests into clear `<optgroup>` categories (Automated Smart Selection, Non-Parametric Tests, Parametric Tests), and reorganized the options panel into "Configure & Filter" with clear descriptions of what each option affects.
- Interactive PDF Publication Studio in the table export modal with visual color theme swatches (`Clean Slate`, `Academic B&W` for IEEE/ACM journal submissions, `Deep Navy`, `Emerald Peak`, `Crimson Classic`), custom title and caption editing, page orientation selection (`Landscape` vs `Portrait`), font density scaling (`Compact` 7pt, `Standard` 8.5pt, `Large` 10pt), winner cell highlighting, zebra striping, and border rule customization (`Full Grid`, `Horizontal Booktabs`, `Minimal`).
- Dedicated reactive refresh button in workbench header and removed redundant recompute actions.
- Independent repository for SAES interactive GUI workbench.
- Standalone vs Snippet document mode toggling and Number Notation selector (`Scientific ($e$)`, `siunitx (\SI)`, `Decimal ($\pm$)`) in the LaTeX/Markdown preview panel and Export modal of `StatsTable.tsx`.
- Client abstraction supporting both local Python library and remote REST API.
- Embedded statistical AI Consultant chatbot drawer.
- Interactive Plotly visualization workbench with export.
- Custom `SelectDropdown` component for chart controls, scientific paper aspect ratio presets (`single-col`, `golden`, `double-col`, `square`, `compact`), legend placement/toggle (`bottom`, `right`, `none`), and X-axis label rotation (`auto`, `0`, `-30`, `-45`).
- Critical Distance (CD) diagram, Bayesian Sign Test, and Bayesian Signed-Rank Simplex (ROPE) visualizations in `ChartWorkbench` with multi-metric (`all-metrics`) and pairwise algorithm selectors, powered by `/api/v1/ranking`.
- Redesigned Statistical Workbench (`StatsTable.tsx`) featuring targeted on-demand calculation per selected table/test view (`Instance × Algorithm`, `Pairwise 1vs1 Matrix`, `Friedman & ANOVA Post-Hoc`), dual Pairwise 1vs1 visualization modes (`Case by Case: + / = / - Sequence per instance` with interactive instance focus strip AND `General Level: Global Summary`), Instance × Algorithm visual density lenses (`Value + Symbol`, `Symbols Only`, `Ranks`), HTTP-cacheable `GET` queries, standalone 1vs1 LaTeX (`\texttt{=-+...}`) & Markdown source preview, a single "Export Table" button with a format-picker modal (`PDF`, `Word .docx`, `LaTeX .tex`, `CSV`, `Markdown`, `HTML`), and click-anywhere statistical drill-down modals.
- Upgraded Observations & Data Explorer (`DataTable.tsx`) with collapsible multi-dimensional filtering (metric, algorithm, instance, normality status), side-by-side multi-metric reveal matrix (aggregated & run-by-run), Shapiro-Wilk / D'Agostino / KS distribution diagnostics with interactive histograms, a context-aware Smart Statistical Test Advisor, and a unified "Export Table" button with format selection (`PDF`, `Word .docx`, `LaTeX .tex`, `CSV`, `Markdown`, `HTML`).
- Removed the redundant top-bar "Run Statistical Analysis" button from `VisualizeWorkspace.tsx` in favor of instant on-demand calculation in the Statistical Workbench.

### Changed

- Ergonomics and visual layout overhaul for LaTeX and PDF export dialogs and statistical workbench:
  - Fixed visual text clipping and button overflow across PDF presentation and LaTeX configuration options (`Highlight Winners`, `Zebra Striping`, `Booktabs`, `Standard`, and `Scientific`).
  - Added reactive live auto-execution to Vector PDF preview in `StatsTable.tsx`: modifying any presentation property (theme palette, orientation, font scale, winner highlighting, zebra striping, grid border style, or debounced title/caption) automatically re-renders the ReportLab vector PDF in real time with an interactive loading overlay and status badge.
  - Integrated direct export buttons (`Export .tex`, `Export PDF`, and `PDF Studio`) directly inside the LaTeX & Markdown workbench view header for seamless 1-click downloads.
- Reordered workspace tabs to follow the scientific benchmark workflow: Step 1 `Data & Assumptions`, Step 2 `Statistical Workbench`, Step 3 `Interactive Visualizations`.
- Updated dataset editor navigation origin tracking so returning from "Edit Data" inside the analysis workspace returns to the workspace (`Back to Analysis`) rather than resetting to the dataset hub.
- Removed client-side statistical approximations from `src/lib/stats.ts` and `ChartWorkbench.tsx`; all hypothesis testing, assumptions, group summaries, and multi-algorithm rankings are now computed exclusively by the `saes` Python backend.

