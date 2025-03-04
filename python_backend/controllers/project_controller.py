# python_backend/controllers/project_controller.py

import os
import json
from flask import Blueprint, request, jsonify, current_app

project_blueprint = Blueprint('project_blueprint', __name__)

@project_blueprint.route('/api/browse_folders', methods=['GET'])
def browse_folders():
    """Get available folders at a given path"""
    try:
        # Get the path from query parameters, default to current directory
        current_path = request.args.get('path', os.getcwd())
        
        # Ensure the path exists
        if not os.path.exists(current_path):
            return jsonify({
                'success': False,
                'error': f"Path does not exist: {current_path}"
            }), 400
        
        # Get folders and parent directory
        parent_dir = os.path.dirname(current_path) if current_path != os.path.dirname(current_path) else None
        folders = []
        
        try:
            # List all items in the directory
            for item in os.listdir(current_path):
                full_path = os.path.join(current_path, item)
                if os.path.isdir(full_path):
                    folders.append({
                        'name': item,
                        'path': full_path
                    })
                    
            # Sort folders by name
            folders.sort(key=lambda x: x['name'].lower())
                
        except PermissionError:
            return jsonify({
                'success': False,
                'error': f"Permission denied to access: {current_path}"
            }), 403
                
        return jsonify({
            'success': True,
            'current_path': current_path,
            'parent_path': parent_dir,
            'folders': folders
        })
        
    except Exception as e:
        current_app.logger.error(f"Error browsing folders: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@project_blueprint.route('/api/select_drives', methods=['GET'])
def select_drives():
    """Get available drives (for Windows) or root directories (for Unix/Linux/Mac)"""
    try:
        drives = []
        
        # For Windows: Get available drives
        if os.name == 'nt':
            import string
            from ctypes import windll
            
            # Get the bitmask of available drives
            bitmask = windll.kernel32.GetLogicalDrives()
            
            # Check each possible drive letter
            for letter in string.ascii_uppercase:
                # Test if the corresponding bit is set
                if bitmask & (1 << (ord(letter) - ord('A'))):
                    drive_path = f"{letter}:\\"
                    drives.append({
                        'name': drive_path,
                        'path': drive_path
                    })
        
        # For Unix/Linux/Mac: Add root directory and common locations
        else:
            # Add root directory
            drives.append({
                'name': '/ (Root)',
                'path': '/'
            })
            
            # Add home directory
            home_dir = os.path.expanduser('~')
            drives.append({
                'name': f"~ (Home: {home_dir})",
                'path': home_dir
            })
            
            # Add Desktop, Documents, Downloads if they exist
            for folder in ['Desktop', 'Documents', 'Downloads']:
                path = os.path.join(home_dir, folder)
                if os.path.exists(path) and os.path.isdir(path):
                    drives.append({
                        'name': folder,
                        'path': path
                    })
        
        return jsonify({
            'success': True,
            'drives': drives
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting drives: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


from .files_controller import build_file_tree, estimate_token_count


@project_blueprint.route('/api/projects/tree', methods=['GET'])
def get_projects_tree():
    """
    GET /api/projects/tree?rootDir=...
    - If missing or invalid, return 400
    - Else, return a file/directory tree
    """
    root_dir = request.args.get('rootDir', '').strip()
    if not root_dir:
        return jsonify(success=False, error="Missing 'rootDir'"), 400

    if not os.path.isdir(root_dir):
        return jsonify(success=False, error="Invalid or non-existent directory"), 400

    # Build the tree (reusing logic from files_controller)
    try:
        # Re-use the same ignoring logic as files_controller if desired;
        # otherwise, pass an empty ignore list:
        tree = build_file_tree(root_dir, root_dir, ignored_dirs=[])
        return jsonify(success=True, data=tree), 200
    except Exception as e:
        current_app.logger.error(f"Error building tree for {root_dir}: {str(e)}")
        return jsonify(success=False, error=str(e)), 500


@project_blueprint.route('/api/projects/files', methods=['POST'])
def fetch_file_contents():
    """
    POST /api/projects/files
    Body: {
      "baseDir": "<absolute-path>",
      "paths": ["relative/path1", "relative/path2", ...]
    }
    Returns: { "success": true, "data": [ { "path", "content", "tokenCount" }, ... ] }
    - If a file is not found, returns content: "File not found on server: <relativePath>"
    """
    data = request.get_json() or {}
    base_dir = data.get('baseDir', '')
    paths = data.get('paths', [])

    if not base_dir or not isinstance(paths, list):
        return jsonify(success=False, error="Invalid request body"), 400

    results = []
    for rel_path in paths:
        full_path = os.path.join(base_dir, rel_path)
        if not os.path.isfile(full_path):
            results.append({
                'path': rel_path,
                'content': f"File not found on server: {rel_path}",
                'tokenCount': 0
            })
            continue

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            t_count = estimate_token_count(content)
            results.append({
                'path': rel_path,
                'content': content,
                'tokenCount': t_count
            })
        except Exception as e:
            current_app.logger.error(f"Error reading file {full_path}: {str(e)}")
            results.append({
                'path': rel_path,
                'content': f"File not found on server: {rel_path}",
                'tokenCount': 0
            })

    return jsonify(success=True, data=results), 200
