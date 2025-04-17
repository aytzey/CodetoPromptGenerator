# python_backend/services/codemap_service.py
# ────────────────────────────────────────────────────────────────────────────
"""
CodemapService (Tree‑sitter edition)
====================================

Parses Python, JavaScript, TypeScript **and TSX** with **Tree‑sitter** to
extract:

    • class names
    • top‑level / exported function names (incl. arrow functions)
    • remaining identifiers as light‑weight "references"

This version pins ``tree_sitter==0.21.3`` for compatibility with
``tree_sitter_languages==1.10.2`` and aliases ``.tsx`` → **typescript** so we
no longer depend on a dedicated *tsx* grammar (some wheels omit it).

SOLID ✦
-------
* **S**RP – one service → one responsibility (symbol extraction).
* **O**CP – add a language by tweaking ``_EXT_TO_LANG`` only.
* **L**SP – unchanged return schema.
* **I**SP – consumer depends on a single public method.
* **D**IP – I/O delegated to *FileStorageRepository*.
"""
from __future__ import annotations

import logging
import os
import re
from typing import Dict, List, Set, Tuple

from tree_sitter_languages import get_parser
from tree_sitter import Node, Parser  # type: ignore

from repositories.file_storage import FileStorageRepository

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────────────
# 1 · Extension → language mapping  (tsx aliases to typescript)
# ────────────────────────────────────────────────────────────────────────────
_EXT_TO_LANG: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",  # ← alias: TS parser handles TSX fine
}

# Cache parsers – expensive to create
_PARSER_CACHE: dict[str, Parser] = {}

def _get_parser(lang: str) -> Parser:
    if lang not in _PARSER_CACHE:
        try:
            _PARSER_CACHE[lang] = get_parser(lang)
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(f"Tree‑sitter parser for '{lang}' not found.") from exc
    return _PARSER_CACHE[lang]

# ────────────────────────────────────────────────────────────────────────────
# 2 · Reserved keyword sets (quick filter)
# ────────────────────────────────────────────────────────────────────────────
_JS_TS_RESERVED = {
    "break", "case", "catch", "class", "const", "continue", "debugger",
    "default", "delete", "do", "else", "enum", "export", "extends",
    "false", "finally", "for", "function", "if", "import", "in",
    "instanceof", "new", "null", "return", "super", "switch", "this",
    "throw", "true", "try", "typeof", "var", "void", "while", "with",
    "yield", "await", "let",
}
_PY_RESERVED = {
    "False", "None", "True", "and", "as", "assert", "async", "await",
    "break", "class", "continue", "def", "del", "elif", "else", "except",
    "finally", "for", "from", "global", "if", "import", "in", "is",
    "lambda", "match", "nonlocal", "not", "or", "pass", "raise", "return",
    "try", "while", "with", "yield",
}
_COMMON_RESERVED: Set[str] = {kw.lower() for kw in (_JS_TS_RESERVED | _PY_RESERVED)}

# ────────────────────────────────────────────────────────────────────────────
# 3 · Helpers
# ────────────────────────────────────────────────────────────────────────────
_IDENTIFIER_RE = re.compile(r"[A-Za-z_]\w{2,}")  # ≥ 3 chars

def _dedupe_preserve_order(items: List[str]) -> List[str]:
    seen: Set[str] = set()
    out: List[str] = []
    for itm in items:
        if itm not in seen:
            seen.add(itm)
            out.append(itm)
    return out

# ────────────────────────────────────────────────────────────────────────────
# 4 · Internal symbol collector
# ────────────────────────────────────────────────────────────────────────────
class _SymbolCollector:
    """DFS walker translating AST nodes → symbol buckets."""

    CLASS_NODES = {"class_declaration", "class_definition"}
    FUNC_NODES = {
        "function_declaration",
        "function_definition",  # python
        "method_definition",
    }

    def __init__(self, source: bytes) -> None:
        self._src = source
        self.classes: List[str] = []
        self.funcs: List[str] = []
        self.refs: List[str] = []

    # ------------------------------------------------------------------ walk
    def collect(self, node: Node) -> Tuple[List[str], List[str], List[str]]:
        self._walk(node)
        return (
            _dedupe_preserve_order(self.classes),
            _dedupe_preserve_order(self.funcs),
            _dedupe_preserve_order(self.refs),
        )

    def _walk(self, node: Node) -> None:
        typ = node.type
        # — classes —
        if typ in self.CLASS_NODES:
            name_node = node.child_by_field_name("name")
            if name_node:
                self.classes.append(self._text(name_node))
        # — functions —
        elif typ in self.FUNC_NODES:
            name_node = node.child_by_field_name("name")
            if name_node:
                self.funcs.append(self._text(name_node))
        elif typ == "variable_declarator":  # const foo = () => {}
            if any(c.type == "arrow_function" for c in node.children):
                name = node.child_by_field_name("name")
                if name:
                    self.funcs.append(self._text(name))
        # — identifiers → refs —
        elif typ == "identifier":
            ident = self._text(node)
            if ident.lower() not in _COMMON_RESERVED:
                self.refs.append(ident)
        # recurse
        for child in node.children:
            self._walk(child)

    def _text(self, node: Node) -> str:
        return self._src[node.start_byte : node.end_byte].decode("utf-8", errors="ignore")

# ────────────────────────────────────────────────────────────────────────────
# 5 · Public service
# ────────────────────────────────────────────────────────────────────────────
_SAFE_SIZE_LIMIT = int(os.getenv("CTP_CODEMAP_SIZE_LIMIT", "4000000"))  # 4 MB

class CodemapService:
    """Top‑level API used by *codemap_controller*."""

    __slots__ = ("_storage",)

    def __init__(self, storage_repo: FileStorageRepository) -> None:
        self._storage = storage_repo

    # ---------------------------------------------------------------- helpers
    @staticmethod
    def _lang_for(path: str) -> str | None:
        return _EXT_TO_LANG.get(os.path.splitext(path)[1].lower())

    def _extract_one(self, abs_path: str, rel: str) -> Dict[str, List[str]] | None:
        lang = self._lang_for(abs_path)
        if not lang:
            logger.debug("Codemap: skipping unsupported file %s", rel)
            return None

        content = self._storage.read_text(abs_path)
        if content is None or len(content) > _SAFE_SIZE_LIMIT:
            logger.info("Codemap: skip %s (unreadable or too big)", rel)
            return None

        parser = _get_parser(lang)
        src_bytes = content.encode("utf-8", errors="ignore")
        tree = parser.parse(src_bytes)

        collector = _SymbolCollector(src_bytes)
        classes, funcs, refs = collector.collect(tree.root_node)

        # Deduplicate across buckets
        seen: Set[str] = set()
        for bucket in (classes, funcs, refs):
            for item in list(bucket):
                if item in seen:
                    bucket.remove(item)
                else:
                    seen.add(item)

        return {"classes": classes, "functions": funcs, "references": refs}

    # ---------------------------------------------------------------- public
    def extract_codemap(self, base_dir: str, rel_paths: List[str]) -> Dict[str, Dict[str, List[str]]]:
        if not os.path.isdir(base_dir):
            raise ValueError("base_dir must be an existing directory")
        if not isinstance(rel_paths, list):
            raise ValueError("rel_paths must be a list")

        result: Dict[str, Dict[str, List[str]]] = {}
        for rel in rel_paths:
            abs_path = os.path.join(base_dir, rel)
            if not os.path.isfile(abs_path):
                continue
            data = self._extract_one(abs_path, rel)
            if data:
                result[rel] = data
        return result
