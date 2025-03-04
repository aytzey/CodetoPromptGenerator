# python_backend/app.py
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import the new blueprints
from controllers.todo_controller import todo_blueprint
from controllers.project_controller import project_blueprint
from controllers.exclusions_controller import exclusions_blueprint
from controllers.files_controller import files_blueprint
from controllers.metaprompts_controller import metaprompts_blueprint
from controllers.resolve_folder_controller import resolve_blueprint
from controllers.token_count_controller import token_blueprint

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(test_config=None):
    """Create and configure the Flask application"""
    load_dotenv()
    
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev'),
        DATABASE=os.path.join(app.instance_path, 'database.sqlite'),
        DEBUG=os.environ.get('FLASK_DEBUG', 'True') == 'True',
    )

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    # Ensure instance folder
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass

    # Enable CORS
    CORS(app, resources={r"/*": {"origins": os.environ.get("CORS_ORIGINS", "*")}})

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404
    
    @app.errorhandler(500)
    def server_error(error):
        logger.error(f"Server error: {error}")
        return jsonify({"error": "Internal server error"}), 500
    
    # Register all new controllers
    app.register_blueprint(todo_blueprint)
    app.register_blueprint(project_blueprint)
    app.register_blueprint(exclusions_blueprint)
    app.register_blueprint(files_blueprint)
    app.register_blueprint(metaprompts_blueprint)
    app.register_blueprint(resolve_blueprint)
    app.register_blueprint(token_blueprint)

    @app.route('/health')
    def health_check():
        return jsonify({"status": "healthy", "service": "python_backend"}), 200

    logger.info('Application initialized successfully')
    return app

def main():
    app = create_app()
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True') == 'True'
    
    logger.info(f'Starting application on {host}:{port} (debug={debug})')
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    main()
