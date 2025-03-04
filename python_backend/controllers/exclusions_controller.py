# python_backend/controllers/exclusions_controller.py

import os
from flask import Blueprint, request, jsonify, current_app

exclusions_blueprint = Blueprint('exclusions_blueprint', __name__)

IGNORE_FILE_NAME = 'ignoreDirs.txt'
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

@exclusions_blueprint.route('/api/exclusions', methods=['GET', 'POST'])
def handle_exclusions():
    """
    GET: Return current exclusions (lines from ignoreDirs.txt).
    POST: Update exclusions (overwrite ignoreDirs.txt).
    """
    ignore_file_path = os.path.join(PROJECT_ROOT, IGNORE_FILE_NAME)

    if request.method == 'GET':
        exclusions = []
        try:
            with open(ignore_file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        exclusions.append(line)
        except FileNotFoundError:
            current_app.logger.info("ignoreDirs.txt not found; returning empty list.")

        return jsonify(success=True, exclusions=exclusions), 200

    elif request.method == 'POST':
        data = request.get_json() or {}
        new_exclusions = data.get('exclusions', [])

        if not isinstance(new_exclusions, list):
            return jsonify(success=False, error="Exclusions must be an array of strings"), 400

        # Clean and write to file
        clean_lines = []
        for item in new_exclusions:
            item = item.strip()
            if item:
                clean_lines.append(item)

        try:
            with open(ignore_file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(clean_lines))
            return jsonify(success=True, exclusions=clean_lines), 200
        except Exception as e:
            current_app.logger.error(f"Error writing to {ignore_file_path}: {str(e)}")
            return jsonify(success=False, error=str(e)), 500
