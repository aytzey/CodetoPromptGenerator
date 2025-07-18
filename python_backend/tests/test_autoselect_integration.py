"""
Integration tests for the autoselect service with focus on:
1. LLM structured calling correctness
2. Expected files being returned
3. RAG context effectiveness
"""

import pytest
import json
import os
from unittest.mock import Mock, patch, MagicMock
from services.autoselect_service import AutoselectService
from models.autoselect_request import AutoSelectRequest
from services.embeddings_service import EmbeddingsService


class TestAutoSelectIntegration:
    """Test the complete autoselect flow with LLM integration."""
    
    @pytest.fixture
    def mock_openrouter_response(self):
        """Mock a successful OpenRouter API response."""
        def _mock_response(selected_files, confidence=0.98, ask=None):
            return {
                "id": "test-id",
                "choices": [{
                    "message": {
                        "content": json.dumps({
                            "selected": selected_files,
                            "confidence": confidence,
                            "ask": ask or []
                        })
                    }
                }]
            }
        return _mock_response
    
    @pytest.fixture
    def test_project_files(self):
        """Sample project structure for testing."""
        return [
            # Frontend files
            "components/Button.tsx",
            "components/Modal.tsx", 
            "views/HomePage.tsx",
            "views/SettingsView.tsx",
            "hooks/useAuth.ts",
            "hooks/useHomePageLogic.ts",
            "stores/useAuthStore.ts",
            "lib/fileFilters.ts",
            
            # Backend files
            "python_backend/controllers/auth_controller.py",
            "python_backend/controllers/autoselect_controller.py",
            "python_backend/services/auth_service.py",
            "python_backend/services/autoselect_service.py",
            "python_backend/services/autoselect_heuristics.py",
            "python_backend/services/embeddings_service.py",
            "python_backend/models/user_model.py",
            "python_backend/models/autoselect_request.py",
            
            # Config files
            "package.json",
            "tsconfig.json",
            "python_backend/requirements.txt",
            ".env",
            
            # Non-text files (should be filtered out)
            "assets/logo.png",
            "assets/icon.svg",
            "docs/diagram.pdf"
        ]
    
    def test_llm_structured_calling_format(self, tmp_path, mock_openrouter_response):
        """Test that the LLM call follows the correct structure and schema."""
        # Setup
        service = AutoselectService()
        base_dir = str(tmp_path)
        
        # Create minimal file structure
        for f in ["app.py", "utils.py", "config.json"]:
            (tmp_path / f).write_text("test content")
        
        request = AutoSelectRequest(
            baseDir=base_dir,
            treePaths=["app.py", "utils.py", "config.json"],
            instructions="Select files for authentication feature",
            languages=["py"]
        )
        
        # Mock the HTTP client to capture the request
        captured_request = {}
        
        def mock_post(url, json=None, headers=None):
            captured_request.update({
                "url": url,
                "payload": json,
                "headers": headers
            })
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_openrouter_response(
                ["app.py", "utils.py"],
                confidence=0.95
            )
            return mock_response
        
        with patch('httpx.Client') as mock_client:
            mock_client.return_value.__enter__.return_value.post = mock_post
            
            # Execute
            selected, meta = service.autoselect_paths(request)
            
            # Verify request structure
            assert captured_request["url"] == "https://openrouter.ai/api/v1/chat/completions"
            
            payload = captured_request["payload"]
            assert payload["model"] == os.getenv("AUTOSELECT_MODEL", "meta-llama/llama-4-maverick:free")
            assert payload["temperature"] == 0
            assert payload["max_tokens"] == 800
            
            # Verify message structure
            messages = payload["messages"]
            assert len(messages) == 2
            assert messages[0]["role"] == "system"
            assert messages[1]["role"] == "user"
            
            # Verify schema enforcement
            assert "response_format" in payload
            assert payload["response_format"]["type"] == "json_schema"
            assert "json_schema" in payload["response_format"]
            
            schema = payload["response_format"]["json_schema"]["schema"]
            assert schema["type"] == "object"
            assert "selected" in schema["properties"]
            assert "confidence" in schema["properties"]
            assert "ask" in schema["properties"]
            
            # Verify response parsing
            assert len(selected) == 2
            assert "app.py" in selected
            assert meta["confidence"] == 0.95

    def test_expected_files_auth_scenario(self, tmp_path, mock_openrouter_response, test_project_files):
        """Test that auth-related files are correctly identified."""
        service = AutoselectService()
        base_dir = str(tmp_path)
        
        # Create test files
        for file_path in test_project_files:
            full_path = tmp_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Add relevant content for auth files
            if "auth" in file_path.lower():
                content = "class AuthService:\n    def login(self, username, password):\n        pass"
            elif "user" in file_path.lower():
                content = "class User:\n    username: str\n    password_hash: str"
            else:
                content = "// Generic file content"
            
            full_path.write_text(content)
        
        request = AutoSelectRequest(
            baseDir=base_dir,
            treePaths=[f for f in test_project_files if not any(f.endswith(ext) for ext in ['.png', '.svg', '.pdf'])],
            instructions="I need to implement user authentication with login and registration",
            languages=["py", "ts", "tsx"]
        )
        
        # Expected auth-related files
        expected_auth_files = [
            "python_backend/controllers/auth_controller.py",
            "python_backend/services/auth_service.py",
            "python_backend/models/user_model.py",
            "hooks/useAuth.ts",
            "stores/useAuthStore.ts"
        ]
        
        with patch('httpx.Client') as mock_client:
            mock_client.return_value.__enter__.return_value.post.return_value.status_code = 200
            mock_client.return_value.__enter__.return_value.post.return_value.json.return_value = mock_openrouter_response(
                expected_auth_files,
                confidence=0.96
            )
            
            selected, meta = service.autoselect_paths(request)
            
            # Verify auth files are selected
            assert set(selected) == set(expected_auth_files)
            assert meta["confidence"] == 0.96

    def test_expected_files_autoselect_improvement(self, tmp_path, mock_openrouter_response, test_project_files):
        """Test files for improving autoselect feature itself."""
        service = AutoselectService()
        base_dir = str(tmp_path)
        
        # Create test files
        for file_path in test_project_files:
            full_path = tmp_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            if "autoselect" in file_path:
                content = "def autoselect_paths(self, req):\n    # RAG implementation"
            elif "embeddings" in file_path:
                content = "class EmbeddingsService:\n    def embed(self, text):"
            else:
                content = "// Other content"
                
            full_path.write_text(content)
        
        request = AutoSelectRequest(
            baseDir=base_dir,
            treePaths=[f for f in test_project_files if not any(f.endswith(ext) for ext in ['.png', '.svg', '.pdf'])],
            instructions="Help me understand and improve the autoselect feature with RAG and embeddings",
            languages=["py"]
        )
        
        expected_files = [
            "python_backend/controllers/autoselect_controller.py",
            "python_backend/services/autoselect_service.py",
            "python_backend/services/autoselect_heuristics.py",
            "python_backend/services/embeddings_service.py",
            "python_backend/models/autoselect_request.py"
        ]
        
        with patch('httpx.Client') as mock_client:
            mock_client.return_value.__enter__.return_value.post.return_value.status_code = 200
            mock_client.return_value.__enter__.return_value.post.return_value.json.return_value = mock_openrouter_response(
                expected_files,
                confidence=0.99
            )
            
            selected, meta = service.autoselect_paths(request)
            
            assert set(selected) == set(expected_files)
            assert meta["confidence"] == 0.99

    def test_rag_context_in_prompt(self, tmp_path, test_project_files):
        """Test that RAG context is properly included in the prompt."""
        service = AutoselectService()
        base_dir = str(tmp_path)
        
        # Create files with specific content
        auth_service_content = """
class AuthService:
    def __init__(self, db):
        self.db = db
        
    def login(self, username, password):
        user = self.db.find_user(username)
        if user and check_password(password, user.password_hash):
            return generate_token(user)
        return None
        
    def register(self, username, password, email):
        # Implementation here
        pass
"""
        
        (tmp_path / "services").mkdir(exist_ok=True)
        (tmp_path / "services/auth_service.py").write_text(auth_service_content)
        
        request = AutoSelectRequest(
            baseDir=base_dir,
            treePaths=["services/auth_service.py"],
            instructions="Add password reset functionality",
            languages=["py"]
        )
        
        # Capture the prompt sent to LLM
        captured_prompt = None
        
        def mock_call_openrouter(self, prompt, timeout):
            nonlocal captured_prompt
            captured_prompt = prompt
            return {"selected": ["services/auth_service.py"], "confidence": 0.9}
        
        with patch.object(AutoselectService, '_call_openrouter', mock_call_openrouter):
            service.autoselect_paths(request)
            
            # Verify RAG context is in prompt
            assert captured_prompt is not None
            assert "### Code Intelligence (RAG Context)" in captured_prompt
            assert "#### File Summaries" in captured_prompt
            assert "#### Code Snippets" in captured_prompt
            
            # Should include function names from code analysis
            assert "login" in captured_prompt
            assert "register" in captured_prompt
            assert "AuthService" in captured_prompt

    def test_clarification_flow(self, tmp_path, mock_openrouter_response):
        """Test that clarification questions work correctly."""
        service = AutoselectService()
        base_dir = str(tmp_path)
        
        (tmp_path / "frontend.js").write_text("// Frontend code")
        (tmp_path / "backend.py").write_text("# Backend code")
        
        request = AutoSelectRequest(
            baseDir=base_dir,
            treePaths=["frontend.js", "backend.py"],
            instructions="Update the API",
            languages=["js", "py"]
        )
        
        # First call returns clarification questions
        with patch('httpx.Client') as mock_client:
            mock_client.return_value.__enter__.return_value.post.return_value.status_code = 200
            mock_client.return_value.__enter__.return_value.post.return_value.json.return_value = {
                "choices": [{
                    "message": {
                        "content": json.dumps({
                            "selected": [],
                            "confidence": 0.6,
                            "ask": [
                                "Do you want to update the REST API endpoints or GraphQL schema?",
                                "Which specific endpoints need updating?"
                            ]
                        })
                    }
                }]
            }
            
            selected, meta = service.autoselect_paths(request)
            
            assert "ask" in meta
            assert len(meta["ask"]) == 2
            assert meta["confidence"] == 0.6

    def test_semantic_similarity_ranking(self, tmp_path):
        """Test that semantic similarity properly influences file ranking."""
        service = AutoselectService()
        base_dir = str(tmp_path)
        
        # Create files with varying relevance
        files = {
            "auth/login_service.py": "class LoginService:\n    def authenticate(self, credentials):",
            "auth/password_reset.py": "def reset_password(email):\n    # Send reset email",
            "utils/email.py": "def send_email(to, subject, body):",
            "models/user.py": "class User:\n    email: str\n    password_hash: str",
            "unrelated/data_processor.py": "def process_csv(file_path):\n    # Process data"
        }
        
        for path, content in files.items():
            full_path = tmp_path / path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content)
        
        request = AutoSelectRequest(
            baseDir=base_dir,
            treePaths=list(files.keys()),
            instructions="Implement password reset functionality with email notifications",
            languages=["py"]
        )
        
        # Mock embeddings service to control similarity scores
        mock_embeddings = Mock(spec=EmbeddingsService)
        mock_embeddings._paths = []
        mock_embeddings.top_k.return_value = [
            "auth/password_reset.py",  # Most relevant
            "utils/email.py",          # Second most relevant
            "auth/login_service.py"    # Third
        ]
        
        with patch('services.autoselect_service.EmbeddingsService', return_value=mock_embeddings):
            # Test the heuristics ranking
            from services.autoselect_heuristics import rank_candidates
            
            ranked = rank_candidates(
                base_dir,
                list(files.keys()),
                request.instructions,
                lambda abs_path, rel_path: files.get(rel_path, ""),
                embedding_svc=mock_embeddings,
                keep_top=10
            )
            
            # Password reset should rank highest due to semantic match
            assert ranked[0] == "auth/password_reset.py"
            # Email utility should rank high due to relevance
            assert "utils/email.py" in ranked[:3]
            # Unrelated file should rank lower
            assert ranked.index("unrelated/data_processor.py") > ranked.index("auth/password_reset.py")

    def test_error_handling_and_fallbacks(self, tmp_path):
        """Test error handling in LLM calls and fallback mechanisms."""
        service = AutoselectService()
        base_dir = str(tmp_path)
        
        (tmp_path / "test.py").write_text("# Test file")
        
        request = AutoSelectRequest(
            baseDir=base_dir,
            treePaths=["test.py"],
            instructions="Test error handling",
            languages=["py"]
        )
        
        # Test malformed JSON response
        with patch('httpx.Client') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "choices": [{
                    "message": {
                        "content": "Invalid JSON {not valid}"  # Malformed
                    }
                }]
            }
            mock_client.return_value.__enter__.return_value.post.return_value = mock_response
            
            from services.service_exceptions import UpstreamServiceError
            
            with pytest.raises(UpstreamServiceError) as exc_info:
                service.autoselect_paths(request)
            
            assert "invalid JSON" in str(exc_info.value).lower()

    def test_file_filtering_excludes_non_text(self, tmp_path):
        """Test that non-text files are properly filtered out."""
        service = AutoselectService()
        base_dir = str(tmp_path)
        
        all_files = [
            "code.py",
            "script.js", 
            "image.png",
            "icon.svg",
            "document.pdf",
            "data.json",
            "config.yaml"
        ]
        
        for f in all_files:
            (tmp_path / f).write_text("dummy content")
        
        # Only text files should be in tree paths
        text_files = ["code.py", "script.js", "data.json", "config.yaml"]
        
        request = AutoSelectRequest(
            baseDir=base_dir,
            treePaths=text_files,  # Non-text files already filtered
            instructions="Select configuration files",
            languages=["py", "js"]
        )
        
        with patch('httpx.Client') as mock_client:
            mock_client.return_value.__enter__.return_value.post.return_value.status_code = 200
            mock_client.return_value.__enter__.return_value.post.return_value.json.return_value = {
                "choices": [{
                    "message": {
                        "content": json.dumps({
                            "selected": ["data.json", "config.yaml"],
                            "confidence": 0.95
                        })
                    }
                }]
            }
            
            selected, _ = service.autoselect_paths(request)
            
            # Verify only text files are selected
            for file in selected:
                assert not file.endswith(('.png', '.svg', '.pdf'))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])