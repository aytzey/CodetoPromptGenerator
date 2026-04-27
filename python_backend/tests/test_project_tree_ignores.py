import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from repositories.file_storage import FileStorageRepository
from services.codemap_service import CodemapService
from services.exclusion_service import ExclusionService
from services.project_service import ProjectService
from services.service_exceptions import InvalidInputError, PermissionDeniedError


def _flatten_tree(nodes):
    paths = []
    for node in nodes:
        paths.append(node["relativePath"])
        paths.extend(_flatten_tree(node.get("children") or []))
    return paths


def test_project_tree_honors_project_ignore_files_and_builtin_artifacts(tmp_path: Path):
    (tmp_path / ".gitignore").write_text(
        "src-tauri/target/\n"
        "src-tauri/gen/\n"
        "out/*\n"
        "!out/.gitkeep\n",
        encoding="utf-8",
    )
    (tmp_path / ".dockerignore").write_text(
        ".secrets/\n"
        "data/\n",
        encoding="utf-8",
    )
    (tmp_path / ".env.example").write_text("SECRET=x", encoding="utf-8")

    for rel in [
        "app/page.tsx",
        "shared/types.ts",
        "src-tauri/src/main.rs",
        "docs/assets/hero.png",
        "public/logo.svg",
        "package-lock.json",
        "src-tauri/target/debug/artifact.json",
        "src-tauri/gen/schemas/generated.json",
        "node_modules/pkg/index.js",
        "out/index.html",
        ".secrets/openrouter.env",
        "data/sample.json",
    ]:
        path = tmp_path / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("x", encoding="utf-8")

    storage = FileStorageRepository()
    service = ProjectService(storage, ExclusionService(storage))

    paths = _flatten_tree(service.get_project_tree(str(tmp_path)))

    assert "app/page.tsx" in paths
    assert "shared/types.ts" in paths
    assert "src-tauri/src/main.rs" in paths
    assert ".gitignore" not in paths
    assert ".dockerignore" not in paths
    assert ".env.example" not in paths
    assert "docs/assets/hero.png" not in paths
    assert "public/logo.svg" not in paths
    assert "package-lock.json" not in paths
    assert not any(path.startswith("src-tauri/target") for path in paths)
    assert not any(path.startswith("src-tauri/gen") for path in paths)
    assert not any(path.startswith("node_modules") for path in paths)
    assert not any(path.startswith("out") for path in paths)
    assert not any(path.startswith(".secrets") for path in paths)
    assert not any(path.startswith("data") for path in paths)


def test_exclusion_service_cleans_comments_duplicates_and_slashes(tmp_path: Path):
    storage = FileStorageRepository()
    service = ExclusionService(storage)
    service.project_root = str(tmp_path)

    (tmp_path / "ignoreDirs.txt").write_text(
        "\n"
        "# comment\n"
        "node_modules\n"
        "src\\\\generated\n"
        "node_modules\n",
        encoding="utf-8",
    )

    assert service.get_global_exclusions() == ["node_modules", "src/generated"]
    assert service.update_global_exclusions(["", "# no", "dist", "dist", "build\\out"]) == [
        "dist",
        "build/out",
    ]


def test_exclusion_service_reads_project_ignore_exclusions_with_sources(tmp_path: Path):
    (tmp_path / ".gitignore").write_text(
        "\n"
        "# comment\n"
        "graphify-out/\n"
        "out/*\n"
        "!out/.gitkeep\n",
        encoding="utf-8",
    )
    (tmp_path / ".dockerignore").write_text(
        "out\n"
        "graphify-out/\n",
        encoding="utf-8",
    )

    storage = FileStorageRepository()
    service = ExclusionService(storage)

    assert service.get_project_ignore_exclusions(str(tmp_path)) == [
        {"source": ".gitignore", "pattern": "graphify-out/", "negated": False},
        {"source": ".gitignore", "pattern": "out/*", "negated": False},
        {"source": ".gitignore", "pattern": "!out/.gitkeep", "negated": True},
        {"source": ".dockerignore", "pattern": "out", "negated": False},
        {"source": ".dockerignore", "pattern": "graphify-out/", "negated": False},
    ]


def test_get_files_content_rejects_paths_outside_project_root(tmp_path: Path):
    project_dir = tmp_path / "project"
    project_dir.mkdir()
    outside_file = tmp_path / "outside.txt"
    outside_file.write_text("secret", encoding="utf-8")

    storage = FileStorageRepository()
    service = ProjectService(storage, ExclusionService(storage))

    try:
        service.get_files_content(str(project_dir), ["../outside.txt"])
    except PermissionDeniedError:
        pass
    else:
        raise AssertionError("Expected path traversal to be rejected")

    try:
        service.get_files_content(str(project_dir), [str(outside_file)])
    except InvalidInputError:
        pass
    else:
        raise AssertionError("Expected absolute paths to be rejected")


def test_codemap_rejects_paths_outside_project_root(tmp_path: Path):
    project_dir = tmp_path / "project"
    project_dir.mkdir()
    outside_file = tmp_path / "outside.ts"
    outside_file.write_text("export const secret = 1", encoding="utf-8")

    service = CodemapService(FileStorageRepository())
    result = service.extract_codemap(str(project_dir), ["../outside.ts", str(outside_file)])

    assert result["../outside.ts"]["error"] == "Path escapes project root"
    assert result[str(outside_file)]["error"] == "Invalid relative path"
