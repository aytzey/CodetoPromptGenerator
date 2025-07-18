import json
from pathlib import Path

from services.exclusion_service import ExclusionService
from repositories.file_storage import FileStorageRepository


def test_global_exclusions_roundtrip(tmp_path, monkeypatch):
    # isolate global ignoreDirs.txt into tmp area
    root = tmp_path / "root"
    root.mkdir()
    monkeypatch.setattr(ExclusionService, "project_root", str(root), raising=False)

    svc = ExclusionService(FileStorageRepository())
    updated = svc.update_global_exclusions(["node_modules", "dist"])
    assert updated == ["node_modules", "dist"]
    assert svc.get_global_exclusions() == ["node_modules", "dist"]


def test_local_exclusions_roundtrip(tmp_path, file_repo):
    proj = tmp_path / "proj"
    proj.mkdir()

    svc = ExclusionService(file_repo)
    data = svc.update_local_exclusions(str(proj), ["*.log", "*.tmp"])
    assert "*.log" in data
    assert svc.get_local_exclusions(str(proj)) == ["*.log", "*.tmp"]
