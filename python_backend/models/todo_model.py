# models/todo_model.py

class InMemoryTodoDB:
    """
    A simple in-memory todo store. Replace with a real DB if needed.
    """
    def __init__(self):
        self.todos = []
        # Add an initial sample item
        self.todos.append({ 'id': 1, 'text': 'Sample existing todo' })

    def list_todos(self):
        return self.todos

    def add_todo(self, text):
        import time
        new_id = int(time.time() * 1000)  # or any other ID generation
        item = { 'id': new_id, 'text': text }
        self.todos.append(item)
        return item

    def delete_todo(self, todo_id):
        self.todos = [t for t in self.todos if t['id'] != todo_id]
