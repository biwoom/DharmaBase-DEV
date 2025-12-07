import os
import json
import frontmatter
from pathlib import Path

import re

# 설정
DOCS_DIR = Path('docs')
OUTPUT_FILE = DOCS_DIR / 'assets' / 'dharma_index.json'

def generate_sort_key(file_path, root_dir, folder_info, meta):
    """
    Generate a hierarchical sort key string.
    Format: "{root_order:02d}-{sub_order:02d}-{file_order:03d}"
    Example: 
        - Root: 05_turning (5)
        - Sub: 12_dependent (12)
        - Files: order 1 
        => "05-12-001"
    """
    try:
        # Step 1: Root Chapter Order
        root_order = folder_info['order']
        
        # Step 2: Sub-folder Order
        # Find if there is any numbered folder between root chapter and file
        sub_order = 0
        current = file_path.parent
        
        # We need to find the specific subfolder relative to the root chapter folder
        # Logic: iterate from file's parent up to root_dir
        # But we need to be careful about which folder is "Root Chapter"
        # root_dir is 'docs'. 
        
        # Let's use the parts relative to DOCS_DIR
        relative_parts = file_path.relative_to(root_dir).parent.parts
        
        # relative_parts example: ('sutras', '05_turning', '12_dependent')
        # We assume strict structure: category / chapter / sub-chapter
        # But commonly we have: 05_turning / 12_dependent
        
        # Let's iterate parts and find the LAST numbered folder that is NOT the root chapter
        # Actually, simpler logic:
        # 1. We know 'root_order' comes from '05_turning'.
        # 2. We want to find if there is a '12_dependent' AFTER '05_turning'.
        
        for part in relative_parts:
            match = re.match(r"^(\d+)_(.+)$", part)
            if match:
                order = int(match.group(1))
                # If this order is NOT the root_order (or if it is, but we want the *second* one?)
                # Wait, root_order is the *first* match in top-down, or *last* match in bottom-up?
                # extract_chapter_info was top-level priority (so first match in path).
                
                # Let's rely on strict parsing of the path components:
                # We want the second numbered component if it exists.
                
                # Check if this part corresponds to the root chapter we identified
                if order != root_order:
                     # This might be a sub-chapter
                     # We take the *last* seen sub-chapter order as the sub_order
                     sub_order = order
                
                # What if root_order and sub_order are same? (Unlikely but possible)
                # Better approach: Collect ALL numbered parts.
                pass

        # Robust Approach: Collect all defined orders in path
        orders = []
        for part in relative_parts:
            match = re.match(r"^(\d+)_(.+)$", part)
            if match:
                orders.append(int(match.group(1)))
        
        # Assign Root and Sub based on collected orders
        if not orders:
            # No numbered folders
            s_root = 99
            s_sub = 0
        elif len(orders) == 1:
            # Only Root
            s_root = orders[0]
            s_sub = 0
        else:
            # Root and Sub(s). We take the first as Root, and the *last* as Sub (deepest)
            s_root = orders[0]
            s_sub = orders[-1]
            
        # Refine Root Order validation
        # extract_chapter_info logic: "Top-Level Priority" means it takes the first match?
        # Let's look at extract_chapter_info again.
        # It walks UP from file.parent to root.
        # It overwrites info. So the *last* overwrite (highest folder) wins?
        # No! `while current_path != root_dir`. It starts at file.parent.
        # It matches. Then moves to parent. Matches again.
        # The *last* set survives. The last set is the *highest* folder (closest to root).
        # So YES, extract_chapter_info returns the ROOT chapter info. Correct.
        
        # So s_root should be orders[0] (closest to root).
        
        # Step 3: File Order
        file_order = meta.get('order', 999)
        
        return f"{s_root:02d}-{s_sub:02d}-{file_order:03d}"
        
    except Exception as e:
        print(f"Sort Key Error {file_path}: {e}")
        return "99-00-999"

def extract_chapter_info(file_path, root_dir):
    """
    파일 경로에서 상위 폴더를 추적하여 정렬 정보를 추출
    Target Pattern: "01_birth", "02_renunciation" ...
    
    [수정 사항] 
    중첩된 폴더 구조일 경우, 가장 상위(Root에 가까운) 폴더의 정보를 우선합니다.
    예: /05_turning/12_dependent/1.md -> Returns 05_turning info
    """
    current_path = file_path.parent
    
    # 기본값 설정
    final_info = {'order': 999, 'folder_name': 'Uncategorized'}
    found_match = False
    
    while current_path != root_dir:
        # 패턴 매칭: 숫자_영문 (예: 01_birth)
        match = re.match(r"^(\d+)_(.+)$", current_path.name)
        
        if match:
            # 매칭되면 정보를 저장하되, 리턴하지 않고 계속 상위로 올라갑니다.
            # 상위 폴더에서 또 매칭되면 그것이 덮어씁니다. (Bottom-up 탐색이므로 상위가 나중에 덮어씀)
            # -> 수정: Bottom-up 탐색이므로 '가장 먼저 찾은 것(하위)'을 저장하고, 
            # -> '가장 나중에 찾은 것(상위)'으로 계속 업데이트 해야 합니다.
            
            final_info = {
                'order': int(match.group(1)),
                'folder_name': match.group(2)
            }
            found_match = True
            
        current_path = current_path.parent
        
    return final_info

def build_index():
    data = []
    
    # docs 폴더 내의 모든 md 파일 탐색
    # docs 폴더 내의 모든 md 파일 탐색 (정렬하여 순서 보장)
    for md_file in sorted(DOCS_DIR.rglob('*.md')):
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
            # [Update] 시스템 파일 및 Index 파일 경고 제외
            if md_file.name not in ['card_view.md', 'list_view.md', 'index.md', 'user.md'] and not md_file.name.endswith('index.md'):
                print(f"Warning: 'chapter' metadata missing in {md_file}. Using folder name.")
            
            meta['chapter'] = folder_info['folder_name']
        
        # [New] Generate Hierarchical Sort Key
        sort_key = generate_sort_key(md_file, DOCS_DIR, folder_info, meta)
        
        # URL ID 생성 (예: docs/sutras/chap1.md -> /sutras/chap1/)
        try:
            relative_path = md_file.relative_to(DOCS_DIR)
            url_id = f"/{relative_path.with_suffix('')}/"
            if url_id.endswith('/index/'): # index.md 처리
                url_id = url_id[:-6] 
                
            entry = {
                "id": url_id,
                "title": meta.get('title', md_file.stem),
                "sort_key": sort_key, # [New] Injected Key
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
