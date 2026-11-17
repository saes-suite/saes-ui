# Changelog

All notable changes to the SAES-UI repository are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
