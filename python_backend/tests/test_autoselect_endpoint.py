"""
This test stubs out the heavy OpenRouter call so we can exercise payload
validation & HTTP semantics without external traffic.
"""
import sys
from pathlib import Path

import pytest
from flask.testing import FlaskClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from controllers import autoselect_controller


class _StubSvc:
    def autoselect_paths(self, req, clarifications=None):
        return (["foo.py"], {"selected": ["foo.py"], "confidence": 1.0})


@pytest.fixture(autouse=True)
def _patch_autoselect(monkeypatch):
    monkeypatch.setattr(autoselect_controller, "svc", _StubSvc(), raising=True)


def test_autoselect_success(client: FlaskClient, tmp_project):
    payload = {
        "baseDir": tmp_project,
        "treePaths": ["foo.py"],
        "instructions": "Test selection",
    }
    resp = client.post("/api/autoselect", json=payload)
    assert resp.status_code == 200
    assert resp.json["data"]["selected"] == ["foo.py"]


def test_autoselect_validation_error(client: FlaskClient):
    # missing instructions
    bad = client.post("/api/autoselect", json={"baseDir": "/", "treePaths": []})
    assert bad.status_code == 400
