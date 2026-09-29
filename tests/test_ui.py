"""Unit tests for SAES UI components."""

from saes_ui.app import load_sample_dataset
from saes_ui.components.header import render_header
from saes_ui.styles import apply_gui_styles


def test_load_sample_dataset() -> None:
    data = load_sample_dataset()
    assert "algorithm,instance,metric,run_id,value,maximize" in data
    assert "NSGAII" in data
    assert "MOEAD" in data


def test_render_header_callable() -> None:
    assert callable(render_header)
    assert callable(apply_gui_styles)
