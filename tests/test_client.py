"""Unit tests for SAES UI client."""

import io

from saes_ui.client import SAESClient

SAMPLE_CSV = """algorithm,instance,metric,run_id,value,maximize
NSGAII,ZDT1,HV,0,0.662145,True
NSGAII,ZDT1,HV,1,0.661890,True
NSGAII,ZDT1,HV,2,0.662012,True
MOEAD,ZDT1,HV,0,0.665421,True
MOEAD,ZDT1,HV,1,0.665100,True
MOEAD,ZDT1,HV,2,0.665900,True
"""


def test_client_local_execution() -> None:
    client = SAESClient(api_url=None)
    assert not client.is_remote

    dataset = client.load_dataset(io.StringIO(SAMPLE_CSV))
    assert not dataset.df.empty

    val = client.validate(dataset)
    assert val.is_valid

    report = client.analyze(dataset, alpha=0.05)
    assert len(report.cell_analyses) == 1

    chat_resp = client.chat("Why was this test chosen?", report=report, dataset=dataset)
    assert "Test Selection Rationale" in chat_resp
