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

from services.service_exceptions import wrap_service_methods
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

# C++ specific noise tokens (common types and keywords that aren't useful as references)
_CPP_NOISE = {
    "int", "char", "float", "double", "bool", "void", "long", "short", "unsigned", "signed",
    "const", "static", "inline", "extern", "auto", "register", "volatile", "mutable",
    "std", "string", "vector", "map", "set", "list", "deque", "stack", "queue", "pair",
    "shared_ptr", "unique_ptr", "weak_ptr", "nullptr", "true", "false",
    "cout", "cin", "endl", "cerr", "clog", "printf", "scanf", "malloc", "free",
    "size_t", "ptrdiff_t", "wchar_t", "char16_t", "char32_t",
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

@wrap_service_methods
class _SymbolCollector:
    """
    Depth-first walker that translates tree-sitter nodes → symbol buckets.
    Enhanced with dependency extraction for imports/exports.
    """

    CLASS_NODES = {
        "class_declaration", "class_definition",           # JS / TS / Py
        "class_specifier", "struct_specifier",             # C++
        "union_specifier", "enum_specifier",               # C++ unions and enums
        "namespace_definition",                            # C++ namespaces
    }

    FUNC_NODES = {
        "function_declaration", "function_definition",     # JS / TS / Py / C / C++
        "method_definition",                               # JS / TS
        "function_declarator",                             # C / C++ – captures name
        "constructor_declaration", "destructor_declaration", # C++ constructors/destructors
        "operator_declaration",                            # C++ operator overloads
        "template_declaration",                            # C++ templates
    }

    # Import/Export nodes for dependency analysis
    IMPORT_NODES = {
        "import_statement", "import_from_statement",       # Python
        "import_declaration", "import_statement",          # JS/TS
        "include_directive",                               # C/C++
    }

    EXPORT_NODES = {
        "export_statement", "export_declaration",          # JS/TS
        "export_default_declaration",                      # JS/TS
    }

    def __init__(self, source: bytes) -> None:
        self._src = source
        self.classes: List[str] = []
        self.funcs: List[str] = []
        self.refs_raw: List[str] = []
        self.imports: List[Dict[str, str]] = []  # [{module, symbols, type}]
        self.exports: List[Dict[str, str]] = []  # [{symbols, type}]

    # ---------------------------------------------------------- walk
    def collect(self, node: Node) -> Tuple[List[str], List[str], List[str], List[Dict[str, str]], List[Dict[str, str]]]:
        self._walk(node)

        # ① de-dupe classes / funcs immediately
        classes = _dedupe_preserve_order(self.classes)
        funcs   = _dedupe_preserve_order(self.funcs)

        # ② noise + frequency filter for refs
        freq: Dict[str, int] = {}
        for ident in self.refs_raw:
            ident_low = ident.lower()
            
            # Enhanced filtering for C++ and other languages
            if (
                len(ident) < 2  # Allow 2-char identifiers for C++ (like "id", "x", "y")
                or ident_low in _COMMON_RESERVED
                or ident_low in _COMMON_NOISE
                or ident_low in _CPP_NOISE
                or ident.isdigit()  # Skip pure numbers
                or ident.startswith('_') and len(ident) < 4  # Skip short private identifiers
            ):
                continue
            
            # Special handling for C++ constructs
            if ident.startswith(('using ', 'typedef ', '#define ')):
                # Always include these important C++ constructs
                freq[ident] = freq.get(ident, 0) + 2  # Give them higher weight
            else:
                freq[ident] = freq.get(ident, 0) + 1

        # Enhanced filtering: keep identifiers that appear ≥2× or important single occurrences
        TOP_K = 20  # Increased for C++ which has more symbols
        filtered = sorted(freq.items(), key=lambda t: (-t[1], t[0]))
        
        # Include high-frequency items and important single occurrences
        refs = []
        for name, cnt in filtered:
            if (cnt > 1 or 
                name.startswith(('using ', 'typedef ', '#define ', 'template<>', 'namespace ', 'struct ', 'enum ')) or
                (len(name) > 6 and cnt == 1)):  # Include longer unique identifiers
                refs.append(name)
        
        refs = refs[:TOP_K]
        refs = _dedupe_preserve_order(refs)

        return classes, funcs, refs, self.imports, self.exports

    # ---------------------------------------------------------- DFS
    def _walk(self, node: Node) -> None:
        typ = node.type

        # — classes, structs, unions, enums, namespaces
        if typ in self.CLASS_NODES:
            name = node.child_by_field_name("name")
            if name:
                class_name = self._text(name)
                # Add type prefix for C++ constructs
                if typ == "struct_specifier":
                    class_name = f"struct {class_name}"
                elif typ == "union_specifier":
                    class_name = f"union {class_name}"
                elif typ == "enum_specifier":
                    class_name = f"enum {class_name}"
                elif typ == "namespace_definition":
                    class_name = f"namespace {class_name}"
                self.classes.append(class_name)

        # — functions, methods, constructors, destructors, operators
        elif typ in self.FUNC_NODES:
            name = node.child_by_field_name("name")
            if name:
                func_name = self._text(name)
                # Handle C++ specific function types
                if typ == "constructor_declaration":
                    func_name = f"{func_name}()" # Constructor
                elif typ == "destructor_declaration":
                    func_name = f"~{func_name}()" # Destructor
                elif typ == "operator_declaration":
                    func_name = f"operator{func_name}" # Operator overload
                elif typ == "template_declaration":
                    # For templates, try to get the actual function name
                    for child in node.children:
                        if child.type in self.FUNC_NODES:
                            template_name = child.child_by_field_name("name")
                            if template_name:
                                func_name = f"template<> {self._text(template_name)}"
                                break
                self.funcs.append(func_name)
            elif typ == "template_declaration":
                # Handle template without explicit name
                self.funcs.append("template<>")

        # — C++ function definitions (more complex parsing)
        elif typ == "function_definition":
            # Try to extract function signature for C++
            declarator = None
            for child in node.children:
                if child.type == "function_declarator":
                    declarator = child
                    break
            
            if declarator:
                name_node = declarator.child_by_field_name("declarator")
                if name_node and name_node.type == "identifier":
                    func_name = self._text(name_node)
                    # Try to get parameters for better signature
                    params_node = declarator.child_by_field_name("parameters")
                    if params_node:
                        params_text = self._text(params_node)
                        func_name = f"{func_name}{params_text}"
                    self.funcs.append(func_name)

        # var foo = () => {} (JavaScript)
        elif typ == "variable_declarator" and any(
            c.type == "arrow_function" for c in node.children
        ):
            nm = node.child_by_field_name("name")
            if nm:
                self.funcs.append(self._text(nm))

        # — imports
        elif typ in self.IMPORT_NODES:
            import_info = self._extract_import(node)
            if import_info:
                self.imports.append(import_info)

        # — exports
        elif typ in self.EXPORT_NODES:
            export_info = self._extract_export(node)
            if export_info:
                self.exports.append(export_info)

        # — C++ specific constructs
        elif typ == "using_declaration":
            # using std::vector;
            for child in node.children:
                if child.type == "qualified_identifier":
                    using_name = self._text(child)
                    self.refs_raw.append(f"using {using_name}")
        
        elif typ == "typedef_declaration":
            # typedef int MyInt;
            name_node = node.child_by_field_name("declarator")
            if name_node:
                typedef_name = self._text(name_node)
                self.refs_raw.append(f"typedef {typedef_name}")
        
        elif typ == "type_alias_declaration":
            # using MyType = int;
            name_node = node.child_by_field_name("name")
            if name_node:
                alias_name = self._text(name_node)
                self.refs_raw.append(f"using {alias_name}")
        
        elif typ == "macro_definition":
            # #define MACRO_NAME
            name_node = node.child_by_field_name("name")
            if name_node:
                macro_name = self._text(name_node)
                self.refs_raw.append(f"#define {macro_name}")

        # — identifiers (potential refs)
        elif typ == "identifier":
            ident = self._text(node)
            if _IDENTIFIER_RE.fullmatch(ident):
                self.refs_raw.append(ident)
        
        # — C++ type identifiers
        elif typ == "type_identifier":
            type_ident = self._text(node)
            if _IDENTIFIER_RE.fullmatch(type_ident):
                self.refs_raw.append(type_ident)
        
        # — C++ primitive types
        elif typ == "primitive_type":
            prim_type = self._text(node)
            self.refs_raw.append(prim_type)

        for child in node.children:
            self._walk(child)

    # ---------------------------------------------------------- dependency extraction
    def _extract_import(self, node: Node) -> Optional[Dict[str, str]]:
        """Extract import information from import nodes."""
        typ = node.type
        text = self._text(node).strip()
        
        if typ == "import_statement":  # Python: import module
            # import os, sys
            modules = []
            for child in node.children:
                if child.type == "dotted_name" or child.type == "identifier":
                    modules.append(self._text(child))
            if modules:
                return {
                    "module": ", ".join(modules),
                    "symbols": "*",
                    "type": "import",
                    "raw": text
                }
                
        elif typ == "import_from_statement":  # Python: from module import symbol
            # from os import path
            module = ""
            symbols = []
            for child in node.children:
                if child.type == "dotted_name" and not module:
                    module = self._text(child)
                elif child.type == "import_list":
                    for item in child.children:
                        if item.type == "identifier":
                            symbols.append(self._text(item))
            if module:
                return {
                    "module": module,
                    "symbols": ", ".join(symbols) if symbols else "*",
                    "type": "from_import",
                    "raw": text
                }
                
        elif typ == "import_declaration":  # JS/TS: import { symbol } from 'module'
            module = ""
            symbols = []
            for child in node.children:
                if child.type == "string":
                    module = self._text(child).strip('\'"')
                elif child.type == "import_clause":
                    for item in child.children:
                        if item.type == "named_imports":
                            for spec in item.children:
                                if spec.type == "import_specifier":
                                    name_node = spec.child_by_field_name("name")
                                    if name_node:
                                        symbols.append(self._text(name_node))
                        elif item.type == "identifier":
                            symbols.append(self._text(item))
            if module:
                return {
                    "module": module,
                    "symbols": ", ".join(symbols) if symbols else "default",
                    "type": "es_import",
                    "raw": text
                }
                
        elif typ == "include_directive":  # C/C++: #include <header>
            header = ""
            include_type = "system"
            
            for child in node.children:
                if child.type == "string":
                    # #include "local_header.h"
                    header = self._text(child).strip('"')
                    include_type = "local"
                elif child.type == "system_lib_string":
                    # #include <system_header>
                    header = self._text(child).strip('<>')
                    include_type = "system"
                elif child.type == "identifier":
                    # Handle macro includes like #include MACRO_NAME
                    header = self._text(child)
                    include_type = "macro"
            
            if header:
                return {
                    "module": header,
                    "symbols": "*",
                    "type": f"include_{include_type}",
                    "raw": text
                }
        
        return None

    def _extract_export(self, node: Node) -> Optional[Dict[str, str]]:
        """Extract export information from export nodes."""
        typ = node.type
        text = self._text(node).strip()
        
        if typ == "export_declaration":  # JS/TS: export { symbol }
            symbols = []
            for child in node.children:
                if child.type == "export_clause":
                    for item in child.children:
                        if item.type == "export_specifier":
                            name_node = item.child_by_field_name("name")
                            if name_node:
                                symbols.append(self._text(name_node))
                elif child.type in self.FUNC_NODES or child.type in self.CLASS_NODES:
                    name_node = child.child_by_field_name("name")
                    if name_node:
                        symbols.append(self._text(name_node))
            return {
                "symbols": ", ".join(symbols) if symbols else "unknown",
                "type": "named_export",
                "raw": text
            }
            
        elif typ == "export_default_declaration":  # JS/TS: export default
            symbols = ["default"]
            for child in node.children:
                if child.type in self.FUNC_NODES or child.type in self.CLASS_NODES:
                    name_node = child.child_by_field_name("name")
                    if name_node:
                        symbols = [self._text(name_node)]
            return {
                "symbols": ", ".join(symbols),
                "type": "default_export",
                "raw": text
            }
        
        return None

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

@wrap_service_methods
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
            return {
                "classes": [], 
                "functions": [], 
                "references": heads[:10],
                "imports": [],
                "exports": []
            }

        parser = _get_parser(lang)
        src_bytes = content.encode("utf-8", errors="ignore")
        tree = parser.parse(src_bytes)

        collector = _SymbolCollector(src_bytes)
        classes, funcs, refs, imports, exports = collector.collect(tree.root_node)
        return {
            "classes": classes, 
            "functions": funcs, 
            "references": refs,
            "imports": imports,
            "exports": exports
        }

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
