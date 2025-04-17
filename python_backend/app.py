from __future__ import annotations
import os
import logging

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException

# 👇  EKLENDİ
from utils.response_utils import error_response           # <-- **EK**
# -------------------------------------------------------
from controllers import all_blueprints
# -------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app(test_config=None):
    """Create and configure the Flask application."""
    load_dotenv()

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev‑secret‑key"),
        DEBUG=os.environ.get("FLASK_DEBUG", "True").lower() == "true",
    )

    if test_config is None:
        app.config.from_pyfile("config.py", silent=True)
    else:
        app.config.from_mapping(test_config)

    os.makedirs(app.instance_path, exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": r"http://localhost:*"}})


    # ───── JSON hata yakalayıcıları ───────────────────────────────────────────
    @app.errorhandler(404)
    def not_found_error(_):
        return error_response("Not Found", "The requested resource was not found.", 404)

    @app.errorhandler(400)
    def bad_request_error(e):
        return error_response("Bad Request", str(e), 400)

    @app.errorhandler(405)
    def method_not_allowed_error(_):
        return error_response("Method Not Allowed", "Method not allowed for this URL.", 405)

    @app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            return e
        logger.exception("Unhandled exception")
        return error_response("Internal Server Error", str(e), 500)

    # ───── Blueprint kayıtları ───────────────────────────────────────────────
    for bp in all_blueprints:
        app.register_blueprint(bp)

    @app.get("/health")
    def health():
        return jsonify({"status": "healthy"}), 200

    logger.info("Flask application initialized successfully.")
    return app


def main():
    app = create_app()
    app.run(
        host=os.environ.get("FLASK_HOST", "127.0.0.1"),
        port=int(os.environ.get("FLASK_PORT", 5000)),
        debug=app.config["DEBUG"],
    )


if __name__ == "__main__":
    main()
