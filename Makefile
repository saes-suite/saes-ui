.PHONY: help install dev desktop build-web build-desktop lint format typecheck ci clean

SHELL := /bin/bash
export PATH := $(HOME)/.cargo/bin:/opt/homebrew/bin:$(PATH)

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies via pnpm
	pnpm install

dev: ## Launch web development server (Vite)
	pnpm dev

desktop: ## Launch Tauri desktop app in dev mode (tauri dev)
	pnpm desktop

build-web: ## Build static SPA into dist/
	pnpm build

build-desktop: ## Build native desktop installer (tauri build)
	pnpm build-desktop

lint: ## Run ESLint and Prettier checks
	pnpm lint
	pnpm prettier --check "src/**/*.{ts,tsx,css,json}"

format: ## Format source files with Prettier and ESLint
	pnpm lint:fix
	pnpm format

typecheck: ## Run TypeScript typecheck without emitting output
	pnpm typecheck

ci: lint typecheck ## Run CI quality gates (lint + typecheck)

clean: ## Clean build artifacts and dist folder
	rm -rf dist src-tauri/target
