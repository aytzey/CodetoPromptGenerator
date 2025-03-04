# models/todo_model.py

class InMemoryTodoDB:
    """
    A simple in-memory todo store. 
    If projectPath is provided, we skip this and use a file-based approach instead.
    """
    def __init__(self):
        self.todos = []
        # Add an initial sample item
        self.todos.append({ 'id': 1, 'text': 'Sample existing todo', 'completed': False })

    def list_todos(self):
        return self.todos

    def add_todo(self, text):
        import time
        new_id = int(time.time() * 1000)
        item = { 'id': new_id, 'text': text, 'completed': False }
        self.todos.append(item)
        return item

    def delete_todo(self, todo_id):
        self.todos = [t for t in self.todos if t['id'] != todo_id]

    def update_todo(self, todo_id, completed):
        for t in self.todos:
            if t['id'] == todo_id:
                t['completed'] = completed
                return t
        return None
