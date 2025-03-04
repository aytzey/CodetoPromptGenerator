# app.py
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import blueprints
from controllers.todo_controller import todo_blueprint
from controllers.project_controller import project_blueprint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(test_config=None):
    """Create and configure the Flask application"""
    # Load environment variables from .env file if it exists
    load_dotenv()
    
    # Create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    
    # Set default configuration
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev'),
        DATABASE=os.path.join(app.instance_path, 'database.sqlite'),
        DEBUG=os.environ.get('FLASK_DEBUG', 'True') == 'True',
    )

    if test_config is None:
        # Load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # Load the test config if passed in
        app.config.from_mapping(test_config)

    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Initialize CORS with appropriate settings
    CORS(app, resources={r"/*": {"origins": os.environ.get("CORS_ORIGINS", "*")}})
    
    # Register error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404
    
    @app.errorhandler(500)
    def server_error(error):
        logger.error(f"Server error: {error}")
        return jsonify({"error": "Internal server error"}), 500
    
    # Register controllers as blueprints
    app.register_blueprint(todo_blueprint)
    app.register_blueprint(project_blueprint)
    
    # Simple route to check if the app is running
    @app.route('/health')
    def health_check():
        return jsonify({"status": "healthy", "service": "python_backend"}), 200
    
    logger.info('Application initialized successfully')
    return app

def main():
    """Run the application"""
    app = create_app()
    
    # Get host and port from environment variables or use defaults
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True') == 'True'
    
    logger.info(f'Starting application on {host}:{port} (debug={debug})')
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    main()