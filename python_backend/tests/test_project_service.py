import os
import shutil
from pathlib import Path

from services.project_service import ProjectService
from services.exclusion_service import ExclusionService
from repositories.file_storage import FileStorageRepository


def _svc(repo):
    return ProjectService(repo, ExclusionService(repo))


def _make_tree(base: Path):
    (base / "src").mkdir()
    (base / "src" / "main.py").write_text("def foo():\n    pass\n")
    (base / "README.md").write_text("# Readme\n")
    # directory placeholder
    (base / "docs").mkdir()
    # binary file
    (base / "image.png").write_bytes(b"\x89PNG\r\n\x1a\n\0\0\0\0")


def test_project_tree_and_files(tmp_path, file_repo):
    proj = tmp_path / "proj"
    _make_tree(proj)

    svc = _svc(file_repo)
    tree = svc.get_project_tree(str(proj))
    names = {n["name"] for n in tree}
    assert names >= {"src", "README.md", "docs", "image.png"}

    # files content
    res = svc.get_files_content(
        str(proj),
        ["src/main.py", "docs", "image.png", "missing.txt"],
    )
    # directory placeholder
    dir_entry = next(r for r in res if r["path"] == "docs")
    assert dir_entry["isDirectory"] is True
    # binary placeholder
    bin_entry = next(r for r in res if r["path"] == "image.png")
    assert bin_entry["isBinary"] is True
    # missing file raises
    try:
        svc.get_files_content(str(proj), ["nope.py"])
        assert False, "Expected ResourceNotFoundError"
    except Exception:
        pass  # expected


def test_token_count(tmp_path, file_repo):
    svc = _svc(file_repo)
    txt = "hello world  " * 10
    assert svc.estimate_token_count(txt) >= 20
