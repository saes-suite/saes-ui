<p align="center">
  <img src="public/saes-logo.svg" alt="SAES Logo" width="128" />
</p>

# SAES-UI — Web Frontend for SAES

> **Stochastic Algorithm Evaluation Suite (SAES)**  
> Publication-grade interactive workbench for automated statistical analysis, hypothesis testing, diagnostic validation, and data visualization.

---

## 🏛️ Architecture Overview

`saes-ui` is designed as a **modern, dual-target client** that operates in two primary environments:

1. **Standalone Single Page Application (Web SPA)**:
   - Zero-install, browser-based execution.
   - HTML5 drag-and-drop CSV parser with instant schema inspection.
   - Communicates with `saesV2` FastAPI REST server (`http://127.0.0.1:8060`) and `saes-ai` (`http://127.0.0.1:8070`).
   - Client-side fallback engine enabling fully interactive exploration even in offline demo mode.

2. **Native Lightweight Desktop Application (Umbrella Tauri v2)**:
   - Bundled by the umbrella repository's **Tauri v2** wrapper (`../src-tauri/`) producing a native binary (`.app` / `.dmg` on macOS, `.exe` on Windows, `.deb` / `.AppImage` on Linux) together with the unified `saes-backend` sidecar.
   - Native OS file picker dialogs via `@tauri-apps/plugin-dialog`.
   - Native filesystem access via `@tauri-apps/plugin-fs`.
   - System window dimensions (1400x900 default, 1280x800 minimum) with desktop shell integration.

---

## 🛠️ Tech Stack

- **Framework & Tooling**: [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict mode enabled).
- **Desktop Runtime**: **Tauri v2** (`@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, Rust 2021).
- **Styling & UI Kit**: [Tailwind CSS](https://tailwindcss.com/) + Radix UI Primitives (shadcn/ui design language) + [Lucide Icons](https://lucide.dev/).
- **Data Tables**: [`@tanstack/react-table`](https://tanstack.com/table) for sortable, filterable, and paginated benchmark data inspection.
- **Charts & Plotting**: [`plotly.js-dist-min`](https://plotly.com/javascript/) for publication-quality distribution plots (boxplots, violins, bar charts with 95% CIs, ECDFs, scatter runs) with customizable scientific palettes and 300 DPI exports (PNG, SVG, PDF).
- **Math & AI Chatbot**: `react-markdown` + `remark-math` + `rehype-katex` + KaTeX for rendering mathematical formulas ($p < 0.001$, $F(2, 27) = 14.8$, effect sizes $\eta^2$ and Cohen's $d$).
- **State & Data Fetching**: TanStack Query (`@tanstack/react-query`) and Axios typed client communicating with `saesV2` (`:8060`) and `saes-ai` (`:8070`).

---

## 📁 Repository Structure

```
saes-ui/
├── .github/
│   └── workflows/
│       ├── test.yml             # Linting, TypeScript typechecking & web build
│       └── release.yml          # Automated changelog & version release stamp
├── src/
│   ├── api/                     # Typed client for saesV2 & saes-ai endpoints
│   │   ├── client.ts            # Axios HTTP client with connection configurator
│   │   └── types.ts             # TypeScript interfaces mirroring backend schemas
│   ├── components/
│   │   ├── layout/              # Header, Sidebar, Navigation, SettingsModal
│   │   ├── data/                # FileUploader, ValidationReport, DataTable
│   │   ├── stats/               # StatsTable, AssumptionBadges, EffectSizeCard, AssumptionDrawer
│   │   ├── charts/              # PlotlyChart, PaletteSelector, ExportToolbar, ChartWorkbench
│   │   └── chat/                # ChatDrawer, ChatMessage, QuickChips, MathRenderer
│   │   └── ui/                  # Radix UI / shadcn design system primitives
│   ├── data/                    # Built-in sample benchmark dataset (NSGA-II vs MOEA/D)
│   ├── hooks/                   # useAnalysis, useTauri, useChat
│   ├── lib/                     # utils (cn), statistical calculations & diagnostics
│   ├── styles/                  # Tailwind CSS & KaTeX styling
│   ├── App.tsx                  # Main application dashboard layout
│   └── main.tsx                 # React entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── Makefile                     # make install, make dev, make desktop, make build, etc.
└── README.md
```

---

## ⚡ Quick Start & Development Commands

All standard development tasks are orchestrated via the `Makefile`:

```bash
# 1. Install frontend dependencies via pnpm
make install

# 2. Launch web development server (Vite at http://localhost:1420)
make dev

# 3. Build production static web SPA into dist/
make build-web

# 4. Run ESLint checks
make lint

# 5. Run TypeScript strict typechecking (tsc --noEmit)
make typecheck

# 6. Run CI quality gate (lint + typecheck)
make ci
```

> To launch or build the native Tauri desktop app, run `make start-desktop` or `make build-desktop` from the umbrella root (`../`).

---

## 🔌 API Integration with `saesV2.server` & `saes-ai`

`saes-ui` interacts with the FastAPI servers in `../saesV2` (`:8060`) and `../saes-ai` (`:8070`, or mounted on `:8060` in the desktop sidecar):

| Endpoint | Method | Service | Description |
|---|---|---|---|
| `/health` | `GET` | `saesV2` / `saes-ai` | Verifies service status and API version. |
| `/api/v1/validate` | `POST` | `saesV2` (`:8060`) | Validates CSV against required 6-column schema and reports structural issues. |
| `/api/v1/analyze` | `POST` | `saesV2` (`:8060`) | Executes automated hypothesis testing, Welch/Student decisions, ANOVA, and effect sizes. |
| `/api/v1/ranking`, `/tables`, `/explore`, `/profiles`, `/power`, `/reproducibility` | `POST` | `saesV2` (`:8060`) | Statistical tables, ranking, exploration, performance profiles, power analysis, and FAIR artifacts. |
| `/api/v1/chat`, `/api/v1/chat/stream` | `POST` | `saes-ai` (`:8070`) | Queries the AI statistical consultant with dataset context and inline artifact streaming. |

To launch the backend servers locally:
```bash
cd ../saesV2 && make start-api   # runs uvicorn on port 8060
cd ../saes-ai && make start-api  # runs uvicorn on port 8070
```

---

## 🔬 Scientific Methodology & Decision Rules

SAES follows rigorous statistical principles for stochastic algorithm evaluation:
- **Normality Check**: Shapiro-Wilk test evaluated per algorithm group ($p > \alpha$).
- **Homogeneity of Variance**: Levene's test (Brown-Forsythe).
- **Test Selection**:
  - Two groups, normal + equal variances: **Student's $t$-test**.
  - Two groups, normal + unequal variances: **Welch's $t$-test** (Satterthwaite df adjustment).
  - Three or more groups, equal variances: **Fisher's One-Way ANOVA**.
  - Three or more groups, unequal variances: **Welch's ANOVA**.
- **Practical Effect Sizes**:
  - Cohen's $d$ for pairwise comparisons: negligible ($<0.2$), small ($0.2-0.5$), medium ($0.5-0.8$), large ($\ge 0.8$).
  - $\eta^2$ for ANOVA omnibus: negligible ($<0.01$), small ($0.01-0.06$), medium ($0.06-0.14$), large ($\ge 0.14$).
