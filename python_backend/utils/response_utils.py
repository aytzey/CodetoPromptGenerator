# File: python_backend/utils/response_utils.py
# NEW FILE
from flask import jsonify

def success_response(data=None, message=None, status_code=200):
    """Generates a standardized success JSON response."""
    response = {"success": True}
    if data is not None:
        response["data"] = data
    if message:
        response["message"] = message
    return jsonify(response), status_code

def error_response(error, message="An error occurred", status_code=400):
    """Generates a standardized error JSON response."""
    response = {"success": False, "error": error, "message": message}
    return jsonify(response), status_code