import pytest
from datetime import datetime
from services.kanban_service import KanbanService
from repositories.file_storage import FileStorageRepository


def _svc(repo):
    return KanbanService(repo)


def test_add_update_delete_item(file_repo, tmp_project):
    svc = _svc(file_repo)

    new = svc.add_item({"title": "Implement API"}, tmp_project)
    assert new["status"] == "todo"
    item_id = new["id"]

    # update title & status
    updated = svc.update_item(item_id, {"title": "Implement /v2 API", "status": "in-progress"}, tmp_project)
    assert updated["title"].endswith("/v2 API")
    assert updated["status"] == "in-progress"

    # delete
    assert svc.delete_item(item_id, tmp_project) is True
    assert svc.delete_item(item_id, tmp_project) is False


def test_add_item_requires_title(file_repo, tmp_project):
    svc = _svc(file_repo)
    with pytest.raises(ValueError):
        svc.add_item({"details": "missing title"}, tmp_project)


def test_item_id_generation(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Create multiple items
    ids = []
    for i in range(10):
        item = svc.add_item({"title": f"Item {i}"}, tmp_project)
        ids.append(item["id"])
    
    # IDs should be sequential starting from 1
    assert ids == list(range(1, 11))


def test_status_transitions(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Create item (defaults to todo)
    item = svc.add_item({"title": "Task"}, tmp_project)
    assert item["status"] == "todo"
    
    # Transition through statuses
    statuses = ["in-progress", "done", "todo"]
    for status in statuses:
        updated = svc.update_item(item["id"], {"status": status}, tmp_project)
        assert updated["status"] == status


def test_invalid_status_value(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Create item
    item = svc.add_item({"title": "Task"}, tmp_project)
    
    # Try invalid status
    with pytest.raises(ValueError):
        svc.update_item(item["id"], {"status": "completed"}, tmp_project)


def test_invalid_priority_value(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Try to create with invalid priority
    with pytest.raises(ValueError):
        svc.add_item({"title": "Task", "priority": "urgent"}, tmp_project)


def test_due_date_validation(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Valid ISO dates
    valid_dates = [
        "2025-12-31",
        "2025-12-31T23:59:59",
        "2025-12-31T23:59:59Z"
    ]
    
    for date in valid_dates:
        item = svc.add_item({"title": f"Task", "dueDate": date}, tmp_project)
        assert item["dueDate"] == date


def test_invalid_due_date_format(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Invalid date formats
    with pytest.raises(ValueError):
        svc.add_item({"title": "Task", "dueDate": "31/12/2025"}, tmp_project)
    
    with pytest.raises(ValueError):
        svc.add_item({"title": "Task", "dueDate": "not a date"}, tmp_project)


def test_clear_optional_fields(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Create item with optional fields
    item = svc.add_item({
        "title": "Task",
        "details": "Description",
        "dueDate": "2025-12-31"
    }, tmp_project)
    
    # Clear fields by setting to empty string
    updated = svc.update_item(item["id"], {"details": "", "dueDate": ""}, tmp_project)
    assert updated["details"] is None
    assert updated["dueDate"] is None


def test_user_story_ids_relationship(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Create item with story IDs
    item = svc.add_item({
        "title": "Task",
        "userStoryIds": [1, 2, 3]
    }, tmp_project)
    assert item["userStoryIds"] == [1, 2, 3]
    
    # Update story IDs
    updated = svc.update_item(item["id"], {"userStoryIds": [4, 5]}, tmp_project)
    assert updated["userStoryIds"] == [4, 5]


def test_in_memory_fallback(file_repo):
    svc = _svc(file_repo)
    
    # Use None as project path for in-memory
    item1 = svc.add_item({"title": "Memory task 1"}, None)
    item2 = svc.add_item({"title": "Memory task 2"}, None)
    
    # List in-memory items
    items = svc.list_items(None)
    assert len(items) == 2


def test_separate_project_isolation(file_repo, tmp_path):
    svc = _svc(file_repo)
    
    # Create two projects
    proj1 = tmp_path / "proj1"
    proj2 = tmp_path / "proj2"
    proj1.mkdir()
    proj2.mkdir()
    
    # Add items to each project
    svc.add_item({"title": "Project 1 task"}, str(proj1))
    svc.add_item({"title": "Project 2 task"}, str(proj2))
    
    # Verify isolation
    items1 = svc.list_items(str(proj1))
    items2 = svc.list_items(str(proj2))
    
    assert len(items1) == 1
    assert len(items2) == 1
    assert items1[0]["title"] == "Project 1 task"
    assert items2[0]["title"] == "Project 2 task"


def test_persistence_across_service_instances(file_repo, tmp_project):
    # First service instance
    svc1 = _svc(file_repo)
    item = svc1.add_item({"title": "Persistent task"}, tmp_project)
    
    # Second service instance should see the same data
    svc2 = _svc(file_repo)
    items = svc2.list_items(tmp_project)
    assert len(items) == 1
    assert items[0]["id"] == item["id"]


def test_created_at_timestamp(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Create item
    before = datetime.utcnow().isoformat()
    item = svc.add_item({"title": "Task"}, tmp_project)
    after = datetime.utcnow().isoformat()
    
    # createdAt should be between before and after
    assert before <= item["createdAt"] <= after
    
    # createdAt should not change on update
    original_created = item["createdAt"]
    updated = svc.update_item(item["id"], {"title": "Updated"}, tmp_project)
    assert updated["createdAt"] == original_created


def test_empty_title_validation(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Empty title
    with pytest.raises(ValueError):
        svc.add_item({"title": ""}, tmp_project)
    
    # Whitespace only title
    with pytest.raises(ValueError):
        svc.add_item({"title": "   \t\n   "}, tmp_project)


def test_title_length_limit(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Title at max length (256)
    max_title = "a" * 256
    item = svc.add_item({"title": max_title}, tmp_project)
    assert len(item["title"]) == 256
    
    # Title over max length
    with pytest.raises(ValueError):
        svc.add_item({"title": "a" * 257}, tmp_project)


def test_update_nonexistent_item_returns_none(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Update non-existent item
    result = svc.update_item(999, {"title": "Ghost"}, tmp_project)
    assert result is None


def test_delete_all_items(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Create multiple items
    for i in range(5):
        svc.add_item({"title": f"Task {i}"}, tmp_project)
    
    # Delete all
    items = svc.list_items(tmp_project)
    for item in items:
        assert svc.delete_item(item["id"], tmp_project) is True
    
    # Verify all deleted
    assert svc.list_items(tmp_project) == []


def test_special_characters_in_content(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Create with special characters
    item = svc.add_item({
        "title": "Unicode: 你好 🎯 мир",
        "details": "Contains\nnewlines\tand\ttabs"
    }, tmp_project)
    
    # Verify preservation
    assert "你好" in item["title"]
    assert "🎯" in item["title"]
    assert "\n" in item["details"]
    assert "\t" in item["details"]


def test_invalid_item_data_types(file_repo, tmp_project):
    svc = _svc(file_repo)
    
    # Title must be string
    with pytest.raises((ValueError, TypeError)):
        svc.add_item({"title": 123}, tmp_project)
    
    # userStoryIds must be list
    with pytest.raises((ValueError, TypeError)):
        svc.add_item({"title": "Task", "userStoryIds": "not a list"}, tmp_project)


