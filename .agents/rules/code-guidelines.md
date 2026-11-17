---
trigger: always_on
---

# SAES-UI — Code Guidelines & Architectural Conventions

> This file is read automatically by Antigravity on every session.
> It defines the project identity, architecture, and non-negotiable conventions.

## Project Identity

**What**: SAES-UI — Modern dual-target Single Page Application (Web) and native lightweight desktop application (Tauri v2) for statistical benchmark analysis, hypothesis testing, diagnostic validation, and data visualization.

**Who**: SAES development team.

**Goal**: Deliver a responsive, resilient scientific workbench interfacing strictly with the `saes` FastAPI REST API (`http://127.0.0.1:8000`) and `saes-ai` REST API (`http://127.0.0.1:8001`).

---

## Non-Negotiable Architecture Rules (Thin Client & API-First)

1. **No Client-Side Domain Calculations**: `saes-ui` MUST NOT compute statistical tests, hypothesis decisions, dataset validations, dataset repairs, or AI interpretations locally in TypeScript/JavaScript.
2. **Backend & Python API Parity**: Every feature in `saes-ui` MUST consume an endpoint from `saes` (`:8000`) or `saes-ai` (`:8001`), and that endpoint MUST correspond to a programmatic Python API in `saes` or `saes-ai` for Python developers.
3. **UI Responsibility**: `saes-ui` is strictly responsible for user interaction, state management, API orchestration (`src/api/`), and rendering data/visualizations returned by the Python APIs.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Language & Runtime | TypeScript 5.7 (strict), React 18, Node.js >= 20 | Modern typed React |
| Package Manager | `pnpm` | Preferred dependency manager |
| Build Tool | Vite 6 | Fast bundle and HMR |
| Desktop Shell | Tauri v2 (Rust 2021) | Native OS integration, dialogs, fs |
| UI & Styling | Tailwind CSS 3, Radix UI Primitives, Lucide Icons | Accessible, responsive theme |
| Tables | `@tanstack/react-table` | Virtualized, sortable tables |
| Visualization | Plotly.js (`plotly.js-dist-min`) | Boxplots, violins, ECDFs, bar charts |
| Math | KaTeX, `rehype-katex`, `remark-math` | Mathematical notation formatting |
| Quality & Linting | ESLint 9, TypeScript (`tsc`), Prettier | Strict type safety |

---

## Makefile Commands

```bash
make help               # All targets
make install            # Install dependencies via pnpm
make dev                # Run Vite web development server
make desktop            # Run Tauri desktop app in dev mode
make build-web          # Build static web assets into dist/
make build-desktop      # Build native desktop bundle
make lint               # Run ESLint and Prettier check
make format             # Format source files
make typecheck          # Run TypeScript strict typecheck
make ci                 # Run full quality gate (lint + typecheck)
make version            # Show current version
make release-dry-run    # Preview version bump
make release-stamp      # Stamp changelog & bump package.json + Tauri configs
make branch             # Interactive branch creation
```

---

## 🛡️ Mandatory Quality Gate

Before finishing any task or suggesting a commit, **you MUST run**:

```bash
make ci
```

Never consider a task complete if `make ci` (`pnpm lint` and `pnpm typecheck`) fails.
