import os
import sys
import pytest

# Allow imports from the python_backend package when tests are run from the repo root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.todo_service import TodoService
from repositories.file_storage import FileStorageRepository


@pytest.fixture
def todo_service():
    repo = FileStorageRepository()
    return TodoService(repo)


def test_add_list_update_delete(todo_service):
    # Initially returns at least the sample todo
    initial = todo_service.list_todos(None)
    assert isinstance(initial, list)
    assert len(initial) >= 1

    new = todo_service.add_todo("write tests", None)
    assert new["text"] == "write tests"
    new_id = new["id"]

    updated = todo_service.update_todo(new_id, True, None)
    assert updated is not None
    assert updated["completed"] is True

    assert todo_service.delete_todo(new_id, None) is True
    remaining = [t for t in todo_service.list_todos(None) if t["id"] == new_id]
    assert not remaining
