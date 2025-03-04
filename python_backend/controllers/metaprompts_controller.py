# python_backend/controllers/metaprompts_controller.py

import os
from flask import Blueprint, request, jsonify, current_app

metaprompts_blueprint = Blueprint('metaprompts_blueprint', __name__)

@metaprompts_blueprint.route('/api/metaprompts', methods=['GET'])
def list_or_load():
    """
    GET endpoint:
      - action=list => returns list of .txt files
      - action=load&file=<filename> => loads a specific .txt file
      - dir=<directory> => optional, defaults to sample_project/meta_prompts
    """
    action = request.args.get('action', '').strip()
    filename = request.args.get('file', '').strip()
    dir_param = request.args.get('dir', '').strip()

    if dir_param:
        base_dir = os.path.abspath(dir_param)
    else:
        # default to sample_project/meta_prompts relative to project root
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'sample_project', 'meta_prompts'))

    # Ensure base_dir exists
    if not os.path.exists(base_dir):
        try:
            os.makedirs(base_dir, exist_ok=True)
        except Exception as e:
            return jsonify(error=f"Failed to create meta prompts directory: {str(e)}"), 400

    if action == 'list':
        # Return list of .txt files
        files = [f for f in os.listdir(base_dir) if f.endswith('.txt')]
        return jsonify(success=True, files=files), 200

    elif action == 'load' and filename:
        filepath = os.path.join(base_dir, filename)
        if not filename.endswith('.txt') or not os.path.exists(filepath):
            return jsonify(success=False, error='File not found'), 404
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify(success=True, content=content), 200

    return jsonify(error='Invalid action'), 400


@metaprompts_blueprint.route('/api/metaprompts', methods=['POST'])
def save_metaprompt():
    """
    POST => save or update a meta prompt file
    Body: { filename, content }
    dir=<optional directory> in query string
    """
    dir_param = request.args.get('dir', '').strip()
    if dir_param:
        base_dir = os.path.abspath(dir_param)
    else:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'sample_project', 'meta_prompts'))

    data = request.get_json() or {}
    filename = data.get('fileName') or data.get('filename')
    content = data.get('content', '')

    if not filename:
        return jsonify(error='Missing filename'), 400
    if not isinstance(content, str):
        return jsonify(error='Missing content'), 400

    if not filename.endswith('.txt'):
        filename += '.txt'

    # Ensure directory
    if not os.path.exists(base_dir):
        try:
            os.makedirs(base_dir, exist_ok=True)
        except Exception as e:
            return jsonify(error=f"Failed to create meta prompts directory: {str(e)}"), 400

    filepath = os.path.join(base_dir, filename)
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify(success=True), 200
    except Exception as e:
        current_app.logger.error(f"Error saving meta prompt: {str(e)}")
        return jsonify(error='Internal server error'), 500
