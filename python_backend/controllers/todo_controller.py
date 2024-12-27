# controllers/todo_controller.py
from flask import Blueprint, request, jsonify
from models.todo_model import InMemoryTodoDB

todo_db = InMemoryTodoDB()
todo_blueprint = Blueprint('todo_blueprint', __name__)

@todo_blueprint.route('/api/todos', methods=['GET'])
def list_todos():
    items = todo_db.list_todos()
    return jsonify(success=True, data=items)

@todo_blueprint.route('/api/todos', methods=['POST'])
def add_todo():
    payload = request.get_json() or {}
    text = payload.get('text', '').strip()
    if not text:
        return jsonify(success=False, message="Todo text is required."), 400
    
    new_item = todo_db.add_todo(text)
    return jsonify(success=True, data=new_item)

@todo_blueprint.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    todo_db.delete_todo(todo_id)
    return jsonify(success=True)
