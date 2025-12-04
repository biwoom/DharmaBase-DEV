import os
from pathlib import Path

SOURCE_DIR = Path('/Users/damjin/Documents/DharmaBase/zensical-docs')
OUTPUT_FILE = SOURCE_DIR / 'zensical-docs.md'
EXCLUDE_DIRS = {'assets'}

def consolidate_docs():
    content_list = []
    
    # Walk through the directory
    for root, dirs, files in os.walk(SOURCE_DIR):
        # Modify dirs in-place to skip excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file.endswith('.md') and file != 'zensical-docs.md':
                file_path = Path(root) / file
                relative_path = file_path.relative_to(SOURCE_DIR)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        file_content = f.read()
                        
                    # Add header for each file
                    content_list.append(f"\n\n# File: {relative_path}\n\n")
                    content_list.append(file_content)
                    print(f"Processed: {relative_path}")
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")

    # Write consolidated content
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write("".join(content_list))
        print(f"✅ Successfully created {OUTPUT_FILE}")
    except Exception as e:
        print(f"Error writing output file: {e}")

if __name__ == "__main__":
    consolidate_docs()
