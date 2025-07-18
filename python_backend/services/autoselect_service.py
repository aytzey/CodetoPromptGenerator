"""
AutoselectService – now 3-stage (embeddings → heuristics → LLM)
"""
from __future__ import annotations

import json
import logging
import os
import pathlib
from typing import Any, Dict, List, Optional, Tuple, Union, Set
import re
import httpx
from functools import lru_cache 
from models.autoselect_request import AutoSelectRequest
from services.autoselect_heuristics import rank_candidates
from services.embeddings_service import EmbeddingsService
from services.service_exceptions import wrap_service_methods
from repositories.file_storage import FileStorageRepository
from services.codemap_service import CodemapService

logger = logging.getLogger(__name__)


class UpstreamError(RuntimeError): ...
class ConfigError(RuntimeError): ...


@wrap_service_methods
class AutoselectService:
    _URL = "https://openrouter.ai/api/v1/chat/completions"
    _MODEL = os.getenv("AUTOSELECT_MODEL", "meta-llama/llama-4-maverick:free")

    _SCHEMA: Dict[str, Any] = {
        "name": "smart_select_v2",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "selected": {"type": "array", "items": {"type": "string"}},
                "ask":      {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "number"},
            },
            "required": ["selected"],
            "additionalProperties": False,
        },
    }

    _SUMMARY_MAX_CHARS: int = 20_000          # ← ADD (used by _cheap_summary)
    _TOKEN_HARD_LIMIT: int = 750_000
    _TREE_MAX_LINES: int = 50_000
    def __init__(self) -> None:
            self.api_key = os.getenv("OPENROUTER_API_KEY")
            if not self.api_key:
                raise ConfigError("OPENROUTER_API_KEY is not set")
            self._storage = FileStorageRepository()
            self._codemap = CodemapService(storage_repo=self._storage)
            self._debug_map: Dict[str, Dict[str, Any]] = {}   # ← add

    # ───────────────────────────────────────── public API ────────────────────
    def autoselect_paths(
        self,
        req: AutoSelectRequest,
        *,
        timeout: float = 25.0,
        clarifications: Optional[Dict[str, str]] = None,
    ) -> Tuple[List[str], Dict[str, Any]]:
        """
        Main entry; returns (selected_paths, raw_json_reply).
        """
        emb_svc = EmbeddingsService(req.baseDir)
        if not emb_svc._paths:        # cold index build
            # Build comprehensive summaries for embedding
            summaries = {}
            for rel in req.treePaths:
                abs_path = os.path.join(req.baseDir, rel)
                
                # Get both simple summary and codemap data
                simple_summary = self._file_summary(abs_path, rel)
                
                # Try to get richer context from codemap
                try:
                    codemap = self._codemap.extract_codemap(
                        os.path.dirname(abs_path), [os.path.basename(abs_path)]
                    )
                    codemap_info = codemap.get(os.path.basename(abs_path), {})
                    
                    # Build enriched summary combining path, codemap data, and content summary
                    parts = [rel]  # Include path for context
                    if codemap_info.get("classes"):
                        parts.append(f"classes: {' '.join(codemap_info['classes'])}")
                    if codemap_info.get("functions"):
                        parts.append(f"functions: {' '.join(codemap_info['functions'])}")
                    if codemap_info.get("references"):
                        parts.append(f"refs: {' '.join(codemap_info['references'][:20])}")
                    parts.append(simple_summary)
                    
                    summaries[rel] = " ".join(parts)
                except:
                    # Fallback to simple summary
                    summaries[rel] = f"{rel} {simple_summary}"
                    
            emb_svc.index(summaries)

        lang_pref = (
            {f".{l.lower()}" for l in req.languages or []}
            or {".py", ".cpp", ".cc", ".hpp", ".ts", ".tsx", ".js", ".jsx"}
        )

        # Stage 0+1  → shortlist ≤ 120
        shortlist = rank_candidates(
            req.baseDir,
            req.treePaths,
            req.instructions,
            self._file_summary,
            embedding_svc=emb_svc,
            lang_bias=lang_pref,
            keep_top=120,
        )

        # Stage 2  → LLM
        prompt = self._build_prompt(req, shortlist, clarifications)
        llm_json = self._call_openrouter(prompt, timeout)
        selected = self._massage(llm_json.get("selected", []), shortlist)
        conf = float(llm_json.get("confidence", 0.0))

        # auto question if low-confidence and not already in clarify mode
        if conf < 0.95 and clarifications is None:
            questions = llm_json.get("ask", [])
            return selected, {"selected": selected, "ask": questions, "confidence": conf}

        return selected, {"selected": selected, "confidence": conf}

    # ───────────────────────────────────── prompt helpers ────────────────────

    def _build_prompt(
        self,
        req: AutoSelectRequest,
        shortlist: List[str],
        clarifications: Optional[Dict[str, str]],
    ) -> str:
        clar_block = ""
        if clarifications:
            pretty = json.dumps(clarifications, ensure_ascii=False, indent=2)
            clar_block = f"### Clarifications\n{pretty}\n\n"

        # Build comprehensive RAG context with code summaries
        summaries_block = self._build_summaries_block(req, shortlist[:30])  # Top 30 files
        
        # Build code snippets from top semantic matches
        code_block = self._build_code_snippets_block(req, shortlist[:10])  # Top 10 files

        return (
            "You are a code-aware assistant analyzing a software project.\n"
            "Select the *minimal* set of candidate files that fully covers the user's task.\n"
            "Use the provided code summaries and snippets to make an informed decision.\n"
            "If you need more info respond with {\"ask\":[...]}. "
            "Respond ONLY with valid JSON matching the schema.\n\n"
            f"### Task\n{req.instructions}\n\n"
            f"{clar_block}"
            f"### Code Intelligence (RAG Context)\n\n"
            f"{summaries_block}\n\n"
            f"{code_block}\n\n"
            "### All Candidate Files\n"
            + "\n".join(f"• {p}" for p in shortlist)
        )
    
    def _call_openrouter(self, content: str, timeout: float) -> Dict[str, Any]:
        """
        Send prompt → return parsed JSON object (never a raw str).

        OpenRouter **always** wraps the LLM output as a *string* in
        `choices[0].message.content` even when we request
        `response_format = json_schema`.  This helper now handles both:
          • already-parsed dict  (future-proof)
          • JSON string          (current behaviour, needs json.loads)
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._MODEL,
            "temperature": 0,
            "max_tokens": 800,
            "messages": [
                {"role": "system", "content": "You are a strict JSON generator."},
                {"role": "user", "content": content},
            ],
            "response_format": {"type": "json_schema", "json_schema": self._SCHEMA},
            "structured_outputs": True,
        }
        with httpx.Client(timeout=timeout) as client:
            rsp = client.post(self._URL, json=payload, headers=headers)
        if rsp.status_code != 200:
            raise UpstreamError(f"OpenRouter HTTP {rsp.status_code}")

        raw = rsp.json()["choices"][0]["message"]["content"]

        if isinstance(raw, dict):          # rare but future-compatible
            return raw
        if isinstance(raw, str):
            try:
                return json.loads(raw)
            except json.JSONDecodeError as exc:
                logger.error("Malformed JSON from OpenRouter: %.200s", raw)
                raise UpstreamError("Upstream returned invalid JSON") from exc

        raise UpstreamError("Unexpected upstream payload type")

    def _build_summaries_block(self, req: AutoSelectRequest, top_files: List[str]) -> str:
        """Build a block of file summaries with extracted symbols."""
        if not top_files:
            return "No file summaries available."
        
        summaries = []
        for rel_path in top_files:
            abs_path = os.path.join(req.baseDir, rel_path)
            if not os.path.isfile(abs_path):
                continue
                
            # Get codemap info from debug map or extract fresh
            codemap_info = self._debug_map.get(rel_path)
            if not codemap_info or "error" in codemap_info:
                try:
                    codemap = self._codemap.extract_codemap(
                        os.path.dirname(abs_path), [os.path.basename(abs_path)]
                    )
                    codemap_info = codemap.get(os.path.basename(abs_path), {})
                except:
                    codemap_info = {}
            
            # Build structured summary
            parts = [f"**{rel_path}**"]
            
            if codemap_info.get("classes"):
                parts.append(f"  Classes: {', '.join(codemap_info['classes'][:10])}")
            if codemap_info.get("functions"):
                parts.append(f"  Functions: {', '.join(codemap_info['functions'][:10])}")
            if codemap_info.get("references"):
                parts.append(f"  Key refs: {', '.join(codemap_info['references'][:10])}")
                
            if len(parts) > 1:  # Has content beyond just the path
                summaries.append("\n".join(parts))
        
        return "#### File Summaries\n" + "\n\n".join(summaries[:20])  # Limit to 20

    def _build_code_snippets_block(self, req: AutoSelectRequest, top_files: List[str]) -> str:
        """Build code snippets from most relevant files."""
        if not top_files:
            return "No code snippets available."
            
        snippets = []
        total_chars = 0
        MAX_SNIPPET_CHARS = 50000  # Limit total snippet size
        
        for rel_path in top_files:
            if total_chars > MAX_SNIPPET_CHARS:
                break
                
            abs_path = os.path.join(req.baseDir, rel_path)
            if not os.path.isfile(abs_path):
                continue
                
            try:
                content = self._storage.read_text(abs_path)
                if not content:
                    continue
                    
                # Extract first 1000 chars or important sections
                snippet = self._extract_key_sections(content, rel_path)
                if snippet:
                    lang = pathlib.Path(rel_path).suffix.lstrip('.') or 'txt'
                    snippets.append(f"**{rel_path}**\n```{lang}\n{snippet}\n```")
                    total_chars += len(snippet)
            except:
                continue
                
        return "#### Code Snippets\n" + "\n\n".join(snippets)
    
    def _extract_key_sections(self, content: str, rel_path: str = "") -> str:
        """Extract key sections from file content."""
        lines = content.splitlines()
        if len(lines) <= 30:
            return content[:1500]  # Small file, return most of it
            
        # For larger files, try to extract imports and key definitions
        key_lines = []
        
        # Get imports/includes (first 20 lines usually)
        for i, line in enumerate(lines[:20]):
            if any(kw in line for kw in ['import', 'from', '#include', 'require', 'use']):
                key_lines.append(line)
                
        # Look for class/function definitions
        for i, line in enumerate(lines):
            if any(kw in line for kw in ['class ', 'def ', 'function ', 'const ', 'export ']):
                # Include the definition line and next few lines
                key_lines.extend(lines[i:i+5])
                if len(key_lines) > 30:
                    break
                    
        if key_lines:
            return '\n'.join(key_lines[:40])
        else:
            # Fallback to first N chars
            return content[:1500]

    # ---------- textual tree -------------------------------------------------
    def _tree_text(self, paths: List[str]) -> str:
        """
        Convert a flat list of ``foo/bar/baz.py`` into an indented bullet list.

        Keeps the token footprint tiny (no Unicode folder icons to the model).
        """
        out: List[str] = []
        for rel in paths[: self._TREE_MAX_LINES]:
            depth = rel.count("/")
            out.append("  " * depth + "• " + rel.rsplit("/", 1)[-1])
        if len(paths) > self._TREE_MAX_LINES:
            out.append(f"… (+{len(paths) - self._TREE_MAX_LINES} more)")
        return "\n".join(out)

    # ---------- graph block (unchanged except for lowered try/except) -------
    def _build_graph(self, req: AutoSelectRequest, only: List[str]) -> str:
        if not req.baseDir or not os.path.isdir(req.baseDir):
            return ""

        blocks: List[str] = []
        used_tokens: int = 0

        for rel in only:
            abs_path: str = os.path.normpath(os.path.join(req.baseDir, rel))
            if not os.path.isfile(abs_path):
                continue

            summary: str = self._file_summary(abs_path, rel)
            est_tokens: int = len(summary) // 4
            if used_tokens + est_tokens > self._TOKEN_HARD_LIMIT:
                break

            lang: str = pathlib.Path(abs_path).suffix.lstrip(".") or "txt"
            blocks.append(
                f'<file path="{rel}" lang="{lang}">\n'
                f"```{lang}\n{summary}\n```\n</file>"
            )
            used_tokens += est_tokens

        return "\n\n".join(blocks)

    # ---------- file summary -------------------------------------------------
    @lru_cache(maxsize=2048)
    def _file_summary(self, abs_path: str, rel_path: str) -> str:
        """
        Try codemap extraction first; fall back to a cheap regex summary.
        Always *cache* raw codemap info in ``self._debug_map`` for debugging.
        """
        data: Optional[Dict[str, Union[List[str], str]]] = None
        try:
            # extract_codemap → { basename: CodemapInfo | {"error": …} }
            codemap = self._codemap.extract_codemap(
                os.path.dirname(abs_path), [os.path.basename(abs_path)]
            )
            data = codemap.get(os.path.basename(abs_path))
        except Exception as exc:
            logger.warning("Codemap extraction failed for %s: %s", rel_path, exc)
            data = {"error": "Extraction failed"}

        # Always store for optional debug
        self._debug_map[rel_path] = data or {"error": "no-data"}

        # Build a one-liner summary if we have structured info
        if data and "error" not in data:
            parts: List[str] = []

            cls = data.get("classes")
            if isinstance(cls, list) and cls:
                parts.append(f"Classes: {', '.join(cls[:10])}")

            fns = data.get("functions")
            if isinstance(fns, list) and fns:
                parts.append(f"Functions: {', '.join(fns[:15])}")

            refs = data.get("references")
            if isinstance(refs, list) and refs:
                parts.append(f"Refs: {', '.join(refs[:20])}")

            if parts:
                s = "; ".join(parts)
                return s[: self._SUMMARY_MAX_CHARS] if len(s) > self._SUMMARY_MAX_CHARS else s

        # Fallback – cheap regex headlines
        return self._cheap_summary(self._storage.read_text(abs_path) or "")

    def _cheap_summary(self, text: str, max_len: int = _SUMMARY_MAX_CHARS) -> str:
        if not text:
            return ""
        header_re = re.compile(
            r"""
            ^\s*
            (?:class|struct|enum|namespace|def|function|fn|sub |procedure|
               public |private |protected |static )[\s\w:<>,.*&()]+
            |
            ^\s*[\w:<>]+\s+[\w:]+::[\w:]+\s*\(
            |
            ^\s*[\w:<>]+\s+[\w:]+\s*\(
            """,
            re.M | re.I | re.VERBOSE,
        )
        headers = header_re.findall(text)[:50]
        if headers:
            summary = " / ".join(h.strip() for h in headers)
            return summary[:max_len] if len(summary) > max_len else summary

        lines = [ln.strip() for ln in text.splitlines() if ln.strip()][:10]
        summary = " ".join(lines)
        summary = re.sub(r"\s+", " ", summary)
        return summary[: max_len - 1] + "…" if len(summary) > max_len else summary

    # ───────────────────────────── json / path utils (same as before) ───────
    _FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]+?)\s*```", re.I)

    def _extract_json(self, text: str) -> Optional[Any]:
        cleaned = text.strip()
        m = self._FENCE_RE.search(cleaned)
        if m:
            cleaned = m.group(1).strip()

        start_array = cleaned.find("[")
        start_obj = cleaned.find("{")
        start = start_array if start_array != -1 else start_obj
        if start_obj != -1 and (start_array == -1 or start_obj < start_array):
            start = start_obj
        if start == -1:
            return None

        cleaned = cleaned[start:]
        try:
            return json.loads(cleaned)
        except Exception:
            return None

    # ---------- normalisation / fuzzy matching (unchanged) ------------------
    @staticmethod
    def _norm(path: str) -> str:
        return pathlib.PurePosixPath(path.lstrip("./\\")).as_posix()

    def _normalise_parsed(self, parsed: Any, allowed: List[str]) -> List[str]:
        if isinstance(parsed, list):
            candidate = parsed
        elif isinstance(parsed, dict):
            for key in ("selected", "paths", "files"):
                val = parsed.get(key)
                if isinstance(val, list):
                    candidate = val
                    break
            else:
                candidate = list(parsed)
        else:
            candidate = []

        return self._massage(candidate, allowed)

    def _massage(self, items: List[str], allowed: List[str]) -> List[str]:
        allow_norm = [self._norm(a) for a in allowed]
        allow_exact = {p.lower(): orig for p, orig in zip(allow_norm, allowed)}

        basename_map: Dict[str, List[str]] = {}
        suffix_map: Dict[str, List[str]] = {}

        for norm, orig in zip(allow_norm, allowed):
            pp = pathlib.PurePosixPath(norm)
            if pp.suffix or "." in pp.name:
                basename_map.setdefault(pp.name.lower(), []).append(orig)

            segs = norm.split("/")
            for i in range(1, min(4, len(segs) + 1)):
                suffix = "/".join(segs[-i:]).lower()
                suffix_map.setdefault(suffix, []).append(orig)

        chosen: List[str] = []
        seen: Set[str] = set()

        for raw in items:
            if not isinstance(raw, str):
                continue
            cand_norm = self._norm(raw.strip().rstrip(",;")).lower()
            resolved: Optional[str] = None

            if cand_norm in allow_exact:
                resolved = allow_exact[cand_norm]
            if resolved is None:
                pp_cand = pathlib.PurePosixPath(cand_norm)
                if pp_cand.suffix or "." in pp_cand.name:
                    matches = basename_map.get(pp_cand.name.lower(), [])
                    if len(matches) == 1:
                        resolved = matches[0]
            if resolved is None:
                matches = suffix_map.get(cand_norm, [])
                if len(matches) == 1:
                    resolved = matches[0]

            if resolved and resolved not in seen:
                seen.add(resolved)
                chosen.append(resolved)

        return chosen

    # ---------- legacy line parser (unchanged) ------------------------------
    def _strip_fmt(self, line: str) -> str:
        line = line.strip().lstrip("-*•`").rstrip("`")
        return line.rstrip(",;[] ").strip('"\'')

    def _legacy_parse(self, raw: str, allowed: List[str]) -> List[str]:
        lines = [self._strip_fmt(l) for l in raw.splitlines() if l.strip()]
        return self._massage(lines, allowed)
