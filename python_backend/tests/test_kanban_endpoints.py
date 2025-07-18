import pytest
from flask.testing import FlaskClient
import json
from datetime import datetime, timedelta

# Helper to create URL with optional project path
def _url(project_path: str = None, item_id: int = None) -> str:
    base = "/api/kanban"
    if item_id is not None:
        base = f"{base}/{item_id}"
    if project_path:
        return f"{base}?projectPath={project_path}"
    return base


def test_kanban_crud(client: FlaskClient, tmp_project):
    # List initial items (should be empty)
    resp = client.get(_url(tmp_project))
    assert resp.status_code == 200
    assert resp.json["data"] == []
    
    # Create new item
    payload = {"title": "Implement feature"}
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 201
    data = resp.json["data"]
    item_id = data["id"]
    assert data["title"] == "Implement feature"
    assert data["status"] == "todo"  # default
    assert data["priority"] == "medium"  # default
    
    # Update item
    update = {"status": "in-progress", "priority": "high"}
    resp = client.put(_url(tmp_project, item_id), json=update)
    assert resp.status_code == 200
    assert resp.json["data"]["status"] == "in-progress"
    assert resp.json["data"]["priority"] == "high"
    
    # Delete item
    resp = client.delete(_url(tmp_project, item_id))
    assert resp.status_code == 204
    
    # Verify deletion
    resp = client.get(_url(tmp_project))
    assert resp.status_code == 200
    assert resp.json["data"] == []


def test_create_item_missing_title(client: FlaskClient, tmp_project):
    # Missing required field
    resp = client.post(_url(tmp_project), json={})
    assert resp.status_code == 400
    assert "Validation error" in resp.json["error"]


def test_create_item_empty_title(client: FlaskClient, tmp_project):
    # Empty title should fail
    resp = client.post(_url(tmp_project), json={"title": ""})
    assert resp.status_code == 400
    assert "Validation error" in resp.json["error"]


def test_create_item_title_too_long(client: FlaskClient, tmp_project):
    # Title over 256 characters
    long_title = "a" * 257
    resp = client.post(_url(tmp_project), json={"title": long_title})
    assert resp.status_code == 400


def test_create_item_invalid_status(client: FlaskClient, tmp_project):
    # Invalid status value
    payload = {"title": "Task", "status": "invalid-status"}
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 400


def test_create_item_invalid_priority(client: FlaskClient, tmp_project):
    # Invalid priority value
    payload = {"title": "Task", "priority": "urgent"}  # Should be high/medium/low
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 400


def test_create_item_with_all_fields(client: FlaskClient, tmp_project):
    # Test with all optional fields
    future_date = (datetime.now() + timedelta(days=7)).isoformat()
    payload = {
        "title": "Complete task",
        "details": "Task description",
        "status": "in-progress",
        "priority": "high",
        "dueDate": future_date,
        "userStoryIds": [1, 2, 3]
    }
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 201
    data = resp.json["data"]
    assert data["details"] == "Task description"
    assert data["dueDate"] == future_date
    assert data["userStoryIds"] == [1, 2, 3]


def test_update_nonexistent_item(client: FlaskClient, tmp_project):
    resp = client.put(_url(tmp_project, 999), json={"title": "Updated"})
    assert resp.status_code == 404


def test_delete_nonexistent_item(client: FlaskClient, tmp_project):
    resp = client.delete(_url(tmp_project, 999))
    assert resp.status_code == 404


def test_update_item_empty_details(client: FlaskClient, tmp_project):
    # Create item with details
    resp = client.post(_url(tmp_project), json={"title": "Task", "details": "Description"})
    item_id = resp.json["data"]["id"]
    
    # Update with empty details (should set to None)
    resp = client.put(_url(tmp_project, item_id), json={"details": ""})
    assert resp.status_code == 200
    assert resp.json["data"]["details"] is None


def test_update_item_invalid_due_date(client: FlaskClient, tmp_project):
    # Create item
    resp = client.post(_url(tmp_project), json={"title": "Task"})
    item_id = resp.json["data"]["id"]
    
    # Update with invalid date format
    resp = client.put(_url(tmp_project, item_id), json={"dueDate": "not-a-date"})
    assert resp.status_code == 400


def test_no_project_path(client: FlaskClient):
    # Test with no project path (in-memory)
    resp = client.get(_url())
    assert resp.status_code == 200
    
    # Create item without project
    resp = client.post(_url(), json={"title": "Memory task"})
    assert resp.status_code == 201


def test_empty_payload_create(client: FlaskClient, tmp_project):
    resp = client.post(_url(tmp_project), data=None, content_type='application/json')
    assert resp.status_code == 400


def test_null_payload_update(client: FlaskClient, tmp_project):
    # Create item first
    resp = client.post(_url(tmp_project), json={"title": "Task"})
    item_id = resp.json["data"]["id"]
    
    # Update with null payload
    resp = client.put(_url(tmp_project, item_id), data=None, content_type='application/json')
    assert resp.status_code == 200  # Empty update should succeed


def test_multiple_items_unique_ids(client: FlaskClient, tmp_project):
    # Create multiple items
    ids = []
    for i in range(5):
        resp = client.post(_url(tmp_project), json={"title": f"Task {i}"})
        assert resp.status_code == 201
        ids.append(resp.json["data"]["id"])
    
    # All IDs should be unique
    assert len(set(ids)) == len(ids)


def test_special_characters_in_title(client: FlaskClient, tmp_project):
    # Test with special characters
    payload = {"title": "Task with 你好 & <script>alert('xss')</script> émojis 🎯"}
    resp = client.post(_url(tmp_project), json=payload)
    assert resp.status_code == 201
    assert "你好" in resp.json["data"]["title"]
    assert "<script>" in resp.json["data"]["title"]
    assert "🎯" in resp.json["data"]["title"]


def test_whitespace_title(client: FlaskClient, tmp_project):
    # Title with only whitespace
    resp = client.post(_url(tmp_project), json={"title": "   \t\n   "})
    assert resp.status_code == 400


def test_due_date_formats(client: FlaskClient, tmp_project):
    # Test various date formats
    valid_dates = [
        "2025-12-31",
        "2025-12-31T23:59:59",
        "2025-12-31T23:59:59Z",
        "2025-12-31T23:59:59+00:00"
    ]
    
    for date in valid_dates:
        resp = client.post(_url(tmp_project), json={"title": "Task", "dueDate": date})
        assert resp.status_code == 201


def test_list_items_persistence(client: FlaskClient, tmp_project):
    # Create multiple items
    titles = ["Task A", "Task B", "Task C"]
    for title in titles:
        client.post(_url(tmp_project), json={"title": title})
    
    # List all items
    resp = client.get(_url(tmp_project))
    assert resp.status_code == 200
    items = resp.json["data"]
    assert len(items) == 3
    assert all(any(item["title"] == title for item in items) for title in titles)


def test_update_preserve_unchanged_fields(client: FlaskClient, tmp_project):
    # Create item with all fields
    payload = {
        "title": "Original",
        "details": "Original details",
        "priority": "low",
        "userStoryIds": [1, 2]
    }
    resp = client.post(_url(tmp_project), json=payload)
    item_id = resp.json["data"]["id"]
    created_at = resp.json["data"]["createdAt"]
    
    # Update only title
    resp = client.put(_url(tmp_project, item_id), json={"title": "Updated"})
    assert resp.status_code == 200
    data = resp.json["data"]
    assert data["title"] == "Updated"
    assert data["details"] == "Original details"  # Unchanged
    assert data["priority"] == "low"  # Unchanged
    assert data["userStoryIds"] == [1, 2]  # Unchanged
    assert data["createdAt"] == created_at  # Unchanged


def test_invalid_json_create(client: FlaskClient, tmp_project):
    # Send invalid JSON
    resp = client.post(_url(tmp_project), data='{"invalid json}', content_type='application/json')
    assert resp.status_code == 400


def test_invalid_json_update(client: FlaskClient, tmp_project):
    # Create item
    resp = client.post(_url(tmp_project), json={"title": "Task"})
    item_id = resp.json["data"]["id"]
    
    # Update with invalid JSON
    resp = client.put(_url(tmp_project, item_id), data='{"invalid json}', content_type='application/json')
    assert resp.status_code == 400