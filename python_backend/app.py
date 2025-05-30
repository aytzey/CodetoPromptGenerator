from __future__ import annotations

# ---------------------------------------------------------------------------
# 🐍 Python 3.9 compatibility shim
# ---------------------------------------------------------------------------
import sys, dataclasses
if sys.version_info < (3, 10):          # Python < 3.10 has no dataclass slots
    _orig_dataclass = dataclasses.dataclass

    def _safe_dataclass(*args, **kwargs):        # strip unsupported kwarg
        kwargs.pop("slots", None)
        return _orig_dataclass(*args, **kwargs)

    dataclasses.dataclass = _safe_dataclass      # type: ignore[attr-defined]

# ---------------------------------------------------------------------------
# standard library
# ---------------------------------------------------------------------------
import os
import logging

# Ensure the parent directory of app.py (which is python_backend)
# is at the beginning of sys.path, so modules like 'controllers', 'services', etc.
# can be imported directly. This makes imports more robust.
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# third‑party
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv # <-- Import load_dotenv
from werkzeug.exceptions import HTTPException

# local
# These imports now rely on 'current_dir' being in sys.path
from utils.response_utils import error_response
from controllers import all_blueprints

# --- Load environment variables from .env file ---
# This should be called as early as possible
load_dotenv()
# -------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app(test_config=None):
    """Create and configure the Flask application."""
    # load_dotenv() # Moved to top level for earlier access

    flask_app = Flask(__name__, instance_relative_config=True) # Renamed to flask_app to avoid conflict
    flask_app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev‑secret‑key"),
        DEBUG=os.environ.get("FLASK_DEBUG", "True").lower() == "true",
    )

    if test_config is None:
        flask_app.config.from_pyfile("config.py", silent=True)
    else:
        flask_app.config.from_mapping(test_config)

    os.makedirs(flask_app.instance_path, exist_ok=True)

    # ────────────────────────────────────────────────────────────────────
    # CORS – allow localhost **and** 127.0.0.1 on any port for /api/*
    # ────────────────────────────────────────────────────────────────────
    CORS(
        flask_app,
        resources={r"/api/*": {"origins": [r"http://localhost:*", r"http://127.0.0.1:*"]}},
        supports_credentials=False,
    )

    # ───── JSON error handlers ─────────────────────────────────────────
    @flask_app.errorhandler(404)
    def not_found_error(_):
        return error_response("Not Found", "The requested resource was not found.", 404)

    @flask_app.errorhandler(400)
    def bad_request_error(e):
        # If the exception has a description attribute (like Werkzeug exceptions), use it
        description = getattr(e, 'description', str(e))
        return error_response("Bad Request", description, 400)

    @flask_app.errorhandler(405)
    def method_not_allowed_error(_):
        return error_response("Method Not Allowed", "Method not allowed for this URL.", 405)

    @flask_app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            # Use the description from the HTTPException if available
            description = getattr(e, 'description', str(e))
            return error_response(e.name, description, e.code)
        logger.exception("Unhandled exception")
        return error_response("Internal Server Error", str(e), 500)

    # ───── Blueprint registration ──────────────────────────────────────
    for bp in all_blueprints:
        flask_app.register_blueprint(bp)

    @flask_app.get("/health")
    def health():
        return jsonify({"status": "healthy"}), 200

    logger.info("Flask application initialized successfully.")
    logger.info(f"Debug mode: {flask_app.config['DEBUG']}")
    # Log the API key presence (but not the key itself!)
    logger.info(f"OpenRouter API Key Loaded: {'Yes' if os.getenv('OPENROUTER_API_KEY') else 'No'}")
    return flask_app

# Create the Flask app instance at the module level for Gunicorn
app = create_app()

def main():
    # For development, app.run() is used.
    # For production with Gunicorn, Gunicorn will use the 'app' instance defined above.
    app.run(
        host=os.environ.get("FLASK_HOST", "127.0.0.1"),
        port=int(os.environ.get("FLASK_PORT", 5010)),
        debug=app.config["DEBUG"],
    )


if __name__ == "__main__":
    main()