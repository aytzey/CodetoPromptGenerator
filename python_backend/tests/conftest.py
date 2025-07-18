import os
import sys
import pytest
from pathlib import Path

# make `import services.*` etc. resolve when tests are run from repo root
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import create_app
from repositories.file_storage import FileStorageRepository


@pytest.fixture(scope="session")
def file_repo() -> FileStorageRepository:
    """Shared FileStorageRepository instance (stateless)."""
    return FileStorageRepository()


@pytest.fixture
def tmp_project(tmp_path) -> str:
    """Create an empty temporary project directory."""
    p = tmp_path / "proj"
    p.mkdir()
    return str(p)


@pytest.fixture
def app(monkeypatch):
    """
    A Flask app pre‑configured for testing.

    * Ensures `OPENROUTER_API_KEY` is present (many services check it).
    * Runs with `TESTING = True` so exceptions propagate.
    """
    monkeypatch.setenv("OPENROUTER_API_KEY", "test‑key")
    flask_app = create_app({"TESTING": True})
    return flask_app


@pytest.fixture
def client(app):
    """Flask test‑client shortcut."""
    return app.test_client()
