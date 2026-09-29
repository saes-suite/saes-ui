"""Embedded Chatbot component for SAES UI."""

from typing import Any

import streamlit as st

from saes_ui.client import SAESClient


def render_chat_widget(client: SAESClient, report: Any = None, dataset: Any = None) -> None:
    """Render incrustated conversational statistical consultant widget.

    Args:
        client: SAES client instance.
        report: Optional computed AnalysisReport.
        dataset: Optional loaded Dataset.
    """
    st.subheader("🤖 Statistical AI Consultant")
    st.caption("Ask questions about test choices, p-values, effect sizes, and experimental conclusions.")

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = [
            {
                "role": "assistant",
                "content": (
                    "Hello! I am your SAES statistical assistant. "
                    "Upload or select a dataset, and I can explain why specific tests (like Welch's ANOVA) "
                    "were chosen, interpret effect sizes, or summarize results."
                ),
            }
        ]

    # Quick prompt suggestion buttons
    cols = st.columns(4)
    quick_query = None
    with cols[0]:
        if st.button("📊 Summarize", use_container_width=True):
            quick_query = "Please provide an executive summary of the benchmark results."
    with cols[1]:
        if st.button("🔍 Why this test?", use_container_width=True):
            quick_query = "Why were these specific statistical tests chosen?"
    with cols[2]:
        if st.button("📐 Effect Sizes", use_container_width=True):
            quick_query = "Explain the effect sizes and practical significance."
    with cols[3]:
        if st.button("⚠️ Assumptions", use_container_width=True):
            quick_query = "Were any statistical assumptions (normality, variance) violated?"

    # Render previous messages
    chat_box = st.container(height=380)
    with chat_box:
        for msg in st.session_state.chat_history:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

    # User input
    user_prompt = st.chat_input("Ask a question about the statistical results...")
    active_prompt = quick_query or user_prompt

    if active_prompt:
        st.session_state.chat_history.append({"role": "user", "content": active_prompt})
        with chat_box:
            with st.chat_message("user"):
                st.markdown(active_prompt)

            with st.chat_message("assistant"):
                with st.spinner("Analyzing statistical findings..."):
                    answer = client.chat(active_prompt, report=report, dataset=dataset)
                    st.markdown(answer)

        st.session_state.chat_history.append({"role": "assistant", "content": answer})
        st.rerun()
