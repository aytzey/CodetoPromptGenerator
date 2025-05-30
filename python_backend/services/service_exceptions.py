"""
Shared service-layer exception taxonomy and helpers
===================================================

▶  Add this file to *python_backend/services/*.
▶  Decorate every service class with **@wrap_service_methods**.

Any uncaught native exception raised inside a *public* (non-underscore)
service method is:

  • mapped to the correct custom exception,
  • **logged** (`logger.exception` for tracebacks, `logger.error` otherwise),
  • re-raised so the calling controller can translate it to an HTTP status.

This keeps individual services clean – they only need to `raise` when they
*know* the precise error class; everything else is normalised for them.
"""
from __future__ import annotations

import functools
import logging
from typing import Callable, TypeVar

try:                           # httpx is optional – only used for mapping
    import httpx               # noqa: WPS433 (third-party import in lib)
except ModuleNotFoundError:    # pragma: no cover
    httpx = None               # type: ignore

__all__ = [
    # base
    "ServiceError",
    # concrete leaf classes
    "InvalidInputError",
    "ResourceNotFoundError",
    "PermissionDeniedError",
    "ConfigurationError",
    "UpstreamServiceError",
    # helpers
    "wrap_service_methods",
]

log = logging.getLogger(__name__)

# ────────────────────────────────
# 1 · Exception hierarchy
# ────────────────────────────────
class ServiceError(Exception):
    """Base-class of *all* service-layer errors."""


class InvalidInputError(ServiceError):
    """Bad caller arguments that slipped through Pydantic validation."""


class ResourceNotFoundError(ServiceError):
    """Local resource (file / dir / record) is missing."""


class PermissionDeniedError(ServiceError):
    """The OS blocked access (read/write/delete)."""


class ConfigurationError(ServiceError):
    """Server mis-configuration – e.g. missing environment variables."""


class UpstreamServiceError(ServiceError):
    """3rd-party / network / HTTP failures."""


# ────────────────────────────────
# 2 · Automatic translation glue
# ────────────────────────────────
_F = TypeVar("_F", bound=Callable[..., object])


def _translate(exc: Exception) -> ServiceError:
    """Map any *native* exception onto our taxonomy."""
    if isinstance(exc, ServiceError):            # already normalised
        return exc

    # Filesystem
    if isinstance(exc, FileNotFoundError):
        return ResourceNotFoundError(str(exc))
    if isinstance(exc, PermissionError):
        return PermissionDeniedError(str(exc))

    # Configuration
    if isinstance(exc, KeyError):
        return ConfigurationError(str(exc))

    # Validation
    if isinstance(exc, ValueError):
        return InvalidInputError(str(exc))

    # Network / HTTP (optional)
    if httpx and isinstance(exc, httpx.HTTPError):
        return UpstreamServiceError(str(exc))

    # Fallback – treat as upstream/internal
    return UpstreamServiceError(str(exc))


def _wrap_one(func: _F) -> _F:  # type: ignore[misc]
    """Decorator used internally by :pyfunc:`wrap_service_methods`."""
    logger = logging.getLogger(func.__module__)

    @functools.wraps(func)
    def wrapper(*args, **kwargs):  # type: ignore[override]
        try:
            return func(*args, **kwargs)
        except Exception as exc:   # noqa: BLE001
            mapped = _translate(exc)
            if isinstance(mapped, UpstreamServiceError):
                logger.error("%s → %s", func.__qualname__, mapped)
            else:
                logger.exception("%s failed: %s", func.__qualname__, mapped)
            raise mapped from exc

    return wrapper  # type: ignore[return-value]


def wrap_service_methods(cls):
    """
    Class decorator – drop-in upgrade for *any* service.

    It wraps **all public methods** (attributes that are callable and **do not**
    start with an underscore) with `_wrap_one`, guaranteeing that controllers
    only ever see our custom error classes.

    Example
    -------
        from services.service_exceptions import wrap_service_methods

        @wrap_service_methods
        class TodoService:
            ...
    """
    for name, attr in cls.__dict__.items():
        if callable(attr) and not name.startswith("_"):
            setattr(cls, name, _wrap_one(attr))
    return cls
