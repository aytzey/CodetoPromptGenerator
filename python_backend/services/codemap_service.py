# python_backend/services/codemap_service.py
# ────────────────────────────────────────────────────────────────────────────
"""
CodemapService  •  Tree-sitter powered symbol extractor
=======================================================

Languages
---------
• Python                         • JavaScript / JSX
• TypeScript / TSX               • C / C++ (incl. headers)

What we extract
---------------
• class / struct names
• top-level + exported functions (incl. JS arrow functions)
• *distinct* identifiers (“references”) – **auto-filtered**

Enhancements (May 2025)
-----------------------
1.  **Noise filter** – drops React primitives, HTML tags, short names, etc.
2.  **Frequency filter** – keeps only identifiers that occur ≥ 2× or the top-K.
3.  **Binary / oversize guard** – skips > 4 MB or binary-like files safely.
4.  **TXT fallback** – handles `.md`, `.txt`, `.env`, so no “unsupported” spam.
5.  **Compact output** – references are de-duplicated & capped to ≤ 15 items.

All public APIs are unchanged – UI keeps working without modifications.
"""
from __future__ import annotations

import logging
import os
import re
from typing import Dict, List, Set, Tuple, Optional, Union

from tree_sitter import Node, Parser  # type: ignore
from tree_sitter_languages import get_parser

from repositories.file_storage import FileStorageRepository

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────────────
# 1 · Extension → language mapping
# ────────────────────────────────────────────────────────────────────────────
_EXT_TO_LANG: dict[str, str] = {
    # Core languages
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".c": "c",
    ".h": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".hh": "cpp",
    # Text-only fallbacks – analysed with cheap regex, not tree-sitter
    ".md": "txt",
    ".txt": "txt",
    ".env": "txt",
    ".json": "txt",
}

_PARSER_CACHE: dict[str, Parser] = {}


def _get_parser(lang: str) -> Parser:
    """Return (and cache) a tree-sitter parser for *lang*."""
    if lang not in _PARSER_CACHE:
        try:
            _PARSER_CACHE[lang] = get_parser(lang)
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(f"Tree-sitter parser for '{lang}' not found.") from exc
    return _PARSER_CACHE[lang]


# ────────────────────────────────────────────────────────────────────────────
# 2 · Reserved + noise keyword sets
# ────────────────────────────────────────────────────────────────────────────
_JS_TS_RESERVED = {
    "break", "case", "catch", "class", "const", "continue", "debugger", "default",
    "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
    "function", "if", "import", "in", "instanceof", "new", "null", "return", "super",
    "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
    "yield", "await", "let",
}
_PY_RESERVED = {
    "false", "none", "true", "and", "as", "assert", "async", "await", "break", "class",
    "continue", "def", "del", "elif", "else", "except", "finally", "for", "from",
    "global", "if", "import", "in", "is", "lambda", "match", "nonlocal", "not", "or",
    "pass", "raise", "return", "try", "while", "with", "yield",
}
_CPP_RESERVED = {
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

# Extra UI / framework noise tokens
_COMMON_NOISE = {
    "react", "props", "state", "onclick", "onchange", "button", "div", "span", "input",
    "class", "style", "children", "useeffect", "usestate", "usememo", "usetref",
    "console", "log",
}


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


def _is_binary_sample(chunk: bytes) -> bool:
    """Heuristic: if >30 % of the sample has zero / high-bit bytes treat as binary."""
    if not chunk:
        return False
    nontext = sum(1 for b in chunk if b < 9 or b > 126)
    return (nontext / len(chunk)) > 0.3


# ────────────────────────────────────────────────────────────────────────────
# 4 · Internal symbol collector
# ────────────────────────────────────────────────────────────────────────────
class _SymbolCollector:
    """
    Depth-first walker that translates tree-sitter nodes → symbol buckets.
    """

    CLASS_NODES = {
        "class_declaration", "class_definition",           # JS / TS / Py
        "class_specifier", "struct_specifier",             # C++
    }

    FUNC_NODES = {
        "function_declaration", "function_definition",     # JS / TS / Py / C / C++
        "method_definition",                               # JS / TS
        "function_declarator",                             # C / C++ – captures name
    }

    def __init__(self, source: bytes) -> None:
        self._src = source
        self.classes: List[str] = []
        self.funcs: List[str] = []
        self.refs_raw: List[str] = []

    # ---------------------------------------------------------- walk
    def collect(self, node: Node) -> Tuple[List[str], List[str], List[str]]:
        self._walk(node)

        # ① de-dupe classes / funcs immediately
        classes = _dedupe_preserve_order(self.classes)
        funcs   = _dedupe_preserve_order(self.funcs)

        # ② noise + frequency filter for refs
        freq: Dict[str, int] = {}
        for ident in self.refs_raw:
            ident_low = ident.lower()
            if (
                len(ident) < 3
                or ident_low in _COMMON_RESERVED
                or ident_low in _COMMON_NOISE
            ):
                continue
            freq[ident] = freq.get(ident, 0) + 1

        # keep identifiers that appear ≥2× or top-K
        TOP_K = 15
        filtered = sorted(freq.items(), key=lambda t: (-t[1], t[0]))
        refs = [name for name, cnt in filtered if cnt > 1][:TOP_K]
        refs = _dedupe_preserve_order(refs)

        return classes, funcs, refs

    # ---------------------------------------------------------- DFS
    def _walk(self, node: Node) -> None:
        typ = node.type

        # — classes
        if typ in self.CLASS_NODES:
            name = node.child_by_field_name("name")
            if name:
                self.classes.append(self._text(name))

        # — functions
        elif typ in self.FUNC_NODES:
            name = node.child_by_field_name("name")
            if name:
                self.funcs.append(self._text(name))

        # var foo = () => {}
        elif typ == "variable_declarator" and any(
            c.type == "arrow_function" for c in node.children
        ):
            nm = node.child_by_field_name("name")
            if nm:
                self.funcs.append(self._text(nm))

        # — identifiers (potential refs)
        elif typ == "identifier":
            ident = self._text(node)
            if _IDENTIFIER_RE.fullmatch(ident):
                self.refs_raw.append(ident)

        for child in node.children:
            self._walk(child)

    # ---------------------------------------------------------- utils
    def _text(self, node: Node) -> str:
        return self._src[node.start_byte : node.end_byte].decode(
            "utf-8", errors="ignore"
        )


# ────────────────────────────────────────────────────────────────────────────
# 5 · Public service
# ────────────────────────────────────────────────────────────────────────────
_SAFE_SIZE_LIMIT = int(os.getenv("CTP_CODEMAP_SIZE_LIMIT", "4000000"))  # 4 MB
_BINARY_SAMPLE_BYTES = 2048


class CodemapService:
    """High-level API used by *codemap_controller*."""

    __slots__ = ("_storage",)

    def __init__(self, storage_repo: FileStorageRepository) -> None:
        self._storage = storage_repo

    # ---------------------------------------------------------------- helpers
    @staticmethod
    def _lang_for(path: str) -> Optional[str]:
        return _EXT_TO_LANG.get(os.path.splitext(path)[1].lower())

    def _error_stub(self, message: str) -> Dict[str, str]:
        return {"error": message}

    def _extract_one(self, abs_path: str, rel: str) -> Dict[str, Union[List[str], str]]:
        lang = self._lang_for(abs_path)
        if not lang:
            # Unsupported *and* no txt fallback – silently ignore
            return self._error_stub("ignored")

        # --- fast binary / size guard ---------------------------------------
        try:
            raw = self._storage.read_bytes(abs_path, _BINARY_SAMPLE_BYTES)
        except Exception:
            raw = b""
        if _is_binary_sample(raw):
            logger.info("Codemap: %s looks binary – skipped", rel)
            return self._error_stub("Binary file – skipped")

        size = os.path.getsize(abs_path)
        if size > _SAFE_SIZE_LIMIT:
            logger.info("Codemap: %s too large – skipped", rel)
            return self._error_stub("File > size limit (4 MB) – skipped")

        # --- read full text if passed guards --------------------------------
        content = self._storage.read_text(abs_path)
        if content is None:
            return self._error_stub("Unreadable file")

        if lang == "txt":
            # quick regex fallback – grab headings & code fences
            heads = re.findall(r"^#+\s*(.+)$", content, flags=re.M)
            return {"classes": [], "functions": [], "references": heads[:10]}

        parser = _get_parser(lang)
        src_bytes = content.encode("utf-8", errors="ignore")
        tree = parser.parse(src_bytes)

        collector = _SymbolCollector(src_bytes)
        classes, funcs, refs = collector.collect(tree.root_node)
        return {"classes": classes, "functions": funcs, "references": refs}

    # ---------------------------------------------------------------- public
    def extract_codemap(
        self, base_dir: str, rel_paths: List[str]
    ) -> Dict[str, Dict[str, Union[List[str], str]]]:
        if not os.path.isdir(base_dir):
            raise ValueError("base_dir must be an existing directory")
        if not isinstance(rel_paths, list):
            raise ValueError("rel_paths must be a list")

        result: Dict[str, Dict[str, Union[List[str], str]]] = {}
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
