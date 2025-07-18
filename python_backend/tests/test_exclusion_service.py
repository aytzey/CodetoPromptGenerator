import json
from pathlib import Path

from services.exclusion_service import ExclusionService
from repositories.file_storage import FileStorageRepository


def test_global_exclusions_roundtrip(tmp_path, monkeypatch):
    # isolate global ignoreDirs.txt into tmp area
    root = tmp_path / "root"
    root.mkdir()
    monkeypatch.setattr(ExclusionService, "project_root", str(root), raising=False)

    svc = ExclusionService(FileStorageRepository())
    updated = svc.update_global_exclusions(["node_modules", "dist"])
    assert updated == ["node_modules", "dist"]
    assert svc.get_global_exclusions() == ["node_modules", "dist"]


def test_local_exclusions_roundtrip(tmp_path, file_repo):
    proj = tmp_path / "proj"
    proj.mkdir()

    svc = ExclusionService(file_repo)
    data = svc.update_local_exclusions(str(proj), ["*.log", "*.tmp"])
    assert "*.log" in data
    assert svc.get_local_exclusions(str(proj)) == ["*.log", "*.tmp"]


def test_empty_exclusions_list(tmp_path, file_repo):
    # Test with empty exclusions list
    proj = tmp_path / "proj"
    proj.mkdir()
    
    svc = ExclusionService(file_repo)
    data = svc.update_local_exclusions(str(proj), [])
    assert data == []
    assert svc.get_local_exclusions(str(proj)) == []


def test_duplicate_exclusions(tmp_path, file_repo):
    # Test with duplicate patterns
    proj = tmp_path / "proj"
    proj.mkdir()
    
    svc = ExclusionService(file_repo)
    data = svc.update_local_exclusions(str(proj), ["*.log", "*.log", "*.tmp", "*.log"])
    # Should remove duplicates
    assert data.count("*.log") == 1
    assert set(data) == {"*.log", "*.tmp"}


def test_special_characters_in_patterns(tmp_path, file_repo):
    # Test patterns with special characters
    proj = tmp_path / "proj"
    proj.mkdir()
    
    svc = ExclusionService(file_repo)
    patterns = ["[abc]*.txt", "file?.log", "path/*/test", "**/*.pyc", "file\\ with\\ spaces.txt"]
    data = svc.update_local_exclusions(str(proj), patterns)
    assert all(p in data for p in patterns)


def test_invalid_project_path(file_repo):
    # Test with non-existent project path
    svc = ExclusionService(file_repo)
    fake_path = "/this/path/does/not/exist"
    
    # Should still work as it creates the directory structure
    data = svc.update_local_exclusions(fake_path, ["*.log"])
    assert "*.log" in data


def test_very_long_pattern_list(tmp_path, file_repo):
    # Test with many patterns
    proj = tmp_path / "proj"
    proj.mkdir()
    
    svc = ExclusionService(file_repo)
    patterns = [f"pattern{i}.txt" for i in range(1000)]
    data = svc.update_local_exclusions(str(proj), patterns)
    assert len(data) == 1000
    assert svc.get_local_exclusions(str(proj)) == patterns


def test_unicode_patterns(tmp_path, file_repo):
    # Test with unicode patterns
    proj = tmp_path / "proj"
    proj.mkdir()
    
    svc = ExclusionService(file_repo)
    patterns = ["文件*.txt", "файл*.log", "αρχείο*.tmp", "😀*.emoji"]
    data = svc.update_local_exclusions(str(proj), patterns)
    assert all(p in data for p in patterns)


def test_whitespace_patterns(tmp_path, file_repo):
    # Test patterns with various whitespace
    proj = tmp_path / "proj"
    proj.mkdir()
    
    svc = ExclusionService(file_repo)
    patterns = ["file with spaces.txt", "file\twith\ttabs.log", "file\nwith\nnewlines.tmp"]
    data = svc.update_local_exclusions(str(proj), patterns)
    assert all(p in data for p in patterns)


def test_global_exclusions_persistence(tmp_path, monkeypatch):
    # Test that global exclusions persist across service instances
    root = tmp_path / "root"
    root.mkdir()
    monkeypatch.setattr(ExclusionService, "project_root", str(root), raising=False)
    
    # First instance
    svc1 = ExclusionService(FileStorageRepository())
    svc1.update_global_exclusions(["pattern1", "pattern2"])
    
    # Second instance should see the same data
    svc2 = ExclusionService(FileStorageRepository())
    assert svc2.get_global_exclusions() == ["pattern1", "pattern2"]


def test_local_exclusions_persistence(tmp_path, file_repo):
    # Test that local exclusions persist across service instances
    proj = tmp_path / "proj"
    proj.mkdir()
    
    # First instance
    svc1 = ExclusionService(file_repo)
    svc1.update_local_exclusions(str(proj), ["local1", "local2"])
    
    # Second instance should see the same data
    svc2 = ExclusionService(file_repo)
    assert svc2.get_local_exclusions(str(proj)) == ["local1", "local2"]


def test_exclusions_file_corruption(tmp_path, file_repo):
    # Test handling of corrupted exclusions file
    proj = tmp_path / "proj"
    proj.mkdir()
    
    svc = ExclusionService(file_repo)
    # Create valid exclusions first
    svc.update_local_exclusions(str(proj), ["*.log"])
    
    # Corrupt the file
    exclusions_file = proj / ".codetoprompt" / "exclusions.json"
    exclusions_file.write_text("not valid json")
    
    # Should handle gracefully
    exclusions = svc.get_local_exclusions(str(proj))
    # Depends on implementation - might return empty list or raise
    assert isinstance(exclusions, list)


def test_exclusions_with_null_values(tmp_path, file_repo):
    # Test that null/None values are handled
    proj = tmp_path / "proj"
    proj.mkdir()
    
    svc = ExclusionService(file_repo)
    # This might raise or filter out None values depending on implementation
    try:
        data = svc.update_local_exclusions(str(proj), ["valid", None, "*.log"])
        # If it doesn't raise, None should be filtered out
        assert None not in data
        assert "valid" in data
        assert "*.log" in data
    except (TypeError, ValueError):
        # Implementation might reject None values
        pass
