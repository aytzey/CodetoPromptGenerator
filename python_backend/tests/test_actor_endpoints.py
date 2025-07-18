import os
import sys
from pathlib import Path

import pytest
from flask.testing import FlaskClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from controllers import actor_controller  # must import after sys.path hack
from services.actor_service import ActorService
from repositories.file_storage import FileStorageRepository


@pytest.fixture(autouse=True)
def _patch_service(monkeypatch, tmp_path):
    """
    Inject a fresh in‑memory ActorService into the blueprint for each test.
    """
    monkeypatch.setattr(
        actor_controller,
        "actor_service",
        ActorService(FileStorageRepository()),
        raising=True,
    )


def _url(project_path: str, suffix: str = "") -> str:
    base = f"/api/actors{suffix}"
    return f"{base}?projectPath={project_path}" if project_path else base


def test_actor_crud(client: FlaskClient, tmp_project):
    # list default
    resp = client.get(_url(tmp_project))
    assert resp.status_code == 200
    assert len(resp.json["data"]) == 3

    # create
    payload = {"name": "UX Designer", "role": "Improves UX"}
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 201
    new_id = resp.json["data"]["id"]

    # bad create (validation)
    resp = client.post(_url(tmp_project), json={"role": "missing name"})
    assert resp.status_code == 400

    # update
    resp = client.put(_url(tmp_project, f"/{new_id}"), json={"role": "Owns UX"})
    assert resp.status_code == 200
    assert resp.json["data"]["role"] == "Owns UX"

    # get
    resp = client.get(_url(tmp_project, f"/{new_id}"))
    assert resp.status_code == 200

    # delete
    resp = client.delete(_url(tmp_project, f"/{new_id}"))
    assert resp.status_code == 204

    # not‑found after delete
    resp = client.get(_url(tmp_project, f"/{new_id}"))
    assert resp.status_code == 404


def test_invalid_project_path(client: FlaskClient):
    # Non-existent directory should fail
    bad_path = "/this/path/does/not/exist"
    resp = client.get(_url(bad_path))
    assert resp.status_code == 400
    assert "not a valid directory" in resp.json["message"]


def test_create_actor_with_empty_name(client: FlaskClient, tmp_project):
    # Empty name should fail validation
    payload = {"name": "", "role": "Test role"}
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 400


def test_create_actor_with_invalid_permissions(client: FlaskClient, tmp_project):
    # Permissions must be list of strings
    payload = {
        "name": "Test Actor",
        "role": "Test role",
        "permissions": ["valid", 123, None]  # Invalid types
    }
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 400


def test_update_nonexistent_actor(client: FlaskClient, tmp_project):
    resp = client.put(_url(tmp_project, "/999"), json={"role": "Ghost"})
    assert resp.status_code == 404


def test_delete_nonexistent_actor(client: FlaskClient, tmp_project):
    resp = client.delete(_url(tmp_project, "/999"))
    assert resp.status_code == 404


def test_get_nonexistent_actor(client: FlaskClient, tmp_project):
    resp = client.get(_url(tmp_project, "/999"))
    assert resp.status_code == 404


def test_empty_payload_create(client: FlaskClient, tmp_project):
    # Empty payload should fail
    resp = client.post(_url(tmp_project), json={})
    assert resp.status_code == 400


def test_null_payload_create(client: FlaskClient, tmp_project):
    # Null payload should fail
    resp = client.post(_url(tmp_project), data=None, content_type='application/json')
    assert resp.status_code == 400


def test_update_with_invalid_id_type(client: FlaskClient, tmp_project):
    # Changing id in update should be rejected or ignored
    resp = client.put(_url(tmp_project, "/1"), json={"id": 999, "role": "Changed"})
    if resp.status_code == 200:
        # Should preserve original ID
        assert resp.json["data"]["id"] == 1


def test_actor_suggest_endpoint(client: FlaskClient, tmp_project):
    # Test suggest endpoint
    payload = {"description": "Someone who writes tests"}
    resp = client.post(_url(tmp_project, "/suggest"), json=payload)
    assert resp.status_code == 200
    assert "actorId" in resp.json["data"]


def test_actor_suggest_empty_description(client: FlaskClient, tmp_project):
    # Empty description should still work
    payload = {"description": ""}
    resp = client.post(_url(tmp_project, "/suggest"), json=payload)
    assert resp.status_code == 200


def test_actor_suggest_no_description(client: FlaskClient, tmp_project):
    # Missing description field
    payload = {}
    resp = client.post(_url(tmp_project, "/suggest"), json=payload)
    assert resp.status_code == 200  # Should handle gracefully


def test_create_actor_with_all_fields(client: FlaskClient, tmp_project):
    # Test creating actor with all optional fields
    payload = {
        "name": "QA Engineer",
        "role": "Ensures quality",
        "permissions": ["Run tests", "Review code"],
        "goals": ["100% test coverage", "Zero bugs"]
    }
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 201
    data = resp.json["data"]
    assert data["name"] == "QA Engineer"
    assert data["role"] == "Ensures quality"
    assert "Run tests" in data["permissions"]
    assert "100% test coverage" in data["goals"]


def test_update_partial_fields(client: FlaskClient, tmp_project):
    # Update only some fields
    resp = client.put(_url(tmp_project, "/1"), json={"goals": ["New goal"]})
    assert resp.status_code == 200
    data = resp.json["data"]
    assert data["goals"] == ["New goal"]
    # Other fields should remain unchanged
    assert data["name"] == "Developer"


def test_create_multiple_actors_unique_ids(client: FlaskClient, tmp_project):
    # Create multiple actors and ensure IDs are unique
    ids = []
    for i in range(5):
        payload = {"name": f"Actor {i}", "role": f"Role {i}"}
        resp = client.post(_url(tmp_project), json=payload)
        assert resp.status_code == 201
        ids.append(resp.json["data"]["id"])
    
    # All IDs should be unique
    assert len(set(ids)) == len(ids)


def test_very_long_strings(client: FlaskClient, tmp_project):
    # Test with very long strings
    long_string = "a" * 10000
    payload = {
        "name": long_string,
        "role": long_string,
        "permissions": [long_string],
        "goals": [long_string]
    }
    resp = client.post(_url(tmp_project), json=payload)
    # Should either accept or reject gracefully
    assert resp.status_code in [201, 400]


def test_special_characters_in_fields(client: FlaskClient, tmp_project):
    # Test with special characters
    payload = {
        "name": "Actor with 特殊字符 🎭",
        "role": "Role with\nnewlines\tand\ttabs",
        "permissions": ["<script>alert('xss')</script>"],
        "goals": ["Goal with \"quotes\" and 'apostrophes'"]
    }
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 201
    # Ensure data is preserved correctly
    data = resp.json["data"]
    assert "特殊字符" in data["name"]
    assert "🎭" in data["name"]
