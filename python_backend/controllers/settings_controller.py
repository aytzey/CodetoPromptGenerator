# python_backend/controllers/settings_controller.py
"""Expose server-side configuration status to the frontend."""
from __future__ import annotations

import os
from flask import Blueprint
from utils.response_utils import success_response

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")


@settings_bp.get("/env-status")
def env_status():
    """Return which server-side API keys are available (never exposes the key itself)."""
    google_key = (os.getenv("GOOGLE_API_KEY") or "").strip()
    return success_response(data={
        "googleKeyAvailable": bool(google_key),
    })
