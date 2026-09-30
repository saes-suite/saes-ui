# CLAUDE.md — SAES-UI (Stochastic Algorithm Evaluation Suite UI)

> This file is read automatically by Claude, Antigravity, and any AI assistant that opens this repository.
> It defines the project identity, architecture, and non-negotiable conventions.

## Project Identity

**What**: SAES-UI — Modern dual-target Single Page Application (Web) and native lightweight desktop application (Tauri v2) for statistical benchmark analysis, hypothesis testing, diagnostic validation, and data visualization.

**Who**: SAES development team.

**Goal**: Provide a publication-grade interactive client that connects with `saes` REST API (`http://127.0.0.1:8000`) and provides full offline fallback inspection and repair tools.

---

## Repository Layout

```
saes-ui/
├── .agents/
│   └── rules/
│       └── code-guidelines.md   ← always_on agent context
├── .github/
│   └── workflows/
│       ├── test.yml             ← CI pipeline (lint + typecheck + build)
│       └── release.yml          ← Tauri multi-platform desktop release builder
├── scripts/
│   └── release_stamp.cjs        ← Version & CHANGELOG automation
├── src-tauri/                   ← Tauri v2 native desktop shell (Rust)
│   ├── Cargo.toml               ← Rust dependencies & desktop package version
│   ├── tauri.conf.json          ← Window configs & bundle identifiers
│   ├── capabilities/            ← Tauri v2 security policies
│   └── src/
│       └── main.rs              ← Native desktop shell entry point
├── src/                         ← Frontend source code
│   ├── api/                     ← Typed client & domain types mirroring saes REST API
│   ├── components/              ← React components (charts, chat, data, layout, stats, ui)
│   ├── hooks/                   ← useAnalysis, useChat, useTauri
│   ├── lib/                     ← datasetInspection, datasetRepairs, stats, utils
│   ├── styles/                  ← Tailwind CSS & KaTeX styling
│   ├── App.tsx                  ← Application root & view manager
│   └── main.tsx                 ← React DOM entry point
├── CHANGELOG.md                 ← Release history
├── CLAUDE.md                    ← This file
├── Makefile                     ← All development commands
├── package.json                 ← Node dependencies and scripts
├── pnpm-lock.yaml               ← pnpm lockfile
├── README.md                    ← Project overview
├── tailwind.config.ts           ← Tailwind CSS design system configuration
├── tsconfig.json                ← Strict TypeScript compiler options
├── version.txt                  ← Version (X.Y.Z)
└── vite.config.ts               ← Vite build configuration & chunk splitting
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend Core | React 18, TypeScript (strict) | Component architecture |
| Build Tool | Vite 6 | Fast HMR & production bundler |
| Package Manager | `pnpm` | Fast deterministic dependency management |
| Desktop Runtime | Tauri v2 | Lightweight native OS shell (Rust) |
| Styling | Tailwind CSS 3, Radix UI Primitives | Responsive scientific dark/light themes |
| Visualization | Plotly.js (`plotly.js-dist-min`) | Interactive distribution plots with 300 DPI export |
| Tables | `@tanstack/react-table` | Sortable, paginated benchmark data inspection |
| Math Rendering | KaTeX, `remark-math`, `rehype-katex` | LaTeX notation rendering ($p < 0.001$, $\eta^2$) |
| HTTP Client | Axios, `@tanstack/react-query` | REST communication with `saes-api` |
| Linter & Formatter | ESLint 9, Prettier | Code formatting and quality gates |

---

## Development Commands

```bash
make help               # List all available targets
make install            # Install dependencies via pnpm
make dev                # Launch Vite web dev server (port 1420)
make desktop            # Launch Tauri native desktop app in dev mode
make build-web          # Build static web SPA into dist/
make build-desktop      # Build native desktop installers
make lint               # Run ESLint and Prettier checks
make format             # Auto-format code with Prettier and ESLint
make typecheck          # Run strict TypeScript typecheck (tsc --noEmit)
make ci                 # Full CI quality gate (lint + typecheck)
make version            # Show current version
make release-dry-run    # Preview version bump
make release-stamp      # Bump version across package.json & Tauri configs
make branch             # Create a feature/fix branch
```

---

## 🛡️ Mandatory Quality Gate

Before completing any task or proposing commits:

```bash
make ci
```

Ensure `pnpm typecheck` and `pnpm lint` pass with zero warnings or errors.
