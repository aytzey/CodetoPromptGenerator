import os
import sys

# Allow imports from python_backend when tests run from repo root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.autoselect_service import AutoselectService
from services.prompt_service import PromptService
from services.autoselect_service import ConfigError
from services.service_exceptions import ConfigurationError


def test_autoselect_alias_maps_to_canonical_gemini_3():
    svc = AutoselectService.__new__(AutoselectService)
    svc._unavailable_google_models = set()  # type: ignore[attr-defined]

    candidates = svc._google_model_candidates("gemini-3.0-flash-preview")
    assert candidates == ["gemini-3-flash-preview"]
    assert all("2.5" not in model for model in candidates)


def test_autoselect_does_not_fallback_when_model_marked_unavailable():
    svc = AutoselectService.__new__(AutoselectService)
    svc._unavailable_google_models = {"gemini-3-flash-preview"}  # type: ignore[attr-defined]

    assert svc._google_model_candidates("gemini-3.0-flash-preview") == []


def test_prompt_service_alias_maps_to_canonical_gemini_3():
    svc = PromptService.__new__(PromptService)
    svc._unavailable_google_models = set()  # type: ignore[attr-defined]

    candidates = svc._google_model_candidates("models/gemini-3.0-flash-preview")
    assert candidates == ["gemini-3-flash-preview"]
    assert all("2.5" not in model for model in candidates)


def test_autoselect_rejects_non_flash_google_model():
    svc = AutoselectService.__new__(AutoselectService)
    svc.google_model = "gemini-3.1-pro-preview"  # type: ignore[attr-defined]

    try:
        svc._default_model_for_provider("google", None)
    except ConfigError as exc:
        assert "gemini-3-flash-preview" in str(exc)
    else:
        raise AssertionError("Expected ConfigError for non-flash execution model")


def test_prompt_service_rejects_non_flash_google_model():
    svc = PromptService.__new__(PromptService)
    svc.google_model = "gemini-3.1-pro-preview"  # type: ignore[attr-defined]

    try:
        svc._default_model_for_provider("google", None)
    except ConfigurationError as exc:
        assert "gemini-3-flash-preview" in str(exc)
    else:
        raise AssertionError("Expected ConfigurationError for non-flash execution model")
