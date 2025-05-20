# python_backend/sitecustomize.py
"""
Compatibility shim for Tree-Sitter language bindings.

* On Python < 3.13 we keep using `tree_sitter_languages`.
* On Python ≥ 3.13 we install `tree_sitter_language_pack`, but many
  modules still do `import tree_sitter_languages`.  If that import
  fails we fall back to the new package and register it under the old
  name so the rest of the code base works untouched.
"""

import importlib
import sys
import warnings

try:
    import tree_sitter_languages  # noqa: F401
except ModuleNotFoundError:
    try:
        tslp = importlib.import_module("tree_sitter_language_pack")
        sys.modules["tree_sitter_languages"] = tslp
    except ModuleNotFoundError:
        warnings.warn(
            "Neither 'tree_sitter_languages' nor 'tree_sitter_language_pack' "
            "could be imported.  Tree-Sitter based features will be disabled."
        )
