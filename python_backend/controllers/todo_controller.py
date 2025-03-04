# python_backend/controllers/todo_controller.py
import os
import json
from flask import Blueprint, request, jsonify, current_app
from models.todo_model import InMemoryTodoDB

todo_db = InMemoryTodoDB()
todo_blueprint = Blueprint('todo_blueprint', __name__)

def _project_todo_file(project_path: str) -> str:
    """
    Return the .codetoprompt/todos.json path for the given project.
    """
    codetoprompt_dir = os.path.join(project_path, '.codetoprompt')
    os.makedirs(codetoprompt_dir, exist_ok=True)
    return os.path.join(codetoprompt_dir, 'todos.json')

def _load_project_todos(project_path: str):
    """
    Load todos from <projectPath>/.codetoprompt/todos.json
    Returns a list of { id, text, completed? }
    """
    todo_file = _project_todo_file(project_path)
    if not os.path.exists(todo_file):
        return []
    try:
        with open(todo_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        current_app.logger.error(f"Error reading {todo_file}: {str(e)}")
        return []

def _save_project_todos(project_path: str, todos: list):
    """
    Save todos to <projectPath>/.codetoprompt/todos.json
    """
    todo_file = _project_todo_file(project_path)
    try:
        with open(todo_file, 'w', encoding='utf-8') as f:
            json.dump(todos, f, indent=2)
    except Exception as e:
        current_app.logger.error(f"Error writing {todo_file}: {str(e)}")

@todo_blueprint.route('/api/todos', methods=['GET'])
def list_todos():
    project_path = request.args.get('projectPath', '').strip()
    if project_path:
        # Use per-project file
        items = _load_project_todos(project_path)
        return jsonify(success=True, data=items)
    else:
        # Fallback to in-memory
        items = todo_db.list_todos()
        return jsonify(success=True, data=items)

@todo_blueprint.route('/api/todos', methods=['POST'])
def add_todo():
    payload = request.get_json() or {}
    text = payload.get('text', '').strip()
    if not text:
        return jsonify(success=False, message="Todo text is required."), 400
    
    project_path = request.args.get('projectPath', '').strip()
    if project_path:
        # handle in file
        todos = _load_project_todos(project_path)
        import time
        new_id = int(time.time() * 1000)
        new_item = {'id': new_id, 'text': text, 'completed': False}
        todos.append(new_item)
        _save_project_todos(project_path, todos)
        return jsonify(success=True, data=new_item)
    else:
        # fallback to in-memory
        new_item = todo_db.add_todo(text)
        return jsonify(success=True, data=new_item)

@todo_blueprint.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """
    Allows toggling completion (or potentially editing) a todo
    {
      "completed": bool
    }
    """
    payload = request.get_json() or {}
    completed = payload.get('completed', None)
    if completed is None:
        return jsonify(success=False, error="Missing 'completed' boolean"), 400

    project_path = request.args.get('projectPath', '').strip()
    if project_path:
        todos = _load_project_todos(project_path)
        updated_item = None
        for t in todos:
            if t.get('id') == todo_id:
                t['completed'] = bool(completed)
                updated_item = t
                break
        if updated_item is None:
            return jsonify(success=False, error="Todo not found"), 404
        _save_project_todos(project_path, todos)
        return jsonify(success=True, data=updated_item), 200
    else:
        # in-memory fallback
        # (For brevity, the inMemory DB only toggles in one go)
        existing = todo_db.update_todo(todo_id, completed)
        if not existing:
            return jsonify(success=False, error="Todo not found"), 404
        return jsonify(success=True, data=existing), 200

@todo_blueprint.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    project_path = request.args.get('projectPath', '').strip()
    if project_path:
        todos = _load_project_todos(project_path)
        filtered = [t for t in todos if t.get('id') != todo_id]
        if len(filtered) == len(todos):
            return jsonify(success=False, error="Todo not found"), 404
        _save_project_todos(project_path, filtered)
        return jsonify(success=True)
    else:
        todo_db.delete_todo(todo_id)
        return jsonify(success=True)
