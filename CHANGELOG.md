# Changelog

All notable changes to the SAES-UI repository are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- Reordered workspace tabs to follow the scientific benchmark workflow: Step 1 `Data & Assumptions`, Step 2 `Statistical Workbench`, Step 3 `Interactive Visualizations`.
- Updated dataset editor navigation origin tracking so returning from "Edit Data" inside the analysis workspace returns to the workspace (`Back to Analysis`) rather than resetting to the dataset hub.
- Removed client-side statistical approximations from `src/lib/stats.ts` and `ChartWorkbench.tsx`; all hypothesis testing, assumptions, group summaries, and multi-algorithm rankings are now computed exclusively by the `saes` Python backend.
