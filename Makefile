.PHONY: help install dev build-web lint format typecheck ci clean version release-dry-run release-stamp branch

SHELL := /bin/bash
export PATH := $(HOME)/.cargo/bin:/opt/homebrew/bin:$(PATH)

BUMP   ?= minor
AUTHOR ?=

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies via pnpm
	pnpm install

dev: ## Launch web development server (Vite)
	pnpm dev

build-web: ## Build static SPA into dist/
	pnpm build

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
	rm -rf dist

version: ## Show current version from version.txt
	@cat version.txt

release-dry-run: ## Preview release stamp without modifying files
	@node scripts/release_stamp.cjs --dry-run --bump $(BUMP) $(if $(AUTHOR),--author $(AUTHOR),)

release-stamp: ## Stamp changelog and bump version across version.txt & package.json
	@node scripts/release_stamp.cjs --bump $(BUMP) $(if $(AUTHOR),--author $(AUTHOR),)

branch: ## Create a new branch with the correct version prefix
	@echo ""; \
	echo "Select version bump type for this branch:"; \
	echo "  1) minor  (default — new feature, X.Y+1.0)"; \
	echo "  2) patch  (bugfix / hotfix, X.Y.Z+1)"; \
	echo "  3) major  (breaking change, X+1.0.0)"; \
	echo ""; \
	printf "Choice [1]: "; \
	read CHOICE; \
	case "$${CHOICE:-1}" in \
		1) PREFIX="feat" ;; \
		2) PREFIX="fix" ;; \
		3) PREFIX="major" ;; \
		*) echo "Invalid choice"; exit 1 ;; \
	esac; \
	echo ""; \
	printf "Branch name (e.g. add-feature): "; \
	read NAME; \
	if [ -z "$$NAME" ]; then \
		echo "ERROR: branch name cannot be empty"; \
		exit 1; \
	fi; \
	BRANCH="$$PREFIX/$$NAME"; \
	echo ""; \
	echo "Creating branch: $$BRANCH"; \
	git checkout -b "$$BRANCH"; \
	echo ""; \
	echo "✅ Branch '$$BRANCH' created."; \
	echo "📝 Remember to add your changes to CHANGELOG.md under ## [Unreleased]"
