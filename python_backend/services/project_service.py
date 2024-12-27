# services/project_service.py
import os

def get_project_tree(root_dir, ignore_file='ignoreDirs.txt'):
    """
    Recursively scan the root_dir and return a nested structure
    describing files and directories. Honors patterns in ignoreDirs.txt if present.
    """
    ignore_list = []
    ignore_path = os.path.join(root_dir, ignore_file)
    if os.path.exists(ignore_path):
        with open(ignore_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    ignore_list.append(line.replace('\\', '/'))

    tree = build_tree(root_dir, root_dir, ignore_list)
    return tree

def build_tree(current_dir, base_dir, ignored_dirs):
    items = []
    try:
        for entry in os.scandir(current_dir):
            entry_path = entry.path
            relative_path = os.path.relpath(entry_path, base_dir).replace('\\', '/')

            if is_excluded(relative_path, ignored_dirs):
                continue

            if entry.is_dir():
                children = build_tree(entry_path, base_dir, ignored_dirs)
                items.append({
                    'name': entry.name,
                    'relativePath': relative_path,
                    'type': 'directory',
                    'children': children,
                })
            else:
                items.append({
                    'name': entry.name,
                    'relativePath': relative_path,
                    'type': 'file',
                })
    except Exception as e:
        print(f"Error scanning {current_dir}: {e}")
    return items

def is_excluded(relative_path, ignored_dirs):
    for i in ignored_dirs:
        if relative_path == i or relative_path.startswith(i + '/'):
            return True
    return False
