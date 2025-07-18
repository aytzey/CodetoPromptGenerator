import pytest
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
