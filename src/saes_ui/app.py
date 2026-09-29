"""Interactive Streamlit GUI application for SAES statistical evaluation suite."""

import io
import sys
from typing import Any

import pandas as pd
import streamlit as st

from saes_ui.client import SAESClient
from saes_ui.components.chat_widget import render_chat_widget
from saes_ui.components.graphs_tab import render_graphs_tab
from saes_ui.components.header import render_header
from saes_ui.styles import apply_gui_styles


def load_sample_dataset() -> str:
    """Provide built-in sample benchmark dataset."""
    return """algorithm,instance,metric,run_id,value,maximize
NSGAII,ZDT1,HV,0,0.662145,True
NSGAII,ZDT1,HV,1,0.661890,True
NSGAII,ZDT1,HV,2,0.662012,True
NSGAII,ZDT1,HV,3,0.661500,True
NSGAII,ZDT1,HV,4,0.662300,True
MOEAD,ZDT1,HV,0,0.665421,True
MOEAD,ZDT1,HV,1,0.665100,True
MOEAD,ZDT1,HV,2,0.665900,True
MOEAD,ZDT1,HV,3,0.664800,True
MOEAD,ZDT1,HV,4,0.665300,True
SVM,Iris,accuracy,0,0.985000,True
SVM,Iris,accuracy,1,0.973000,True
SVM,Iris,accuracy,2,0.980000,True
RandomForest,Iris,accuracy,0,0.990000,True
RandomForest,Iris,accuracy,1,0.987000,True
RandomForest,Iris,accuracy,2,0.989000,True
"""


def main() -> None:
    """Execute main Streamlit application layout."""
    st.set_page_config(
        page_title="SAES — Algorithm Evaluation Suite",
        page_icon="📈",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    apply_gui_styles()
    render_header()

    # --- Sidebar Configuration ---
    st.sidebar.markdown("### ⚙️ Workspace Configuration")

    connection_mode = st.sidebar.radio(
        "Execution Engine",
        options=["Local Python Core", "Remote REST API"],
        index=0,
    )

    api_url = None
    if connection_mode == "Remote REST API":
        api_url = st.sidebar.text_input("API URL", value="http://localhost:8000")

    client = SAESClient(api_url=api_url)

    st.sidebar.markdown("---")
    st.sidebar.markdown("### 📂 Data Source")
    data_source_mode = st.sidebar.radio("Input mode", ["Upload CSV", "Built-in Sample"], index=1)

    csv_raw: str | None = None
    if data_source_mode == "Upload CSV":
        uploaded_file = st.sidebar.file_uploader("Select benchmark CSV", type=["csv"])
        if uploaded_file is not None:
            csv_raw = uploaded_file.getvalue().decode("utf-8", errors="replace")
    else:
        csv_raw = load_sample_dataset()
        st.sidebar.success("Sample dataset loaded.")

    alpha = st.sidebar.slider(
        "Significance Level (α)",
        min_value=0.01,
        max_value=0.10,
        value=0.05,
        step=0.01,
        help="Standard threshold for rejecting the null hypothesis (default: 0.05).",
    )

    if not csv_raw:
        st.info("👈 Please select or upload a dataset in the sidebar to begin.")
        return

    # --- Load & Validate Dataset ---
    try:
        dataset = client.load_dataset(io.StringIO(csv_raw))
        validation = client.validate(dataset)
    except Exception as e:
        st.error(f"Failed to parse CSV input: {e}")
        return

    # --- Compute Statistical Analysis ---
    report = None
    if validation.is_valid:
        try:
            report = client.analyze(dataset, alpha=alpha)
        except Exception as e:
            st.warning(f"Error computing statistical tests: {e}")

    # --- Main Navigation Tabs ---
    tab_data, tab_stats, tab_graphs, tab_chat = st.tabs(
        ["📋 Data & Validation", "📊 Statistical Tests", "📈 Visualizations", "🤖 AI Consultant"]
    )

    with tab_data:
        st.markdown("#### Validation Report")
        if validation.is_valid:
            st.success("✅ Dataset schema, columns, and data types are valid.")
        else:
            st.error("❌ Dataset failed schema validation.")
            for err in validation.errors:
                st.write(f"- {err}")

        st.markdown("#### Raw Data Preview")
        st.dataframe(dataset.df, use_container_width=True)

    with tab_stats:
        if report and report.cell_analyses:
            st.markdown("#### Automated Statistical Hypothesis Testing Results")
            df_summary = report.to_dataframe()
            st.dataframe(df_summary, use_container_width=True)

            with st.expander("🔬 Detailed Assumptions & Diagnostics"):
                for cell in report.cell_analyses:
                    res = cell.result
                    st.markdown(f"**Cell `{cell.instance}` — `{cell.metric}`** (`{res.test_name}`)")
                    st.write(f"- Statistic: `{res.statistic:.4f}`, p-value: `{res.p_value:.4e}`")
                    for a in res.assumptions:
                        status = "✅ Passed" if a.passed else "⚠️ Violated"
                        st.write(f"  - {a.name}: p={a.p_value:.4e} ({status})")
        else:
            st.info("Validation must pass to run statistical tests.")

    with tab_graphs:
        render_graphs_tab(dataset)

    with tab_chat:
        render_chat_widget(client, report=report, dataset=dataset)


def run_cli() -> None:
    """Entry point for saes-gui command."""
    import os
    import subprocess

    app_path = os.path.abspath(__file__)
    subprocess.run(["streamlit", "run", app_path] + sys.argv[1:], check=False)


if __name__ == "__main__":
    main()
