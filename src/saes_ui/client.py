"""Client interface for communicating with SAES statistical engine.

Supports both direct local library invocation and remote REST API execution.
"""

from typing import Any


class SAESClient:
    """Client for SAES computations."""

    def __init__(self, api_url: str | None = None) -> None:
        self.api_url = api_url.rstrip("/") if api_url else None

    @property
    def is_remote(self) -> bool:
        """Whether client is configured to connect to remote REST API."""
        return bool(self.api_url)

    def load_dataset(self, source: Any) -> Any:
        """Load dataset via local library or CSV buffer."""
        import saes

        return saes.load(source)

    def validate(self, dataset: Any) -> Any:
        """Validate dataset structure."""
        import saes

        return saes.validate(dataset)

    def analyze(self, dataset: Any, alpha: float = 0.05) -> Any:
        """Run statistical analysis on dataset."""
        import saes

        return saes.analyze(dataset, alpha=alpha, generate_plots=False)

    def chat(self, query: str, report: Any = None, dataset: Any = None) -> str:
        """Query statistical chat agent."""
        if self.is_remote:
            try:
                import httpx

                csv_str = dataset.df.to_csv(index=False) if dataset is not None else None
                resp = httpx.post(
                    f"{self.api_url}/api/v1/chat",
                    json={"query": query, "csv_data": csv_str},
                    timeout=30.0,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return str(data.get("response", ""))
            except Exception:
                # Fallback to local
                pass

        # In-process execution
        from saes.chat.agent import StatisticalChatAgent

        agent = StatisticalChatAgent(report=report, dataset=dataset)
        return str(agent.ask(query))
