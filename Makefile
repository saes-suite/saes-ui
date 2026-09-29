.PHONY: help install dev ui build lint format test ci

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	uv sync

dev: ## Start UI in development mode
	uv run streamlit run src/saes_ui/app.py

ui: dev ## Start UI application

build: ## Build wheel and sdist
	uv build

lint: ## Run ruff and mypy
	uv run ruff check .
	uv run mypy src

format: ## Auto-format code
	uv run ruff format .

test: ## Run test suite
	uv run pytest

ci: lint test ## Run CI quality gate
