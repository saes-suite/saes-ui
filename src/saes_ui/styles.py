"""Custom CSS styling and design system for SAES Streamlit GUI."""

import streamlit as st


def apply_gui_styles() -> None:
    """Inject custom CSS for compact, modern statistical workbench layout."""
    st.markdown(
        """
        <style>
        /* Main layout bounds */
        .block-container {
            padding-top: 1.2rem;
            padding-bottom: 2rem;
            max-width: 96%;
        }

        /* Typography */
        h1 {
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            margin-bottom: 0.1rem !important;
            letter-spacing: -0.01em;
            color: #1e293b;
        }
        h2 {
            font-size: 1.2rem !important;
            font-weight: 600 !important;
            margin-top: 0.8rem !important;
            margin-bottom: 0.4rem !important;
            color: #334155;
        }
        h3 {
            font-size: 1.0rem !important;
            font-weight: 600 !important;
            margin-top: 0.6rem !important;
            margin-bottom: 0.3rem !important;
            color: #475569;
        }

        /* Custom Card Containers */
        div[data-testid="stVerticalBlockBorderWrapper"] {
            background-color: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            padding: 0.25rem 0.5rem;
            margin-bottom: 0.8rem;
        }

        h4 {
            font-size: 0.95rem !important;
            font-weight: 600 !important;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #475569;
            margin-bottom: 0.5rem !important;
        }

        /* Chat Widget Container */
        .chat-container {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            background: #ffffff;
            margin-top: 10px;
        }

        /* Metrics */
        div[data-testid="stMetricValue"] {
            font-size: 1.15rem !important;
            font-weight: 700 !important;
            color: #0f172a;
        }
        div[data-testid="stMetricLabel"] {
            font-size: 0.75rem !important;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #64748b;
        }

        /* Input Controls Styling */
        div[data-baseweb="select"] > div {
            border-radius: 6px !important;
        }
        div[data-testid="stColorPicker"] {
            padding-top: 0.1rem;
        }

        /* Expanders & Dataframes */
        .stExpander {
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            margin-bottom: 0.5rem !important;
        }
        div[data-testid="stDataFrame"] {
            margin-bottom: 0.5rem !important;
        }

        /* Download Button Styling */
        .stDownloadButton button {
            width: 100%;
            border-radius: 6px;
            font-weight: 500;
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            color: #1e293b;
        }
        .stDownloadButton button:hover {
            border-color: #3b82f6;
            color: #2563eb;
        }

        /* Resizable Chart Container */
        div[data-testid="stPlotlyChart"] {
            resize: both !important;
            overflow: auto !important;
            min-height: 300px !important;
            min-width: 350px !important;
            max-width: 100% !important;
            border: 1px dashed #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 6px !important;
            margin-bottom: 0.5rem !important;
            background-color: #ffffff !important;
        }

        div[data-testid="stPlotlyChart"]:hover {
            border-color: #3b82f6 !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
