"""
controllers/resolve_folder_controller.py
--------------------------------------------------
Endpoints that support the Folder‑Browser UI.
"""

from __future__ import annotations

import logging
from http import HTTPStatus

from flask import Blueprint, jsonify, request, abort

from utils.path_utils import list_logical_drives, list_subfolders

logger = logging.getLogger(__name__)
resolve_bp = Blueprint("resolve", __name__, url_prefix="/api")


@resolve_bp.get("/select_drives")
def api_select_drives():
    """
    GET /api/select_drives
    ----------------------
    Returns a list of logical “drives”.

    Response → { success: bool, drives: [ {name, path}, … ] }
    """
    drives = list_logical_drives()
    return jsonify({"success": True, "drives": drives})


@resolve_bp.get("/browse_folders")
def api_browse_folders():
    """
    GET /api/browse_folders?path=/some/dir
    --------------------------------------
    Lists *child* folders of the requested path.
    """
    raw_path: str | None = request.args.get("path")
    if not raw_path:
        abort(HTTPStatus.BAD_REQUEST, "Missing 'path' query‑param")

    try:
        folders = list_subfolders(raw_path)
        parent_path = None if raw_path in ("/", raw_path.rstrip("/")) else str(
            __import__("pathlib").Path(raw_path).resolve().parent
        )
        payload = {
            "success": True,
            "current_path": raw_path,
            "parent_path": parent_path,
            "folders": folders,
        }
        return jsonify(payload)

    except PermissionError:
        logger.warning("Permission denied while browsing %s", raw_path)
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Permission denied",
                    "current_path": raw_path,
                }
            ),
            HTTPStatus.FORBIDDEN,
        )
    except (FileNotFoundError, NotADirectoryError):
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Path does not exist or is not a directory",
                    "current_path": raw_path,
                }
            ),
            HTTPStatus.NOT_FOUND,
        )
