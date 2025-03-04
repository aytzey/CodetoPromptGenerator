# python_backend/controllers/token_count_controller.py

import re
from flask import Blueprint, request, jsonify

token_blueprint = Blueprint('token_blueprint', __name__)

@token_blueprint.route('/api/tokenCount', methods=['POST'])
def token_count():
    """
    Simple token count by splitting on whitespace + punctuation.
    Body: { text: "<string>" }
    """
    data = request.get_json() or {}
    text = data.get('text', '')
    if not isinstance(text, str):
        return jsonify(error='Missing or invalid text property.'), 400

    tokens = re.split(r"\s+|[,.;:!?()\[\]{}'\"<>]", text.strip())
    tokens = [t for t in tokens if t]
    special_chars = len(re.findall(r"[,.;:!?()\[\]{}'\"<>]", text))
    token_count = len(tokens) + special_chars

    return jsonify(tokenCount=token_count), 200
