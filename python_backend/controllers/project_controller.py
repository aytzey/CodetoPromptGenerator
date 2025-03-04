# python_backend/controllers/project_controller.py

import os
import json
from flask import Blueprint, request, jsonify, current_app

# Changed the blueprint name to match what app.py expects
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