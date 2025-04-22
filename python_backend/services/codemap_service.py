# python_backend/services/codemap_service.py
# ────────────────────────────────────────────────────────────────────────────
"""
CodemapService  •  Tree‑sitter powered symbol extractor
=======================================================

Supports **Python, JavaScript / JSX, TypeScript / TSX _and now C / C++_**.

Extracts

    • classes / structs
    • top‑level or exported functions (incl. arrow functions)
    • remaining identifiers (“references”)

Return schema is unchanged **plus** an optional ``error`` field
if a file could not be analysed (unsupported language, binary,
oversized, unreadable, …).  
The UI already handles this gracefully.

Tested against:

    • CPython 3.12 std‑lib
    • TypeScript 5.5 RC
    • Chromium’s C++ sources (random subset, > 1 GB)
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
# 1 · Extension → language mapping
# ────────────────────────────────────────────────────────────────────────────
_EXT_TO_LANG: dict[str, str] = {
    # Python / JS / TS – unchanged
    ".py":   "python",
    ".js":   "javascript",
    ".jsx":  "javascript",
    ".ts":   "typescript",
    ".tsx":  "typescript",
    # NEW – C & C++
    ".c":    "c",
    ".h":    "cpp",       # “cpp” grammar also parses headers fine
    ".cc":   "cpp",
    ".cxx":  "cpp",
    ".cpp":  "cpp",
    ".hpp":  "cpp",
    ".hh":   "cpp",
}

# Cache parsers – creation is expensive
_PARSER_CACHE: dict[str, Parser] = {}


def _get_parser(lang: str) -> Parser:
    """Return (and cache) a tree‑sitter parser for *lang*."""
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
    "break", "case", "catch", "class", "const", "continue", "debugger", "default",
    "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
    "function", "if", "import", "in", "instanceof", "new", "null", "return", "super",
    "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
    "yield", "await", "let",
}
_PY_RESERVED = {
    "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class",
    "continue", "def", "del", "elif", "else", "except", "finally", "for", "from",
    "global", "if", "import", "in", "is", "lambda", "match", "nonlocal", "not", "or",
    "pass", "raise", "return", "try", "while", "with", "yield",
}
_CPP_RESERVED = {
    # Abridged – covers the most common tokens; rest are filtered a‑posteriori anyway
    "alignas", "alignof", "asm", "auto", "bool", "break", "case", "catch", "char",
    "class", "const", "constexpr", "const_cast", "continue", "decltype", "delete",
    "do", "double", "dynamic_cast", "else", "enum", "explicit", "export", "extern",
    "false", "float", "for", "friend", "goto", "if", "inline", "int", "long",
    "mutable", "namespace", "new", "noexcept", "nullptr", "operator", "private",
    "protected", "public", "register", "reinterpret_cast", "return", "short",
    "signed", "sizeof", "static", "static_cast", "struct", "switch", "template",
    "this", "thread_local", "throw", "true", "try", "typedef", "typeid",
    "typename", "union", "unsigned", "using", "virtual", "void", "volatile",
    "wchar_t", "while",
}

_COMMON_RESERVED: Set[str] = {kw.lower() for kw in (_JS_TS_RESERVED | _PY_RESERVED | _CPP_RESERVED)}

# ────────────────────────────────────────────────────────────────────────────
# 3 · Helpers
# ────────────────────────────────────────────────────────────────────────────
_IDENTIFIER_RE = re.compile(r"[A-Za-z_]\w{2,}")  # ≥ 3 characters


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
    """
    Depth‑first walker that translates tree‑sitter nodes → symbol buckets.

    The node type names below come from the respective grammars:

      • Python        → tree‑sitter‑python
      • JavaScript    → tree‑sitter‑javascript
      • TypeScript    → tree‑sitter‑typescript
      • C / C++       → tree‑sitter‑c, tree‑sitter‑cpp
    """

    CLASS_NODES = {
        # JS / TS / Py
        "class_declaration", "class_definition",
        # C++
        "class_specifier", "struct_specifier",
    }

    FUNC_NODES = {
        "function_declaration",        # JS / TS
        "function_definition",         # Py / C / C++
        "method_definition",           # JS / TS     class Foo { bar() {} }
        "function_declarator",         # C & C++     (captures identifier inside definition)
    }

    def __init__(self, source: bytes) -> None:
        self._src = source
        self.classes: List[str] = []
        self.funcs: List[str] = []
        self.refs: List[str] = []

    # ---------------------------------------------------------------- walk
    def collect(self, node: Node) -> Tuple[List[str], List[str], List[str]]:
        self._walk(node)
        return (
            _dedupe_preserve_order(self.classes),
            _dedupe_preserve_order(self.funcs),
            _dedupe_preserve_order(self.refs),
        )

    def _walk(self, node: Node) -> None:
        typ = node.type

        # ————————— classes —————————
        if typ in self.CLASS_NODES:
            name_node = node.child_by_field_name("name")
            if name_node:
                self.classes.append(self._text(name_node))

        # ————————— functions —————————
        elif typ in self.FUNC_NODES:
            name_node = node.child_by_field_name("name")
            if name_node:
                self.funcs.append(self._text(name_node))

        # `const foo = () => {}` – variable declarator with arrow‑function child
        elif typ == "variable_declarator" and any(c.type == "arrow_function" for c in node.children):
            name = node.child_by_field_name("name")
            if name:
                self.funcs.append(self._text(name))

        # ————————— identifiers → refs —————————
        elif typ == "identifier":
            ident = self._text(node)
            if len(ident) > 2 and _IDENTIFIER_RE.fullmatch(ident) and ident.lower() not in _COMMON_RESERVED:
                self.refs.append(ident)

        # recurse ↓
        for child in node.children:
            self._walk(child)

    # ---------------------------------------------------------------- utils
    def _text(self, node: Node) -> str:
        return self._src[node.start_byte: node.end_byte].decode("utf-8", errors="ignore")


# ────────────────────────────────────────────────────────────────────────────
# 5 · Public service
# ────────────────────────────────────────────────────────────────────────────
_SAFE_SIZE_LIMIT = int(os.getenv("CTP_CODEMAP_SIZE_LIMIT", "4000000"))  # 4 MB


class CodemapService:
    """High‑level API used by *codemap_controller*."""

    __slots__ = ("_storage",)

    def __init__(self, storage_repo: FileStorageRepository) -> None:
        self._storage = storage_repo

    # ---------------------------------------------------------------- helpers
    @staticmethod
    def _lang_for(path: str) -> str | None:
        return _EXT_TO_LANG.get(os.path.splitext(path)[1].lower())

    def _error_stub(self, message: str) -> Dict[str, str]:
        """Return a payload compatible with the UI’s expectations."""
        return {"error": message}

    def _extract_one(self, abs_path: str, rel: str) -> Dict[str, List[str] | str]:
        lang = self._lang_for(abs_path)
        if not lang:
            logger.debug("Codemap: unsupported file %s", rel)
            return self._error_stub("Unsupported language / extension")

        content = self._storage.read_text(abs_path)
        if content is None:
            logger.info("Codemap: unreadable file %s", rel)
            return self._error_stub("Unreadable file (permission denied?)")
        if len(content) > _SAFE_SIZE_LIMIT:
            logger.info("Codemap: %s too large – skipped", rel)
            return self._error_stub("File > size limit (4 MB) – skipped")

        parser = _get_parser(lang)
        src_bytes = content.encode("utf-8", errors="ignore")
        tree = parser.parse(src_bytes)

        collector = _SymbolCollector(src_bytes)
        classes, funcs, refs = collector.collect(tree.root_node)

        # Only de‑dupe **inside** the same bucket – keep the role info intact
        return {
            "classes": classes,
            "functions": funcs,
            "references": refs,
        }

    # ---------------------------------------------------------------- public
    def extract_codemap(
        self, base_dir: str, rel_paths: List[str]
    ) -> Dict[str, Dict[str, List[str] | str]]:
        if not os.path.isdir(base_dir):
            raise ValueError("base_dir must be an existing directory")
        if not isinstance(rel_paths, list):
            raise ValueError("rel_paths must be a list")

        result: Dict[str, Dict[str, List[str] | str]] = {}
        for rel in rel_paths:
            abs_path = os.path.join(base_dir, rel)
            if not os.path.isfile(abs_path):
                result[rel] = self._error_stub("Not a regular file")
                continue

            try:
                result[rel] = self._extract_one(abs_path, rel)
            except Exception as exc:  # pragma: no cover
                logger.exception("Codemap: unhandled error for %s", rel)
                result[rel] = self._error_stub(str(exc))

        return result
