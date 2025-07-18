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
    
    Enhanced scoring with better semantic weighting.
    """
    instr_toks = _tokens(instructions)
    
    # Get more semantic matches and track their scores
    emb_results = embedding_svc.top_k(instructions, min(500, len(tree_paths)))
    emb_scores = {path: idx for idx, path in enumerate(reversed(emb_results))}  # Higher idx = better match

    ranked: List[Tuple[float, str]] = []
    for rel in tree_paths:
        score = 0.0
        
        # Path token matching (basic keyword match)
        path_toks = _tokens(rel)
        score += 2 * len(instr_toks & path_toks)

        # Summary token matching (function/class names)
        abs_path = os.path.join(base_dir, rel)
        summary = file_summary_fn(abs_path, rel)
        sum_toks = _tokens(summary)
        score += 3 * len(instr_toks & sum_toks)

        # Language preference
        if lang_bias and _lang_hint(rel) in lang_bias:
            score += 4

        # Semantic similarity score (much higher weight)
        if rel in emb_scores:
            # Normalize embedding rank to 0-100 scale
            emb_rank = emb_scores[rel]
            max_rank = len(emb_results)
            semantic_score = (emb_rank / max_rank) * 100
            score += semantic_score  # Now properly weighted 0-100
            
        # Boost for exact keyword matches in path
        for tok in instr_toks:
            if len(tok) > 4 and tok in rel.lower():
                score += 10

        ranked.append((score, rel))

    ranked.sort(key=lambda t: (-t[0], t[1]))
    top = [rel for sc, rel in ranked[:keep_top]]

    # Handle empty tree_paths
    if not ranked:
        return []
    
    return top if ranked[0][0] > 0 else tree_paths[:keep_top]
