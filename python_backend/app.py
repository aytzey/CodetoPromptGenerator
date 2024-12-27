# app.py

from flask import Flask
from flask_cors import CORS

# Import blueprints
from controllers.todo_controller import todo_blueprint
from controllers.project_controller import project_blueprint

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Register controllers as blueprints
    app.register_blueprint(todo_blueprint)
    app.register_blueprint(project_blueprint)

    return app

if __name__ == '__main__':
    app = create_app()
    # By default, run on localhost:5000
    app.run(host='127.0.0.1', port=5000, debug=True)
