import pytest
from pydantic import ValidationError

from services.actor_service import ActorService
from repositories.file_storage import FileStorageRepository
from services.service_exceptions import InvalidInputError


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
    with pytest.raises(InvalidInputError):
        svc.create_actor({"role": "Missing name"}, tmp_project)


def test_update_actor_invalid_id(file_repo, tmp_project):
    svc = _service(file_repo)
    assert svc.update_actor(999, {"role": "ghost"}, tmp_project) is None


def test_update_actor_validation_error(file_repo, tmp_project):
    svc = _service(file_repo)
    with pytest.raises(InvalidInputError):
        svc.update_actor(1, {"permissions": [123]}, tmp_project)  # not str list


def test_create_actor_name_too_long(file_repo, tmp_project):
    svc = _service(file_repo)
    with pytest.raises(InvalidInputError):
        svc.create_actor({"name": "a" * 101, "role": "test"}, tmp_project)  # max 100 chars


def test_create_actor_empty_role(file_repo, tmp_project):
    svc = _service(file_repo)
    with pytest.raises(InvalidInputError):
        svc.create_actor({"name": "Test", "role": ""}, tmp_project)  # min 1 char


def test_invalid_project_directory(file_repo):
    svc = _service(file_repo)
    fake_path = "/this/path/does/not/exist"
    with pytest.raises(InvalidInputError) as exc_info:
        svc.list_actors(fake_path)
    assert "not a valid directory" in str(exc_info.value)


def test_create_actor_with_none_fields(file_repo, tmp_project):
    svc = _service(file_repo)
    # None permissions should convert to empty list
    actor = svc.create_actor({
        "name": "Test",
        "role": "Role",
        "permissions": None,
        "goals": None
    }, tmp_project)
    assert actor.permissions == []
    assert actor.goals == []


def test_update_actor_preserves_unchanged_fields(file_repo, tmp_project):
    svc = _service(file_repo)
    # Get initial state of actor 1
    initial = svc.list_actors(tmp_project)[0]
    
    # Update only name
    updated = svc.update_actor(1, {"name": "Modified Developer"}, tmp_project)
    
    # All other fields should remain unchanged
    assert updated.name == "Modified Developer"
    assert updated.role == initial.role
    assert updated.permissions == initial.permissions
    assert updated.goals == initial.goals


def test_concurrent_id_generation(file_repo, tmp_project):
    svc = _service(file_repo)
    
    # Create multiple actors rapidly
    actors = []
    for i in range(10):
        actor = svc.create_actor({"name": f"Actor{i}", "role": f"Role{i}"}, tmp_project)
        actors.append(actor)
    
    # All IDs should be unique
    ids = [a.id for a in actors]
    assert len(set(ids)) == len(ids)
    # IDs should be sequential starting from 4 (after 3 defaults)
    assert ids == list(range(4, 14))


def test_load_corrupted_actors_file(file_repo, tmp_project, monkeypatch):
    svc = _service(file_repo)
    
    # Create corrupted data
    file_path = svc._get_actors_file_path(tmp_project)
    file_repo.write_json(file_path, {"actors": [
        {"id": 1, "name": "Valid", "role": "Valid"},
        {"id": "not-a-number", "name": "Invalid ID"},  # Invalid
        None,  # Invalid
        "not a dict",  # Invalid
        {"id": 2}  # Missing required fields
    ]})
    
    # Should load only valid actors and skip invalid ones
    actors = svc.list_actors(tmp_project)
    assert len(actors) == 1
    assert actors[0].name == "Valid"


def test_file_permissions_error(file_repo, tmp_project, monkeypatch):
    svc = _service(file_repo)
    
    # Mock makedirs to raise OSError
    def mock_makedirs(*args, **kwargs):
        raise OSError("Permission denied")
    
    monkeypatch.setattr("os.makedirs", mock_makedirs)
    
    with pytest.raises(IOError) as exc_info:
        svc._get_project_dir(tmp_project)  # Use existing project path
    assert "Failed to create directory" in str(exc_info.value)


def test_update_actor_invalid_types(file_repo, tmp_project):
    svc = _service(file_repo)
    
    # Try to update with wrong types
    with pytest.raises(InvalidInputError):
        svc.update_actor(1, {"goals": "not a list"}, tmp_project)
    
    with pytest.raises(InvalidInputError):
        svc.update_actor(1, {"permissions": {"not": "a list"}}, tmp_project)


def test_create_actor_extra_fields_ignored(file_repo, tmp_project):
    svc = _service(file_repo)
    
    # Extra fields should be ignored
    actor = svc.create_actor({
        "name": "Test",
        "role": "Role",
        "extra_field": "should be ignored",
        "another_extra": 123
    }, tmp_project)
    
    # Actor should be created successfully without extra fields
    assert actor.name == "Test"
    assert not hasattr(actor, "extra_field")


def test_delete_all_actors(file_repo, tmp_project):
    svc = _service(file_repo)
    
    # Delete all default actors
    assert svc.delete_actor(1, tmp_project)
    assert svc.delete_actor(2, tmp_project)
    assert svc.delete_actor(3, tmp_project)
    
    # When all actors are deleted, defaults are re-initialized
    actors = svc.list_actors(tmp_project)
    assert len(actors) == 3  # Default actors are restored
    
    # Can still create new actors with continued IDs
    new_actor = svc.create_actor({"name": "New", "role": "After deletion"}, tmp_project)
    assert new_actor.id == 4  # IDs continue from where they left off


def test_actor_json_serialization(file_repo, tmp_project):
    svc = _service(file_repo)
    
    # Create actor with special characters
    special_actor = svc.create_actor({
        "name": "Actor\nwith\ttabs",
        "role": "Has \"quotes\" and 'apostrophes'",
        "permissions": ["Permission with \\backslash"],
        "goals": ["Goal with unicode: 你好 🚀"]
    }, tmp_project)
    
    # Reload to ensure proper serialization/deserialization
    reloaded = svc.list_actors(tmp_project)
    found = next(a for a in reloaded if a.id == special_actor.id)
    
    assert found.name == "Actor\nwith\ttabs"
    assert "\"quotes\"" in found.role
    assert "\\backslash" in found.permissions[0]
    assert "你好 🚀" in found.goals[0]


def test_global_vs_project_actors(file_repo, tmp_project):
    svc = _service(file_repo)
    
    # Create global actor (no project path)
    global_actor = svc.create_actor({"name": "Global", "role": "Global role"}, None)
    
    # Create project actor
    project_actor = svc.create_actor({"name": "Project", "role": "Project role"}, tmp_project)
    
    # Global actors should not appear in project list
    project_actors = svc.list_actors(tmp_project)
    assert all(a.name != "Global" for a in project_actors)
    
    # Project actors should not appear in global list
    global_actors = svc.list_actors(None)
    assert all(a.name != "Project" for a in global_actors)
