#!/usr/bin/env python3
"""
Simple IPC wrapper that runs the Flask app and forwards HTTP requests via stdin/stdout
"""
import sys
import json
import logging
import requests
import threading
import time
from queue import Queue
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)

# Import and start the Flask app in a thread
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app

# Find an available port
import socket
def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port

# Suppress Flask's default output
import io
class SuppressOutput:
    def write(self, x): pass
    def flush(self): pass

# Start Flask in a thread
flask_port = find_free_port()
def run_flask():
    import werkzeug.serving
    werkzeug.serving.WSGIRequestHandler.log = lambda *args: None
    app.run(host='127.0.0.1', port=flask_port, debug=False, use_reloader=False)

flask_thread = threading.Thread(target=run_flask, daemon=True)
flask_thread.start()

# Wait for Flask to start
time.sleep(2)
base_url = f'http://127.0.0.1:{flask_port}'

def send_message(message):
    """Send a JSON message to stdout"""
    sys.stdout.write(json.dumps(message) + '\n')
    sys.stdout.flush()

def handle_request(request):
    """Forward requests to Flask via HTTP"""
    method = request.get('method')
    params = request.get('params', {})
    request_id = request.get('id')
    
    try:
        if method == 'http_forward':
            # Generic HTTP forwarding
            http_method = params.get('method', 'get').lower()
            path = params.get('path', '/')
            query_params = params.get('params', {})
            body = params.get('body', {})
            headers = params.get('headers', {})
            
            # Remove some headers that shouldn't be forwarded
            headers_to_forward = {k: v for k, v in headers.items() 
                                if k.lower() not in ['host', 'content-length']}
            
            url = f'{base_url}{path}'
            
            # Make the request
            if http_method == 'get':
                response = requests.get(url, params=query_params, headers=headers_to_forward)
            elif http_method == 'post':
                response = requests.post(url, json=body, params=query_params, headers=headers_to_forward)
            elif http_method == 'put':
                response = requests.put(url, json=body, params=query_params, headers=headers_to_forward)
            elif http_method == 'delete':
                response = requests.delete(url, params=query_params, headers=headers_to_forward)
            else:
                response = requests.request(http_method, url, json=body, params=query_params, headers=headers_to_forward)
            
            # Build response
            result = {
                'status': response.status_code,
                'headers': dict(response.headers)
            }
            
            try:
                result['json'] = response.json()
            except:
                result['text'] = response.text
                
            send_message({
                'type': 'response',
                'id': request_id,
                'result': result
            })
            
        else:
            raise ValueError(f"Unknown method: {method}")
            
    except Exception as e:
        logging.error(f"Error handling request: {e}")
        send_message({
            'type': 'response',
            'id': request_id,
            'error': str(e)
        })

# Send ready signal
send_message({'type': 'ready', 'port': flask_port})

# Main loop
try:
    while True:
        line = sys.stdin.readline()
        if not line:
            break
            
        line = line.strip()
        if not line:
            continue
            
        try:
            request = json.loads(line)
            handle_request(request)
        except json.JSONDecodeError as e:
            logging.error(f"Invalid JSON: {e}")
            
except KeyboardInterrupt:
    logging.info("Received interrupt signal")
except Exception as e:
    logging.error(f"Server error: {e}")