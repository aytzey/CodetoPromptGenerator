# File: python_backend/app.py
# REFACTOR / OVERWRITE
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import refactored blueprints
from controllers.todo_controller import todo_blueprint
from controllers.project_controller import project_blueprint
from controllers.exclusions_controller import exclusions_blueprint
# from controllers.files_controller import files_blueprint  # REMOVED
from controllers.metaprompts_controller import metaprompts_blueprint
from controllers.resolve_folder_controller import resolve_blueprint
from controllers.token_count_controller import token_blueprint
from utils.response_utils import error_response # Import error response util

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s' # Improved format
)
logger = logging.getLogger(__name__)

def create_app(test_config=None):
    """Create and configure the Flask application"""
    load_dotenv() # Load .env file from project root or python_backend

    app = Flask(__name__, instance_relative_config=True)

    # Configuration
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret-key'), # Use a default
        # Add other configurations if needed
        # DATABASE=os.path.join(app.instance_path, 'database.sqlite'),
        DEBUG=os.environ.get('FLASK_DEBUG', 'True').lower() == 'true', # Ensure boolean comparison
    )

    if test_config is None:
        # Load the instance config, if it exists, when not testing
        # Can be used for production secrets
        app.config.from_pyfile('config.py', silent=True)
    else:
        # Load the test config if passed in
        app.config.from_mapping(test_config)

    # Ensure the instance folder exists (useful for SQLite DBs, logs, etc.)
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        logger.error(f"Could not create instance folder at {app.instance_path}")
        # Decide if this is fatal or not

    # Enable CORS - Make origin configurable via environment variable
    cors_origins = os.environ.get("CORS_ORIGINS", "*") # Default to allow all for dev
    logger.info(f"CORS enabled for origins: {cors_origins}")
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}) # Apply CORS only to /api/* routes

    # --- Error Handlers ---
    @app.errorhandler(400)
    def bad_request_error(error):
        logger.warning(f"Bad Request: {error.description}")
        # Use our standardized error response
        return error_response(error="Bad Request", message=error.description, status_code=400)

    @app.errorhandler(404)
    def not_found_error(error):
        logger.info(f"Not Found: {request.path}")
        return error_response(error="Not Found", message="The requested resource was not found.", status_code=404)

    @app.errorhandler(405)
    def method_not_allowed_error(error):
        logger.warning(f"Method Not Allowed: {request.method} for {request.path}")
        return error_response(error="Method Not Allowed", message="The method is not allowed for the requested URL.", status_code=405)

    @app.errorhandler(500)
    def internal_server_error(error):
        # Log the original exception if available
        logger.error(f"Internal Server Error: {error}", exc_info=True)
        return error_response(error="Internal Server Error", message="An unexpected error occurred on the server.", status_code=500)

    # Add handler for generic Exceptions to ensure JSON response
    @app.errorhandler(Exception)
    def handle_exception(e):
        # Pass through HTTPExceptions
        if isinstance(e, HTTPException):
            return e
        # Handle non-HTTP exceptions
        logger.error(f"Unhandled Exception: {e}", exc_info=True)
        return error_response(error="Internal Server Error", message=str(e), status_code=500)

    # --- Register Blueprints ---
    app.register_blueprint(todo_blueprint)
    app.register_blueprint(project_blueprint)
    app.register_blueprint(exclusions_blueprint)
    # app.register_blueprint(files_blueprint) # REMOVED
    app.register_blueprint(metaprompts_blueprint)
    app.register_blueprint(resolve_blueprint)
    app.register_blueprint(token_blueprint)

    # --- Health Check Endpoint ---
    @app.route('/health')
    def health_check():
        # Can add more checks here (e.g., database connectivity)
        return jsonify({"status": "healthy", "service": "python_backend"}), 200

    logger.info("Flask application initialized successfully.")
    return app

# --- Main Execution ---
# Moved from global scope into a function for clarity and potential reuse
def main():
    """Runs the Flask development server."""
    app = create_app()
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    # Ensure port is integer
    try:
        port = int(os.environ.get('FLASK_PORT', 5000))
    except ValueError:
        logger.warning("Invalid FLASK_PORT environment variable. Using default 5000.")
        port = 5000
    # Debug already handled by app.config['DEBUG']
    debug = app.config['DEBUG']

    logger.info(f"Starting Flask development server on http://{host}:{port}/ (Debug: {debug})")
    # Use Flask's built-in server for development
    # For production, use a WSGI server like Gunicorn or Waitress
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    main()