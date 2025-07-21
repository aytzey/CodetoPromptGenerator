import os
import json
from typing import List, Dict, Optional
from pathlib import Path
from repositories.file_storage import FileStorageRepository
from services.service_exceptions import ServiceError, InvalidInputError, ResourceNotFoundError

class MetaPromptService:
    """Service for managing meta prompt files."""
    
    def __init__(self, storage_repo: FileStorageRepository):
        self.storage_repo = storage_repo
        # Meta prompts are stored in a special directory
        self.metaprompts_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            'metaprompts'
        )
        # Ensure the directory exists
        os.makedirs(self.metaprompts_dir, exist_ok=True)
    
    def list_metaprompts(self) -> List[str]:
        """List all available meta prompt files."""
        try:
            if not os.path.exists(self.metaprompts_dir):
                return []
            
            files = []
            for filename in os.listdir(self.metaprompts_dir):
                if filename.endswith('.txt') or filename.endswith('.md'):
                    files.append(filename)
            
            return sorted(files)
        except Exception as e:
            raise ServiceError(f"Failed to list metaprompts: {str(e)}")
    
    def load_metaprompt(self, filename: str) -> Dict[str, str]:
        """Load content of a specific meta prompt file."""
        if not filename:
            raise InvalidInputError("Filename cannot be empty")
        
        # Sanitize filename to prevent directory traversal
        filename = os.path.basename(filename)
        filepath = os.path.join(self.metaprompts_dir, filename)
        
        try:
            if not os.path.exists(filepath):
                raise ResourceNotFoundError(f"Meta prompt file '{filename}' not found")
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return {"content": content, "filename": filename}
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServiceError(f"Failed to load metaprompt: {str(e)}")
    
    def save_metaprompt(self, filename: str, content: str) -> Dict[str, str]:
        """Save a meta prompt file."""
        if not filename:
            raise InvalidInputError("Filename cannot be empty")
        if not content or not content.strip():
            raise InvalidInputError("Content cannot be empty")
        
        # Sanitize filename
        filename = os.path.basename(filename)
        
        # Ensure it has a proper extension
        if not filename.endswith('.txt') and not filename.endswith('.md'):
            filename += '.txt'
        
        filepath = os.path.join(self.metaprompts_dir, filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return {"message": f"Meta prompt saved as {filename}", "filename": filename}
        except Exception as e:
            raise ServiceError(f"Failed to save metaprompt: {str(e)}")
    
    def delete_metaprompt(self, filename: str) -> Dict[str, str]:
        """Delete a meta prompt file."""
        if not filename:
            raise InvalidInputError("Filename cannot be empty")
        
        # Sanitize filename
        filename = os.path.basename(filename)
        filepath = os.path.join(self.metaprompts_dir, filename)
        
        try:
            if not os.path.exists(filepath):
                raise ResourceNotFoundError(f"Meta prompt file '{filename}' not found")
            
            os.remove(filepath)
            return {"message": f"Meta prompt '{filename}' deleted successfully"}
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServiceError(f"Failed to delete metaprompt: {str(e)}")