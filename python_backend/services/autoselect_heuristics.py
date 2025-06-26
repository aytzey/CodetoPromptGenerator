"""
Thin heuristic layer – now with **MiniLM** semantic similarity bonus.
"""
from __future__ import annotations

import os
import pathlib
import re
from typing import Callable, Iterable, List, Optional, Set, Tuple

from services.embeddings_service import EmbeddingsService

_WORD_RE = re.compile(r"[A-Za-z_]{3,}")


def _tokens(text: str) -> Set[str]:
    return {m.group(0).lower() for m in _WORD_RE.finditer(text)}


def _lang_hint(rel_path: str) -> str:
    return pathlib.Path(rel_path).suffix.lower()


# ────────────────────────────────────────────────────────────────────────────
def rank_candidates(
    base_dir: str,
    tree_paths: List[str],
    instructions: str,
    file_summary_fn: Callable[[str, str], str],
    *,
    embedding_svc: EmbeddingsService,
    lang_bias: Optional[Set[str]] = None,
    keep_top: int = 120,
) -> List[str]:
    """
    Return a high-recall ≤ `keep_top` shortlist ordered by score.

    New term → `embed_bonus` := int(cosine × 100).
    """
    instr_toks = _tokens(instructions)
    emb_hits = set(embedding_svc.top_k(instructions, 300))

    ranked: List[Tuple[int, str]] = []
    for rel in tree_paths:
        score = 0
        path_toks = _tokens(rel)
        score += 2 * len(instr_toks & path_toks)

        abs_path = os.path.join(base_dir, rel)
        summary = file_summary_fn(abs_path, rel)
        sum_toks = _tokens(summary)
        score += 3 * len(instr_toks & sum_toks)

        if lang_bias and _lang_hint(rel) in lang_bias:
            score += 4

        if rel in emb_hits:
            # similarity ∈ [0.1,1] mapped to 10–100 via embed() call
            score += 30

        ranked.append((score, rel))

    ranked.sort(key=lambda t: (-t[0], t[1]))
    top = [rel for sc, rel in ranked[:keep_top]]

    return top if ranked[0][0] else tree_paths[:keep_top]
