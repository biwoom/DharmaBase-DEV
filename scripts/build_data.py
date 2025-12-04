import os
import json
import frontmatter
from pathlib import Path

import re

# 설정
DOCS_DIR = Path('docs')
OUTPUT_FILE = DOCS_DIR / 'assets' / 'dharma_index.json'

def extract_chapter_info(file_path, root_dir):
    """
    파일 경로에서 상위 폴더를 추적하여 정렬 정보를 추출
    Target Pattern: "01_birth", "02_renunciation" ...
    Returns: {'order': int, 'folder_name': str}
    """
    current_path = file_path.parent
    
    while current_path != root_dir:
        # 패턴 매칭: 숫자_영문 (예: 01_birth)
        match = re.match(r"^(\d+)_(.+)$", current_path.name)
        if match:
            return {
                'order': int(match.group(1)),
                'folder_name': match.group(2) # Fallback용 영문 이름
            }
        current_path = current_path.parent
        
    return {'order': 999, 'folder_name': 'Uncategorized'}

def build_index():
    data = []
    
    # docs 폴더 내의 모든 md 파일 탐색
    for md_file in DOCS_DIR.rglob('*.md'):
        # 메타데이터 파일이나 assets 내의 md는 제외
        if 'includes' in str(md_file) or 'assets' in str(md_file):
            continue
            
        post = frontmatter.load(md_file)
        meta = post.metadata
        
        # [Logic] 폴더 기반 정보 추출
        folder_info = extract_chapter_info(md_file, DOCS_DIR)
        
        # 1. Order 주입 (폴더의 숫자 우선 사용)
        if 'chapter_order' not in meta:
            meta['chapter_order'] = folder_info['order']
            
        # 2. Chapter 주입 (Frontmatter 필수, 없으면 폴더의 영문명 사용)
        if 'chapter' not in meta:
            # 시스템 파일 및 index.md는 경고 제외
            is_system_file = md_file.name in ['card.md', 'list.md', 'user.md', 'index.md']
            
            if not is_system_file:
                print(f"⚠️ Warning: 'chapter' metadata missing in {md_file}. Using folder name.")
            
            meta['chapter'] = folder_info['folder_name']
        
        # URL ID 생성 (예: docs/sutras/chap1.md -> /sutras/chap1/)
        try:
            relative_path = md_file.relative_to(DOCS_DIR)
            url_id = f"/{relative_path.with_suffix('')}/"
            if url_id.endswith('/index/'): # index.md 처리
                url_id = url_id[:-6] 
                
            entry = {
                "id": url_id,
                "title": meta.get('title', md_file.stem),
                "metadata": meta,
                # "content": post.content[:200] # 필요시 주석 해제
            }
            data.append(entry)
        except Exception as e:
            print(f"⚠️ Error processing {md_file}: {e}")

    # JSON 저장
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Build Complete: {len(data)} documents indexed to {OUTPUT_FILE}")

if __name__ == "__main__":
    build_index()
