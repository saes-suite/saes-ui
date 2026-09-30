# SAES-UI — Modern Dual-Target Web & Tauri Desktop Application

> **Stochastic Algorithm Evaluation Suite (SAES)**  
> Publication-grade interactive workbench for automated statistical analysis, hypothesis testing, diagnostic validation, and data visualization.

---

## 🏛️ Architecture Overview

`saes-ui` is designed as a **modern, dual-target client** that operates in two primary environments:

1. **Standalone Single Page Application (Web SPA)**:
   - Zero-install, browser-based execution.
   - HTML5 drag-and-drop CSV parser with instant schema inspection.
   - Communicates with `saes` FastAPI REST server (`http://127.0.0.1:8000`).
   - Client-side fallback engine enabling fully interactive exploration even in offline demo mode.

2. **Native Lightweight Desktop Application (Tauri v2)**:
   - Wrapped with **Tauri v2** producing an ultra-lightweight (<15 MB) native binary (`.app` / `.dmg` on macOS, `.exe` on Windows, `.deb` / `.AppImage` on Linux).
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
- **State & Data Fetching**: TanStack Query (`@tanstack/react-query`) and Axios typed client communicating with `saes-api`.

---

## 📁 Repository Structure

```
saes-ui/
├── .github/
│   └── workflows/
│       ├── test.yml             # Linting, TypeScript typechecking & web build
│       └── release.yml          # Tauri multi-platform desktop release builder
├── src-tauri/                   # Tauri v2 native desktop shell (Rust)
│   ├── Cargo.toml               # Rust dependencies (tauri v2, dialog, fs)
│   ├── tauri.conf.json          # App metadata, bundle identifier, window sizes
│   ├── capabilities/            # Tauri v2 permissions & security policies
│   ├── icons/                   # Multi-platform application icons
│   └── src/
│       └── main.rs              # Desktop shell entry point
├── src/
│   ├── api/                     # Typed client for saes-api endpoints
│   │   ├── client.ts            # Axios HTTP client with connection configurator
│   │   └── types.ts             # TypeScript interfaces mirroring saes schemas
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

# 3. Launch native Tauri desktop app in dev mode
make desktop

# 4. Build production static web SPA into dist/
make build-web

# 5. Build native desktop installer (.app / .dmg / .exe)
make build-desktop

# 6. Run ESLint checks
make lint

# 7. Run TypeScript strict typechecking (tsc --noEmit)
make typecheck

# 8. Run CI quality gate (lint + typecheck)
make ci
```

---

## 🔌 API Integration with `saes.server`

`saes-ui` interacts seamlessly with the FastAPI server in `../saes` across four core REST endpoints:

| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/health` | `GET` | — | Verifies service status and API version. |
| `/api/v1/validate` | `POST` | `multipart/form-data` (`file`) | Validates CSV against required 6-column schema and reports structural issues. |
| `/api/v1/analyze` | `POST` | `multipart/form-data` (`file`, `alpha`) | Executes automated hypothesis testing, Welch/Student decisions, ANOVA, and effect sizes. |
| `/api/v1/chat` | `POST` | `application/json` (`query`, `csv_data`, `alpha`) | Queries the embedded AI statistical consultant with dataset context. |

To launch the backend server locally:
```bash
cd ../saes
make start-api   # runs uvicorn on port 8000
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
