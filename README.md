# SAES-UI — Interactive Statistical Evaluation Workbench

Interactive web and desktop user interface for the **Stochastic Algorithm Evaluation Suite (SAES)**.

---

## 🚀 Features

- **Interactive Analysis**: Upload benchmark CSVs and inspect automated hypothesis test decisions, ANOVA, and t-tests.
- **Publication Graphics**: Interactive Plotly charts (boxplots, violins, barplots, ECDFs) with custom color palettes and high-resolution export (PNG, SVG, PDF).
- **Embedded AI Consultant**: Incrustated statistical chatbot to interpret effect sizes, explain Welch test selection, and answer research questions.
- **Dual Execution Engine**: Run completely offline against local `saes` or connect to a remote `saes-api` server.

---

## 📦 Running the Application

```bash
# 1. Install dependencies
uv sync

# 2. Run interactive UI
uv run streamlit run src/saes_ui/app.py
```
