# python_backend/controllers/__init__.py
"""Central blueprint registry

This module automatically discovers any sub-module inside the *controllers*
package that exposes at least one :class:`flask.Blueprint` instance and makes
all of them available via the iterable :data:`all_blueprints`.

The previous implementation used explicit *from xyz import <bp>* statements –
a brittle approach which broke as soon as a module renamed the blueprint
variable.  We now rely on runtime introspection and therefore do **not** care
what the variable is called – as long as it is a ``Blueprint``.

The change guarantees that adding a new controller requires **no additional
changes in this file** and fixes the current ``ImportError`` raised when a
controller is imported but the expected symbol name is missing.
"""

from __future__ import annotations

import importlib
import inspect
import pkgutil
from types import ModuleType
from typing import List

from flask import Blueprint

__all__: list[str] = ["all_blueprints"]


def _iter_submodules() -> list[ModuleType]:
    """Import every direct sub‑module under *controllers* and yield it."""
    submodules: list[ModuleType] = []
    for _finder, name, _ispkg in pkgutil.iter_modules(__path__):  # type: ignore[name-defined]
        module = importlib.import_module(f"{__name__}.{name}")
        submodules.append(module)
    return submodules


def _discover_blueprints() -> list[Blueprint]:
    """Find every :class:`flask.Blueprint` declared by child modules."""
    discovered: list[Blueprint] = []
    for module in _iter_submodules():
        for _attr_name, obj in inspect.getmembers(module, lambda o: isinstance(o, Blueprint)):
            discovered.append(obj)
    return discovered


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

all_blueprints: List[Blueprint] = _discover_blueprints()
