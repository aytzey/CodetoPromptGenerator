# controllers/project_controller.py

from flask import Blueprint, request, jsonify
import os
from services.project_service import get_project_tree

project_blueprint = Blueprint('project_blueprint', __name__)

@project_blueprint.route('/api/projects/tree', methods=['GET'])
def get_tree():
    """
    GET /api/projects/tree?rootDir=/absolute/path
    """
    root_dir = request.args.get('rootDir', None)
    if not root_dir or not os.path.isdir(root_dir):
        return jsonify(success=False, message="rootDir not provided or invalid."), 400

    try:
        tree = get_project_tree(root_dir)
        return jsonify(success=True, data=tree), 200
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500


@project_blueprint.route('/api/projects/files', methods=['POST'])
def get_file_contents():
    """
    Expects JSON with a 'baseDir' for the project root,
    plus a list of file paths in 'paths'.

    Example POST body:
    {
      "baseDir": "/home/user/path/to/my-project",
      "paths": [
        "sample_project/prettier.config.cjs",
        "scripts/autotest.js"
      ]
    }

    We'll construct the absolute path for each file, check if it exists,
    and read its contents if found.
    """
    payload = request.get_json() or {}
    base_dir = payload.get('baseDir', '').strip()
    file_paths = payload.get('paths', [])

    if not base_dir or not os.path.isdir(base_dir):
        return jsonify(success=False, message="baseDir not provided or invalid."), 400
    if not isinstance(file_paths, list):
        return jsonify(success=False, message="paths must be a list"), 400

    results = []
    for relative_path in file_paths:
        # Build an absolute path from base_dir + relative_path
        abs_path = os.path.join(base_dir, relative_path)

        if not os.path.isfile(abs_path):
            results.append({
                "path": relative_path,
                "content": f"File not found on server: {relative_path}",
                "tokenCount": 0
            })
            continue

        try:
            with open(abs_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()

            # approximate token count
            token_count = len(content.strip().split())

            results.append({
                "path": relative_path,         # original path for front-end reference
                "content": content,
                "tokenCount": token_count
            })
        except Exception as e:
            results.append({
                "path": relative_path,
                "content": f"Error reading file: {str(e)}",
                "tokenCount": 0
            })

    return jsonify(success=True, data=results), 200
