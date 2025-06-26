"""
embeddings_service.py
─────────────────────
Tiny wrapper around **sentence-transformers** + **faiss** that keeps a
per-project vector index of code-map summaries (≈ 384-D MiniLM).

Public API
──────────
    EmbeddingsService(base_dir)
        .index(path→summary)      # bulk (re)index
        .update(path, summary)    # single-file update
        .top_k(query, k) -> list[rel_path]
        .embed(text) -> np.ndarray[384]
"""
from __future__ import annotations

import os
import threading
from typing import Dict, List

import faiss                   # type: ignore
import numpy as np
from sentence_transformers import SentenceTransformer

_LOCK = threading.RLock()
_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


class EmbeddingsService:
    """Thread-safe singleton per *base_dir*."""

    _instances: Dict[str, "EmbeddingsService"] = {}

    # -- factory -----------------------------------------------------------
    def __new__(cls, base_dir: str):
        base_dir = os.path.abspath(base_dir)
        with _LOCK:
            inst = cls._instances.get(base_dir)
            if inst is None:
                inst = super().__new__(cls)
                cls._instances[base_dir] = inst
        return inst

    # -- init (runs once per base_dir) -------------------------------------
    def __init__(self, base_dir: str) -> None:
        if hasattr(self, "_ready"):     # already initialised
            return
        self._ready = False
        self.base_dir = os.path.abspath(base_dir)
        self._model = SentenceTransformer(_MODEL_NAME)
        self._dim = self._model.get_sentence_embedding_dimension()
        self._index = faiss.IndexFlatIP(self._dim)          # cosine sim (dot on unit vecs)
        self._paths: List[str] = []                         # index-to-path map
        self._ready = True

    # -- helpers -----------------------------------------------------------
    def embed(self, text: str) -> np.ndarray:
        vec = self._model.encode([text], normalize_embeddings=True)
        return vec.astype("float32")                        # faiss wants f32

    # -- public API --------------------------------------------------------
    def index(self, path_to_summary: Dict[str, str]) -> None:
        """(Re)build the entire index from scratch."""
        if not path_to_summary:
            return
        with _LOCK:
            self._index.reset()
            self._paths = []
            vecs: List[np.ndarray] = []
            for path, summary in path_to_summary.items():
                vecs.append(self.embed(summary))
                self._paths.append(path)
            self._index.add(np.vstack(vecs))

    def update(self, path: str, summary: str) -> None:
        """Replace or insert a single vector."""
        with _LOCK:
            try:
                idx = self._paths.index(path)
                self._index.reconstruct(idx)     # just to assert bounds
                self._index.remove_ids(np.array([idx]))
                self._paths.pop(idx)
            except ValueError:
                pass
            self._paths.append(path)
            self._index.add(self.embed(summary))

    def top_k(self, query: str, k: int = 20) -> List[str]:
        if not self._paths:
            return []
        D, I = self._index.search(self.embed(query), min(k, len(self._paths)))
        # Filter by positive similarity
        hits = [self._paths[i] for i, d in zip(I[0], D[0]) if d > 0.1]
        return hits[:k]
