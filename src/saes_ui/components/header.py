"""Header component for SAES UI."""

import streamlit as st


def render_header() -> None:
    """Render minimalist scientific header."""
    st.title("SAES — Stochastic Algorithm Evaluation Suite")
    st.caption("Interactive Statistical Workbench & AI-Assisted Algorithm Evaluation")
