# Changelog

All notable changes to the SAES-UI repository are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Independent repository for SAES interactive GUI workbench.
- Client abstraction supporting both local Python library and remote REST API.
- Embedded statistical AI Consultant chatbot drawer.
- Interactive Plotly visualization workbench with export.
- Custom `SelectDropdown` component for chart controls, scientific paper aspect ratio presets (`single-col`, `golden`, `double-col`, `square`, `compact`), legend placement/toggle (`bottom`, `right`, `none`), and X-axis label rotation (`auto`, `0`, `-30`, `-45`).
- Critical Distance (CD) diagram, Bayesian Sign Test, and Bayesian Signed-Rank Simplex (ROPE) visualizations in `ChartWorkbench` with multi-metric (`all-metrics`) and pairwise algorithm selectors, powered by `/api/v1/ranking`.

### Changed
- Removed client-side statistical approximations from `src/lib/stats.ts` and `ChartWorkbench.tsx`; all hypothesis testing, assumptions, group summaries, and multi-algorithm rankings are now computed exclusively by the `saes` Python backend.
