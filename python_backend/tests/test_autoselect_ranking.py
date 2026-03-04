import os
import sys
from pathlib import Path

# Allow imports from python_backend when tests run from repo root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from repositories.file_storage import FileStorageRepository
from services.autoselect_service import AutoselectService


def _make_service() -> AutoselectService:
    # Bypass __init__ so tests stay focused on candidate-pool logic.
    svc = AutoselectService.__new__(AutoselectService)
    svc._storage = FileStorageRepository()  # type: ignore[attr-defined]
    return svc


def test_tree_text_lists_full_relative_paths():
    svc = _make_service()
    rendered = svc._tree_text(["src/components/Button.tsx", "python_backend/services/autoselect_service.py"])

    assert "0001. src/components/Button.tsx" in rendered
    assert "0002. python_backend/services/autoselect_service.py" in rendered


def test_candidate_pool_returns_all_paths_when_under_limit():
    svc = _make_service()

    allowed = [
        "views/CodemapPreviewModal.tsx",
        "python_backend/services/prompt_service.py",
        "python_backend/services/autoselect_service.py",
    ]
    pooled = svc._build_candidate_pool("any task", allowed, None)
    assert pooled == allowed


def test_candidate_pool_uses_llm_shortlist_when_available(monkeypatch):
    svc = _make_service()
    svc._MAX_CANDIDATE_POOL = 3  # type: ignore[attr-defined]

    allowed = [
        "src/a.ts",
        "src/b.ts",
        "src/c.ts",
        "src/d.ts",
        "src/e.ts",
    ]

    def _fake_shortlist(**kwargs):
        assert kwargs["max_selected"] == 3
        assert kwargs["base_dir"] == "/tmp/project"
        return ["src/d.ts", "src/b.ts", "src/a.ts"]

    monkeypatch.setattr(svc, "_llm_shortlist_candidate_pool", _fake_shortlist)

    pooled = svc._build_candidate_pool(
        "fix auth issue",
        allowed,
        "/tmp/project",
        "openrouter",
        "sk-test",
        "model-x",
        20.0,
    )
    assert pooled == ["src/d.ts", "src/b.ts", "src/a.ts"]


def test_candidate_pool_falls_back_to_prefix_when_shortlist_empty(monkeypatch):
    svc = _make_service()
    svc._MAX_CANDIDATE_POOL = 2  # type: ignore[attr-defined]

    allowed = [
        "src/main.ts",
        "src/routes/index.ts",
        "src/handler.ts",
    ]
    monkeypatch.setattr(svc, "_llm_shortlist_candidate_pool", lambda **_kwargs: [])

    pooled = svc._build_candidate_pool(
        "genel iyilestirme",
        allowed,
        "/tmp/project",
        "openrouter",
        "sk-test",
        "model-x",
        20.0,
    )
    assert pooled == ["src/main.ts", "src/routes/index.ts"]


def test_llm_shortlist_chunks_then_reduces(monkeypatch):
    svc = _make_service()
    svc._LLM_SHORTLIST_INPUT_LIMIT = 2  # type: ignore[attr-defined]

    calls = []

    def _fake_once(**kwargs):
        calls.append(kwargs.get("chunk_label"))
        return kwargs["allowed_paths"]

    def _fake_reduce(**kwargs):
        assert kwargs["shortlisted_paths"] == ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"]
        assert kwargs["max_selected"] == 3
        return ["c.ts", "a.ts", "d.ts"]

    monkeypatch.setattr(svc, "_llm_shortlist_candidate_pool_once", _fake_once)
    monkeypatch.setattr(svc, "_llm_reduce_candidate_pool", _fake_reduce)

    shortlisted = svc._llm_shortlist_candidate_pool(
        instructions="fix selection",
        allowed_paths=["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"],
        base_dir=None,
        provider="openrouter",
        api_key="sk-test",
        model="model-x",
        timeout=20.0,
        max_selected=3,
    )

    assert calls == ["Chunk 1/3", "Chunk 2/3", "Chunk 3/3"]
    assert shortlisted == ["c.ts", "a.ts", "d.ts"]


def test_candidate_pool_prompt_block_adds_code_context_hint(tmp_path: Path):
    svc = _make_service()

    target = tmp_path / "src" / "service.py"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        "class Service:\n"
        "    def run(self):\n"
        "        return True\n",
        encoding="utf-8",
    )

    block = svc._candidate_pool_prompt_block(
        ["src/service.py"],
        base_dir=str(tmp_path),
    )

    assert "src/service.py ::" in block
    assert "class Service" in block or "def run" in block


def test_finalize_selection_dedupes_without_padding():
    svc = _make_service()

    candidate_paths = [
        "src/app.ts",
        "src/db.ts",
        "tests/app.test.ts",
    ]
    selected = [
        "src/app.ts",
        "src/app.ts",
        "missing/path.ts",
        "src/db.ts",
    ]
    finalized = svc._finalize_selection(selected, candidate_paths)

    assert finalized == ["src/app.ts", "src/db.ts"]


def test_merge_shortlist_prioritizes_llm_then_fills_from_ranked():
    svc = _make_service()

    merged = svc._merge_shortlist_with_ranked(
        llm_shortlist=["b.ts", "a.ts", "b.ts"],
        ranked=["a.ts", "c.ts", "d.ts"],
        limit=3,
    )

    assert merged == ["b.ts", "a.ts", "c.ts"]
