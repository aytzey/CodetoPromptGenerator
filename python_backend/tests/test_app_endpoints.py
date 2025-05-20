import os
import sys
from flask.testing import FlaskClient
import pytest

# Allow imports from the python_backend package when tests are run from the repo root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app


@pytest.fixture
def client() -> FlaskClient:
    app = create_app({"TESTING": True})
    return app.test_client()


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "healthy"}


def test_todo_crud(client):
    # list todos
    resp = client.get("/api/todos")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True

    # add todo
    resp = client.post("/api/todos", json={"text": "pytest item"})
    assert resp.status_code == 201
    new_id = resp.get_json()["data"]["id"]

    # update
    resp = client.put(f"/api/todos/{new_id}", json={"completed": True})
    assert resp.status_code == 200
    assert resp.get_json()["data"]["completed"] is True

    # delete
    resp = client.delete(f"/api/todos/{new_id}")
    assert resp.status_code == 204
