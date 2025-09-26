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
    """Generates a standardized error JSON response.

    NOTE: Older controller code sometimes called ``error_response(err, 404)``
    assuming the second positional argument was the status code. To remain
    backwards compatible we detect that usage and treat numeric ``message``
    values as the status code instead of the human readable message.
    """

    if isinstance(message, int) and status_code == 400:
        status_code = message
        message = None

    response = {"success": False, "error": error}
    if message:
        response["message"] = message

    return jsonify(response), status_code
