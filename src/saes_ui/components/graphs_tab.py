"""Interactive Graphs section component for SAES statistical workbench."""

import io
from typing import Any

import streamlit as st

from saes.domain.models import Dataset
from saes.visualization.registry import PlotterRegistry
from saes.visualization.utils import PALETTE_MAP, get_color_map


@st.cache_data
def _export_plotly_image(fig_json: str, fmt: str) -> bytes:
    import plotly.io as pio

    fig = pio.from_json(fig_json)
    scale = 3.0 if fmt == "png" else 1.0
    return bytes(pio.to_image(fig, format=fmt, scale=scale))


def render_graphs_tab(dataset: Dataset) -> None:
    """Render interactive graph workbench with problem selection, personalization, and export options.

    Args:
        dataset: Validated SAES dataset object containing benchmark results.
    """
    st.subheader("Statistical Visualization Workbench")
    st.caption("Publication-grade exploratory graphics, customization, and export.")

    df = dataset.df
    if df.empty:
        st.info("No data available in dataset.")
        return

    # --- 1. Problem Context & Data Scope Panel ---
    with st.container(border=True):
        st.markdown("#### 1. Experimental Context & Data Scope")
        col_inst, col_met, col_algs = st.columns([1, 1, 2])

        with col_inst:
            available_instances = sorted([str(i) for i in df["instance"].unique()])
            inst_options = ["All Instances (Combined)"] + available_instances
            selected_instance = st.selectbox(
                "Problem Instance", options=inst_options, index=1 if available_instances else 0
            )

        with col_met:
            available_metrics = sorted([str(m) for m in df["metric"].unique()])
            selected_metric = st.selectbox("Performance Metric", options=available_metrics, index=0)

        # Filter by instance & metric to determine relevant algorithms
        filtered_base = df.copy()
        if selected_instance != "All Instances (Combined)":
            filtered_base = filtered_base[filtered_base["instance"].astype(str) == selected_instance]
        filtered_base = filtered_base[filtered_base["metric"].astype(str) == selected_metric]

        available_algs = sorted([str(a) for a in filtered_base["algorithm"].unique()])

        with col_algs:
            selected_algorithms = st.multiselect(
                "Filter Algorithms",
                options=available_algs,
                default=available_algs,
                help="Select one or more algorithms to include in the plot.",
            )

    if not selected_algorithms:
        st.warning("Please select at least one algorithm to generate the visualization.")
        return

    plot_df = filtered_base[filtered_base["algorithm"].astype(str).isin(selected_algorithms)].copy()
    if plot_df.empty:
        st.warning("No dataset rows match the selected problem filters.")
        return

    # --- 2. Visualization Configuration & Aesthetic Control Panel ---
    available_plotters = PlotterRegistry.list_available()
    plot_type_keys = list(available_plotters.keys())

    def format_func(k: str) -> str:
        return f"{available_plotters[k]['name']}"

    custom_colors: dict[str, str] = {}
    custom_title = ""

    with st.container(border=True):
        st.markdown("#### 2. Visualization & Styling Options")
        c_type, c_style, c_colors = st.columns([1.2, 1.2, 1.6])

        with c_type:
            st.markdown("**Plot Type & Scale**")
            selected_plot_type = st.selectbox(
                "Plot Type",
                options=plot_type_keys,
                format_func=format_func,
                index=0,
            )
            assert selected_plot_type is not None
            height = int(st.number_input("Plot Height (px)", min_value=300, max_value=900, value=500, step=50))
            custom_title = st.text_input("Custom Title", value="", placeholder="Optional custom title...")

        with c_style:
            st.markdown("**Style & Element Sizing**")
            palette = st.selectbox("Color Palette", options=list(PALETTE_MAP.keys()), index=0)
            show_legend = st.checkbox("Show Legend", value=True)
            log_y = st.checkbox("Logarithmic Y-axis", value=False)
            show_points = True
            box_width = 0.4
            point_size = 6

            if selected_plot_type == "boxplot":
                box_width = float(
                    st.slider("Box Width / Thickness", min_value=0.1, max_value=0.8, value=0.4, step=0.05)
                )
                show_points = st.checkbox("Overlay Run Points", value=True)
                if show_points:
                    point_size = int(st.slider("Point Size", min_value=2, max_value=14, value=6, step=1))
            elif selected_plot_type == "scatter":
                point_size = int(st.slider("Point Size", min_value=3, max_value=16, value=8, step=1))

        with c_colors:
            st.markdown("**Algorithm Colors**")
            use_single_color = st.checkbox("Use Single Uniform Color", value=False)

            if use_single_color:
                single_hex = st.color_picker("Chart Color", value="#1F77B4")
                custom_colors = {alg: single_hex for alg in selected_algorithms}
            else:
                default_colors = get_color_map(selected_algorithms, palette)
                custom_colors = dict(default_colors)
                with st.expander("Customize Individual Colors", expanded=False):
                    cp_cols = st.columns(3)
                    for idx, alg in enumerate(selected_algorithms):
                        cp_col = cp_cols[idx % 3]
                        def_hex = default_colors.get(alg, "#1F77B4")
                        chosen_hex = cp_col.color_picker(alg, value=def_hex, key=f"cp_{alg}")
                        custom_colors[alg] = chosen_hex

    # --- 3. Construct Plotter & Kwargs ---
    plotter = PlotterRegistry.get(selected_plot_type)

    plot_kwargs: dict[str, Any] = {
        "metric": selected_metric,
        "instance": selected_instance if selected_instance != "All Instances (Combined)" else "",
        "height": height,
        "palette": palette,
        "custom_colors": custom_colors,
        "log_y": log_y,
        "show_points": show_points,
        "show_legend": show_legend,
        "box_width": box_width,
        "point_size": point_size,
    }

    if custom_title.strip():
        plot_kwargs["title"] = custom_title.strip()

    # --- 4. Chart Toolbar & Interactive View ---
    try:
        fig_plotly = plotter.plot_interactive(plot_df, **plot_kwargs)
    except Exception as e:
        st.error(f"Failed to generate interactive plot: {str(e)}")
        return

    c_title, c_export = st.columns([4, 1])

    with c_title:
        st.markdown(f"#### {plotter.name} — {selected_instance} ({selected_metric})")

    with c_export:
        with st.popover("📥 Export Plot", use_container_width=True):
            st.markdown("**Download Format**")
            fmt_choice = st.selectbox(
                "Select Format",
                options=["Interactive HTML", "PNG Image (300 DPI)", "Vector SVG", "CSV Dataset"],
                index=0,
            )

            if fmt_choice == "Interactive HTML":
                try:
                    html_bytes = fig_plotly.to_html(include_plotlyjs="cdn", full_html=True).encode("utf-8")
                    st.download_button(
                        label="Download HTML Plot",
                        data=html_bytes,
                        file_name=f"saes_plot_{selected_plot_type}.html",
                        mime="text/html",
                    )
                except Exception as err:
                    st.warning(f"HTML export error: {str(err)}")

            elif fmt_choice == "PNG Image (300 DPI)":
                try:
                    png_bytes = _export_plotly_image(fig_plotly.to_json(), "png")
                    st.download_button(
                        label="Download PNG Image",
                        data=png_bytes,
                        file_name=f"saes_plot_{selected_plot_type}.png",
                        mime="image/png",
                    )
                except Exception:
                    fig_mpl = plotter.plot(plot_df, **plot_kwargs)
                    png_buf = io.BytesIO()
                    fig_mpl.savefig(png_buf, format="png", dpi=300, bbox_inches="tight")
                    st.download_button(
                        label="Download PNG Image",
                        data=png_buf.getvalue(),
                        file_name=f"saes_plot_{selected_plot_type}.png",
                        mime="image/png",
                    )

            elif fmt_choice == "Vector SVG":
                try:
                    svg_bytes = _export_plotly_image(fig_plotly.to_json(), "svg")
                    st.download_button(
                        label="Download Vector SVG",
                        data=svg_bytes,
                        file_name=f"saes_plot_{selected_plot_type}.svg",
                        mime="image/svg+xml",
                    )
                except Exception:
                    fig_mpl = plotter.plot(plot_df, **plot_kwargs)
                    svg_buf = io.BytesIO()
                    fig_mpl.savefig(svg_buf, format="svg", bbox_inches="tight")
                    st.download_button(
                        label="Download Vector SVG",
                        data=svg_buf.getvalue(),
                        file_name=f"saes_plot_{selected_plot_type}.svg",
                        mime="image/svg+xml",
                    )

            elif fmt_choice == "CSV Dataset":
                csv_bytes = plot_df.to_csv(index=False).encode("utf-8")
                st.download_button(
                    label="Download CSV Dataset",
                    data=csv_bytes,
                    file_name=f"saes_plot_data_{selected_metric}.csv",
                    mime="text/csv",
                )

    # Render Chart
    st.plotly_chart(fig_plotly, width="stretch")

    st.caption(
        "Interactive Resizing: Click and drag the handle at the bottom-right corner of the plot frame "
        "to resize manually with your mouse. Hover over elements to inspect values."
    )
