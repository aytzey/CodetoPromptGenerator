#!/usr/bin/env python3
"""
HTTP API server for development/testing
This provides the same functionality as the IPC handler but via HTTP endpoints
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import logging

# Add the parent directory to the path to import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import all services
from services.project_service import ProjectService
from services.autoselect_service import AutoSelectService
from services.exclusion_service import ExclusionService
from services.prompt_service import PromptService
from services.kanban_service import KanbanService
from services.todo_service import TodoService
from services.actor_service import ActorService
from utils.response_utils import success_response, error_response

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize services
project_service = ProjectService()
autoselect_service = AutoSelectService()
exclusion_service = ExclusionService()
prompt_service = PromptService()
kanban_service = KanbanService()
todo_service = TodoService()
actor_service = ActorService()

# Project endpoints
@app.route('/api/project/tree', methods=['GET'])
def get_project_tree():
    try:
        root_dir = request.args.get('rootDir')
        if not root_dir:
            return jsonify(error_response("rootDir parameter is required")), 400
        
        tree = project_service.get_file_tree(root_dir)
        return jsonify(success_response(tree))
    except Exception as e:
        logger.error(f"Error getting project tree: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/project/files', methods=['POST'])
def get_files():
    try:
        data = request.json
        root_dir = data.get('rootDir')
        files = data.get('files', [])
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        result = project_service.get_files_content(root_dir, files)
        return jsonify(success_response(result))
    except Exception as e:
        logger.error(f"Error getting files: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/project/calculate-tokens', methods=['POST'])
def calculate_tokens():
    try:
        data = request.json
        root_dir = data.get('rootDir')
        files = data.get('files', [])
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        result = project_service.calculate_tokens(root_dir, files)
        return jsonify(success_response(result))
    except Exception as e:
        logger.error(f"Error calculating tokens: {e}")
        return jsonify(error_response(str(e))), 500

# AutoSelect endpoints
@app.route('/api/autoselect/process', methods=['POST'])
def autoselect_process():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        root_dir = data.get('rootDir')
        settings = data.get('settings', {})
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        result = autoselect_service.process_autoselect(prompt, root_dir, settings)
        return jsonify(success_response(result))
    except Exception as e:
        logger.error(f"Error in autoselect: {e}")
        return jsonify(error_response(str(e))), 500

# Exclusion endpoints
@app.route('/api/exclusions', methods=['GET'])
def get_exclusions():
    try:
        root_dir = request.args.get('rootDir')
        if not root_dir:
            return jsonify(error_response("rootDir parameter is required")), 400
            
        exclusions = exclusion_service.get_exclusions(root_dir)
        return jsonify(success_response(exclusions))
    except Exception as e:
        logger.error(f"Error getting exclusions: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/exclusions', methods=['POST'])
def save_exclusions():
    try:
        data = request.json
        root_dir = data.get('rootDir')
        exclusions = data.get('exclusions', [])
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        exclusion_service.save_exclusions(root_dir, exclusions)
        return jsonify(success_response({"message": "Exclusions saved"}))
    except Exception as e:
        logger.error(f"Error saving exclusions: {e}")
        return jsonify(error_response(str(e))), 500

# Prompt endpoints
@app.route('/api/prompt/generate', methods=['POST'])
def generate_prompt():
    try:
        data = request.json
        root_dir = data.get('rootDir')
        files = data.get('files', [])
        user_prompt = data.get('userPrompt', '')
        options = data.get('options', {})
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        result = prompt_service.generate_prompt(root_dir, files, user_prompt, options)
        return jsonify(success_response(result))
    except Exception as e:
        logger.error(f"Error generating prompt: {e}")
        return jsonify(error_response(str(e))), 500

# Kanban endpoints
@app.route('/api/kanban', methods=['GET'])
def get_kanban_items():
    try:
        project_path = request.args.get('projectPath')
        if not project_path:
            return jsonify(error_response("projectPath parameter is required")), 400
            
        items = kanban_service.get_kanban_items(project_path)
        return jsonify(success_response(items))
    except Exception as e:
        logger.error(f"Error getting kanban items: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/kanban', methods=['POST'])
def create_kanban_item():
    try:
        data = request.json
        project_path = data.get('projectPath')
        
        if not project_path:
            return jsonify(error_response("projectPath is required")), 400
            
        # Remove projectPath from data to pass the rest as item data
        item_data = {k: v for k, v in data.items() if k != 'projectPath'}
        item = kanban_service.create_kanban_item(project_path, item_data)
        return jsonify(success_response(item))
    except Exception as e:
        logger.error(f"Error creating kanban item: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/kanban/<int:item_id>', methods=['PATCH'])
def update_kanban_item(item_id):
    try:
        data = request.json
        project_path = data.get('projectPath')
        
        if not project_path:
            return jsonify(error_response("projectPath is required")), 400
            
        # Remove projectPath from data to pass the rest as updates
        updates = {k: v for k, v in data.items() if k != 'projectPath'}
        item = kanban_service.update_kanban_item(project_path, item_id, updates)
        return jsonify(success_response(item))
    except Exception as e:
        logger.error(f"Error updating kanban item: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/kanban/<int:item_id>', methods=['DELETE'])
def delete_kanban_item(item_id):
    try:
        project_path = request.args.get('projectPath')
        if not project_path:
            return jsonify(error_response("projectPath parameter is required")), 400
            
        kanban_service.delete_kanban_item(project_path, item_id)
        return jsonify(success_response({"message": "Item deleted"}))
    except Exception as e:
        logger.error(f"Error deleting kanban item: {e}")
        return jsonify(error_response(str(e))), 500

# Todo endpoints
@app.route('/api/todos', methods=['GET'])
def get_todos():
    try:
        root_dir = request.args.get('rootDir')
        if not root_dir:
            return jsonify(error_response("rootDir parameter is required")), 400
            
        todos = todo_service.get_todos(root_dir)
        return jsonify(success_response(todos))
    except Exception as e:
        logger.error(f"Error getting todos: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/todos', methods=['POST'])
def create_todo():
    try:
        data = request.json
        root_dir = data.get('rootDir')
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        # Remove rootDir from data to pass the rest as todo data
        todo_data = {k: v for k, v in data.items() if k != 'rootDir'}
        todo = todo_service.create_todo(root_dir, todo_data)
        return jsonify(success_response(todo))
    except Exception as e:
        logger.error(f"Error creating todo: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/todos/<todo_id>', methods=['PATCH'])
def update_todo(todo_id):
    try:
        data = request.json
        root_dir = data.get('rootDir')
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        # Remove rootDir from data to pass the rest as updates
        updates = {k: v for k, v in data.items() if k != 'rootDir'}
        todo = todo_service.update_todo(root_dir, todo_id, updates)
        return jsonify(success_response(todo))
    except Exception as e:
        logger.error(f"Error updating todo: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/todos/<todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    try:
        root_dir = request.args.get('rootDir')
        if not root_dir:
            return jsonify(error_response("rootDir parameter is required")), 400
            
        todo_service.delete_todo(root_dir, todo_id)
        return jsonify(success_response({"message": "Todo deleted"}))
    except Exception as e:
        logger.error(f"Error deleting todo: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/todos/<todo_id>/toggle', methods=['POST'])
def toggle_todo(todo_id):
    try:
        data = request.json
        root_dir = data.get('rootDir')
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        todo = todo_service.toggle_todo(root_dir, todo_id)
        return jsonify(success_response(todo))
    except Exception as e:
        logger.error(f"Error toggling todo: {e}")
        return jsonify(error_response(str(e))), 500

# Actor endpoints
@app.route('/api/actors', methods=['GET'])
def get_actors():
    try:
        root_dir = request.args.get('rootDir')
        if not root_dir:
            return jsonify(error_response("rootDir parameter is required")), 400
            
        actors = actor_service.get_actors(root_dir)
        return jsonify(success_response(actors))
    except Exception as e:
        logger.error(f"Error getting actors: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/actors', methods=['POST'])
def create_actor():
    try:
        data = request.json
        root_dir = data.get('rootDir')
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        # Remove rootDir from data to pass the rest as actor data
        actor_data = {k: v for k, v in data.items() if k != 'rootDir'}
        actor = actor_service.create_actor(root_dir, actor_data)
        return jsonify(success_response(actor))
    except Exception as e:
        logger.error(f"Error creating actor: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/actors/<actor_id>', methods=['PATCH'])
def update_actor(actor_id):
    try:
        data = request.json
        root_dir = data.get('rootDir')
        
        if not root_dir:
            return jsonify(error_response("rootDir is required")), 400
            
        # Remove rootDir from data to pass the rest as updates
        updates = {k: v for k, v in data.items() if k != 'rootDir'}
        actor = actor_service.update_actor(root_dir, actor_id, updates)
        return jsonify(success_response(actor))
    except Exception as e:
        logger.error(f"Error updating actor: {e}")
        return jsonify(error_response(str(e))), 500

@app.route('/api/actors/<actor_id>', methods=['DELETE'])
def delete_actor(actor_id):
    try:
        root_dir = request.args.get('rootDir')
        if not root_dir:
            return jsonify(error_response("rootDir parameter is required")), 400
            
        actor_service.delete_actor(root_dir, actor_id)
        return jsonify(success_response({"message": "Actor deleted"}))
    except Exception as e:
        logger.error(f"Error deleting actor: {e}")
        return jsonify(error_response(str(e))), 500

# Token endpoint
@app.route('/api/token/count', methods=['POST'])
def count_tokens():
    try:
        data = request.json
        text = data.get('text', '')
        model = data.get('model', 'gpt-3.5-turbo')
        
        # Use tiktoken or similar library to count tokens
        # For now, use a simple approximation
        tokens = len(text.split()) * 1.3  # Rough approximation
        
        return jsonify(success_response({"count": int(tokens)}))
    except Exception as e:
        logger.error(f"Error counting tokens: {e}")
        return jsonify(error_response(str(e))), 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify(success_response({"status": "healthy"}))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='127.0.0.1', port=port, debug=True)