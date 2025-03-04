# python_backend/controllers/resolve_folder_controller.py

import os
from flask import Blueprint, request, jsonify, current_app

resolve_blueprint = Blueprint('resolve_blueprint', __name__)

@resolve_blueprint.route('/api/resolveFolder', methods=['POST'])
def resolve_folder():
    """
    Mirrors the logic from pages/api/resolveFolder.ts,
    attempting to guess or resolve a user-provided folder path.
    """
    data = request.get_json() or {}
    folder_name = data.get('folderName', '').strip()

    if not folder_name:
        return jsonify(success=False, error='Folder name is required'), 400

    # We'll try some candidate paths:
    possible_paths = [
        os.getcwd(),
        os.path.abspath(os.path.join(os.getcwd(), '..')),
        os.path.abspath(os.path.join(os.getcwd(), '..', '..'))
    ]

    resolved_path = ''
    for base in possible_paths:
        candidate = os.path.join(base, folder_name)
        if os.path.exists(candidate):
            resolved_path = os.path.abspath(candidate)
            break

    if not resolved_path:
        resolved_path = os.path.abspath(folder_name)

    return jsonify(success=True, path=resolved_path), 200
