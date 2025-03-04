# python_backend/controllers/files_controller.py

import os
import json
from flask import Blueprint, request, jsonify, current_app

files_blueprint = Blueprint('files_blueprint', __name__)

# Utility function to read ignoreDirs.txt from project root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IGNORE_FILE_NAME = 'ignoreDirs.txt'


@files_blueprint.route('/api/files', methods=['POST'])
def get_project_tree():
    """
    POST body: { "path": "<absolute or relative path>" }
    Returns a tree of files and directories, respecting ignoreDirs.txt.
    """
    data = request.get_json() or {}
    path_arg = data.get('path', '')

    if not path_arg:
        return jsonify(success=False, error="Path is required"), 400

    full_path = os.path.abspath(path_arg)

    if not os.path.exists(full_path) or not os.path.isdir(full_path):
        return jsonify(success=False, error="Invalid path or not a directory"), 400

    # Read ignored directories
    ignore_file_path = os.path.join(PROJECT_ROOT, IGNORE_FILE_NAME)
    ignored_dirs = []
    if os.path.exists(ignore_file_path):
        with open(ignore_file_path, 'r', encoding='utf-8') as f:
            lines = [ln.strip() for ln in f if ln.strip()]
        ignored_dirs = lines

    tree = build_file_tree(full_path, full_path, ignored_dirs)
    return jsonify(success=True, tree=tree), 200


@files_blueprint.route('/api/files/contents', methods=['POST'])
def get_files_contents():
    """
    POST body: { "path": "<baseDir>", "files": ["relativePath1", "relativePath2", ...] }
    Reads each file's content and estimates a naive tokenCount.
    """
    data = request.get_json() or {}
    base_path = data.get('path', '')
    files = data.get('files', [])

    if not base_path or not isinstance(files, list):
        return jsonify(success=False, error="Invalid request body"), 400

    base_path = os.path.abspath(base_path)
    results = []
    for rel_path in files:
        full_path = os.path.join(base_path, rel_path)
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            results.append({
                'path': rel_path,
                'content': f"File not found on server: {rel_path}",
                'tokenCount': 0
            })
            continue

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            token_count = estimate_token_count(content)
            results.append({
                'path': rel_path,
                'content': content,
                'tokenCount': token_count
            })
        except Exception as e:
            current_app.logger.error(f"Error reading file {full_path}: {str(e)}")
            results.append({
                'path': rel_path,
                'content': f"Error reading file: {rel_path}",
                'tokenCount': 0
            })

    return jsonify(success=True, filesData=results), 200


def build_file_tree(current_dir, base_dir, ignored_dirs):
    """
    Recursively build the file tree (directory + children).
    Similar to the original logic from getProjectTree in Next.js code.
    """
    items = []
    try:
        for entry in os.scandir(current_dir):
            rel_path = os.path.relpath(entry.path, base_dir).replace('\\', '/')
            if is_excluded(rel_path, ignored_dirs):
                continue

            if entry.is_dir():
                children = build_file_tree(entry.path, base_dir, ignored_dirs)
                items.append({
                    'name': entry.name,
                    'relativePath': rel_path,
                    'absolutePath': entry.path.replace('\\', '/'),
                    'type': 'directory',
                    'children': children
                })
            else:
                items.append({
                    'name': entry.name,
                    'relativePath': rel_path,
                    'absolutePath': entry.path.replace('\\', '/'),
                    'type': 'file'
                })
    except Exception as e:
        current_app.logger.error(f"Error scanning {current_dir}: {str(e)}")

    return items


def is_excluded(relative_path, ignored_dirs):
    """
    Returns True if `relative_path` includes any directory in ignored_dirs.
    """
    segments = relative_path.split('/')
    for ign in ignored_dirs:
        if ign in segments:
            return True
    return False


def estimate_token_count(text):
    """
    Simple word+punct token estimate; similar to the Next.js example.
    """
    import re
    tokens = re.split(r"\s+|[,.;:!?()\[\]{}'\"<>]", text)
    tokens = [t for t in tokens if t.strip()]
    # Count punctuation separately
    special_chars = len(re.findall(r"[,.;:!?()\[\]{}'\"<>]", text))
    return len(tokens) + special_chars
