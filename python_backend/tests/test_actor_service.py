import pytest
from pydantic import ValidationError

from services.actor_service import ActorService
from repositories.file_storage import FileStorageRepository


def _service(repo: FileStorageRepository):
    return ActorService(repo)


def test_default_actors_loaded(file_repo, tmp_project):
    svc = _service(file_repo)
    actors = svc.list_actors(tmp_project)
    # three defaults shipped in service implementation
    assert len(actors) >= 3
    assert {a.id for a in actors} == {1, 2, 3}


def test_create_update_delete_actor(file_repo, tmp_project):
    svc = _service(file_repo)

    new = svc.create_actor(
        {"name": "QA Engineer", "role": "Tests the tool"}, tmp_project
    )
    assert new.id == 4
    assert new.name == "QA Engineer"

    # update
    patched = svc.update_actor(
        new.id, {"role": "Ensures quality", "permissions": ["Run test suite"]}, tmp_project
    )
    assert patched.role == "Ensures quality"
    assert "Run test suite" in patched.permissions

    # delete
    assert svc.delete_actor(new.id, tmp_project) is True
    assert svc.delete_actor(new.id, tmp_project) is False  # idempotent


def test_create_actor_validation(file_repo, tmp_project):
    svc = _service(file_repo)
    with pytest.raises(ValueError):
        svc.create_actor({"role": "Missing name"}, tmp_project)


def test_update_actor_invalid_id(file_repo, tmp_project):
    svc = _service(file_repo)
    assert svc.update_actor(999, {"role": "ghost"}, tmp_project) is None


def test_update_actor_validation_error(file_repo, tmp_project):
    svc = _service(file_repo)
    with pytest.raises(ValueError):
        svc.update_actor(1, {"permissions": [123]}, tmp_project)  # not str list
