#!/usr/bin/env python3
import sys
import json
import logging
import traceback
from threading import Thread
from queue import Queue
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)

# Import your existing Flask app and services
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app
from services.project_service import ProjectService
from services.prompt_generation_service import PromptGenerationService
from services.file_content_service import FileContentService
from services.exclusion_service import get_default_exclusions as _get_default_exclusions
from services.auto_select_service import AutoSelectService
from services.token_count_service import TokenCountService

class IPCServer:
    def __init__(self):
        self.input_queue = Queue()
        self.output_queue = Queue()
        self.running = True
        
    def send_message(self, message):
        """Send a JSON message to stdout"""
        try:
            sys.stdout.write(json.dumps(message) + '\n')
            sys.stdout.flush()
        except Exception as e:
            logging.error(f"Failed to send message: {e}")
    
    def handle_request(self, request):
        """Route requests to appropriate handlers"""
        method = request.get('method')
        params = request.get('params', {})
        request_id = request.get('id')
        
        try:
            # Initialize services
            project_service = ProjectService()
            prompt_service = PromptGenerationService()
            file_service = FileContentService()
            autoselect_service = AutoSelectService()
            token_service = TokenCountService()
            
            # Map IPC methods to service methods
            if method == 'get_project_tree':
                result = project_service.get_tree(
                    params.get('project_path'),
                    params.get('exclusions', [])
                )
                
            elif method == 'generate_prompt':
                result = prompt_service.generate_prompt(
                    params.get('project_path'),
                    params.get('selected_files', []),
                    params.get('instructions', ''),
                    params.get('prompt_template', 'default'),
                    params.get('exclusions', [])
                )
                
            elif method == 'get_file_contents':
                result = file_service.get_file_contents(
                    params.get('project_path'),
                    params.get('file_paths', [])
                )
                
            elif method == 'auto_select':
                result = autoselect_service.auto_select(params)
                
            elif method == 'clarify_auto_selection':
                result = autoselect_service.clarify_selection(params)
                
            elif method == 'get_token_count':
                result = token_service.count_tokens(params.get('prompt', ''))
                
            elif method == 'get_default_exclusions':
                result = _get_default_exclusions()
                
            else:
                raise ValueError(f"Unknown method: {method}")
            
            self.send_message({
                'type': 'response',
                'id': request_id,
                'result': result
            })
            
        except Exception as e:
            logging.error(f"Error handling request: {e}")
            logging.error(traceback.format_exc())
            
            self.send_message({
                'type': 'response',
                'id': request_id,
                'error': str(e)
            })
    
    def input_reader(self):
        """Read JSON messages from stdin"""
        while self.running:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                    
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    request = json.loads(line)
                    self.input_queue.put(request)
                except json.JSONDecodeError as e:
                    logging.error(f"Invalid JSON: {e}")
                    
            except Exception as e:
                logging.error(f"Input reader error: {e}")
                break
                
        self.running = False
    
    def run(self):
        """Main server loop"""
        # Send ready signal
        self.send_message({'type': 'ready'})
        
        # Start input reader thread
        input_thread = Thread(target=self.input_reader, daemon=True)
        input_thread.start()
        
        # Process requests
        while self.running:
            try:
                request = self.input_queue.get(timeout=1)
                self.handle_request(request)
            except:
                continue
                
        logging.info("IPC server shutting down")

if __name__ == '__main__':
    # Disable buffering for real-time communication
    sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 1)
    sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', 1)
    
    server = IPCServer()
    
    try:
        server.run()
    except KeyboardInterrupt:
        logging.info("Received interrupt signal")
    except Exception as e:
        logging.error(f"Server error: {e}")
        logging.error(traceback.format_exc())