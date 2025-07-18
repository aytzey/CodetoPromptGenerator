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


def test_autoselect_missing_base_dir(client: FlaskClient):
    # Missing baseDir field
    resp = client.post("/api/autoselect", json={
        "treePaths": ["file1.py"],
        "instructions": "Test"
    })
    assert resp.status_code == 400


def test_autoselect_missing_tree_paths(client: FlaskClient):
    # Missing treePaths field
    resp = client.post("/api/autoselect", json={
        "baseDir": "/tmp",
        "instructions": "Test"
    })
    assert resp.status_code == 400


def test_autoselect_empty_instructions(client: FlaskClient, tmp_project):
    # Empty instructions should fail
    resp = client.post("/api/autoselect", json={
        "baseDir": tmp_project,
        "treePaths": ["foo.py"],
        "instructions": ""
    })
    assert resp.status_code == 400


def test_autoselect_whitespace_instructions(client: FlaskClient, tmp_project):
    # Only whitespace instructions should fail
    resp = client.post("/api/autoselect", json={
        "baseDir": tmp_project,
        "treePaths": ["foo.py"],
        "instructions": "   \t\n   "
    })
    assert resp.status_code == 400


def test_autoselect_short_instructions(client: FlaskClient, tmp_project):
    # Instructions less than 3 characters should fail
    resp = client.post("/api/autoselect", json={
        "baseDir": tmp_project,
        "treePaths": ["foo.py"],
        "instructions": "ab"
    })
    assert resp.status_code == 400


def test_autoselect_empty_base_dir(client: FlaskClient):
    # Empty baseDir should fail
    resp = client.post("/api/autoselect", json={
        "baseDir": "",
        "treePaths": ["foo.py"],
        "instructions": "Test"
    })
    assert resp.status_code == 400


def test_autoselect_with_languages(client: FlaskClient, tmp_project):
    # Test with optional languages field
    payload = {
        "baseDir": tmp_project,
        "treePaths": ["foo.py", "bar.cpp"],
        "instructions": "Test selection",
        "languages": ["py", "cpp"]
    }
    resp = client.post("/api/autoselect", json=payload)
    assert resp.status_code == 200


def test_autoselect_invalid_languages_type(client: FlaskClient, tmp_project):
    # Languages must be list of strings
    payload = {
        "baseDir": tmp_project,
        "treePaths": ["foo.py"],
        "instructions": "Test",
        "languages": "python"  # Should be list
    }
    resp = client.post("/api/autoselect", json=payload)
    assert resp.status_code == 400


def test_autoselect_null_payload(client: FlaskClient):
    # Null payload
    resp = client.post("/api/autoselect", data=None, content_type='application/json')
    assert resp.status_code == 400


def test_autoselect_empty_payload(client: FlaskClient):
    # Empty payload
    resp = client.post("/api/autoselect", json={})
    assert resp.status_code == 400


def test_autoselect_with_clarify_param(client: FlaskClient, tmp_project):
    # Test with clarify parameter
    payload = {
        "baseDir": tmp_project,
        "treePaths": ["foo.py"],
        "instructions": "Test selection",
    }
    resp = client.post("/api/autoselect?clarify=1", json=payload)
    assert resp.status_code == 200


def test_autoselect_with_clarifications(client: FlaskClient, tmp_project):
    # Test with clarifications in payload
    payload = {
        "baseDir": tmp_project,
        "treePaths": ["foo.py"],
        "instructions": "Test selection",
        "clarifications": {"q1": "answer1"}
    }
    resp = client.post("/api/autoselect?clarify=1", json=payload)
    assert resp.status_code == 200


def test_autoselect_clarify_endpoint(client: FlaskClient, tmp_project):
    # Test the /clarify shorthand endpoint
    data = {
        "payload": {
            "baseDir": tmp_project,
            "treePaths": ["foo.py"],
            "instructions": "Test selection"
        },
        "answers": {"q1": "answer1", "q2": "answer2"}
    }
    resp = client.post("/api/autoselect/clarify", json=data)
    assert resp.status_code == 200


def test_autoselect_clarify_empty_payload(client: FlaskClient):
    # Empty clarify request
    resp = client.post("/api/autoselect/clarify", json={})
    assert resp.status_code == 400


def test_autoselect_very_long_instructions(client: FlaskClient, tmp_project):
    # Very long instructions
    long_instructions = "Test " * 10000
    payload = {
        "baseDir": tmp_project,
        "treePaths": ["foo.py"],
        "instructions": long_instructions
    }
    resp = client.post("/api/autoselect", json=payload)
    assert resp.status_code == 200


def test_autoselect_many_tree_paths(client: FlaskClient, tmp_project):
    # Many tree paths
    many_paths = [f"file{i}.py" for i in range(1000)]
    payload = {
        "baseDir": tmp_project,
        "treePaths": many_paths,
        "instructions": "Test with many files"
    }
    resp = client.post("/api/autoselect", json=payload)
    assert resp.status_code == 200


def test_autoselect_special_characters_in_paths(client: FlaskClient, tmp_project):
    # Special characters in paths
    payload = {
        "baseDir": tmp_project,
        "treePaths": ["file with spaces.py", "文件.py", "file@#$.py"],
        "instructions": "Test special chars"
    }
    resp = client.post("/api/autoselect", json=payload)
    assert resp.status_code == 200


def test_autoselect_invalid_tree_paths_type(client: FlaskClient, tmp_project):
    # treePaths must be a list
    payload = {
        "baseDir": tmp_project,
        "treePaths": "not-a-list",
        "instructions": "Test"
    }
    resp = client.post("/api/autoselect", json=payload)
    assert resp.status_code == 400


def test_autoselect_response_structure(client: FlaskClient, tmp_project):
    # Verify response structure
    payload = {
        "baseDir": tmp_project,
        "treePaths": ["foo.py", "bar.py"],
        "instructions": "Test selection",
    }
    resp = client.post("/api/autoselect", json=payload)
    assert resp.status_code == 200
    data = resp.json["data"]
    assert "selected" in data
    assert isinstance(data["selected"], list)
    assert "confidence" in data
    assert isinstance(data["confidence"], (int, float))
