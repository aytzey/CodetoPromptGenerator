# python_backend/controllers/exclusions_controller.py

import os
import json
from flask import Blueprint, request, jsonify, current_app

exclusions_blueprint = Blueprint('exclusions_blueprint', __name__)

IGNORE_FILE_NAME = 'ignoreDirs.txt'
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

@exclusions_blueprint.route('/api/exclusions', methods=['GET', 'POST'])
def handle_exclusions():
    """
    Global exclusions referencing 'ignoreDirs.txt' in the repo root.
    GET => read it
    POST => overwrite it
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

@exclusions_blueprint.route('/api/localExclusions', methods=['GET', 'POST'])
def local_exclusions():
    """
    Manages per-project "local exclusions" stored in:
      <projectPath>/.codetoprompt/localExclusions.json

    Query Param: ?projectPath=<absolute_path_to_project>
    GET => read the JSON
    POST => overwrite with new list
    """
    project_path = request.args.get('projectPath', '').strip()
    if not project_path:
        return jsonify(success=False, error="Missing 'projectPath' query param."), 400

    codetoprompt_dir = os.path.join(project_path, '.codetoprompt')
    os.makedirs(codetoprompt_dir, exist_ok=True)  # ensure folder exists

    local_exclusions_file = os.path.join(codetoprompt_dir, 'localExclusions.json')

    if request.method == 'GET':
        data = []
        if os.path.exists(local_exclusions_file):
            try:
                with open(local_exclusions_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception as e:
                current_app.logger.error(f"Error reading localExclusions.json: {str(e)}")
        return jsonify(success=True, localExclusions=data), 200

    elif request.method == 'POST':
        body = request.get_json() or {}
        new_exclusions = body.get('localExclusions', [])

        if not isinstance(new_exclusions, list):
            return jsonify(success=False, error="localExclusions must be an array"), 400

        try:
            with open(local_exclusions_file, 'w', encoding='utf-8') as f:
                json.dump(new_exclusions, f, indent=2)
            return jsonify(success=True, localExclusions=new_exclusions), 200
        except Exception as e:
            current_app.logger.error(f"Error writing localExclusions.json: {str(e)}")
            return jsonify(success=False, error=str(e)), 500
