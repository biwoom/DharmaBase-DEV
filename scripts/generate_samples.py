import os

# 데이터 정의
SAMPLES = [
    (1, "탄생", "룸비니", [
        ("부처님의 탄생게", "천상천하 유아독존...", ["자비", "보살"], ["룸비니", "마야부인"], "룸비니 동산에서 부처님이 탄생하시며 외친 사자후.", "학습대기"),
        ("아홉 마리 용의 관욕", "아홉 마리 용이 물을 뿜어...", ["청정", "축복"], ["구룡", "관욕"], "탄생 직후 아홉 마리 용이 아기 부처님을 씻겨주다.", "학습중")
    ]),
    (2, "출가", "사문유관", [
        ("동문에서 늙음을 보다", "태자가 동쪽 문으로 나가...", ["무상", "고뇌"], ["동문", "노인"], "화려한 궁궐 밖에서 늙음의 고통을 처음 목격하다.", "완료"),
        ("북문에서 수행자를 보다", "북쪽 문에서 수행자를 만나...", ["희망", "해탈"], ["북문", "사문"], "수행자의 평온한 모습에서 삶의 길을 찾다.", "학습대기")
    ]),
    (3, "수행", "고행림", [
        ("6년의 고행", "하루에 깨 한 톨...", ["인내", "정진"], ["설산", "고행"], "깨달음을 얻기 위해 극한의 고행을 감내하다.", "학습중"),
        ("수자타의 유미죽", "고행을 멈추고...", ["중도", "공양"], ["수자타", "유미죽"], "극단을 버리고 유미죽을 공양 받아 기력을 회복하다.", "학습대기")
    ]),
    (4, "성도", "보리수", [
        ("마왕의 유혹", "마왕 파순이...", ["항마", "지혜"], ["마왕", "파순"], "깨달음을 방해하는 마왕의 온갖 유혹을 물리치다.", "완료"),
        ("새벽 별을 보며", "동쪽 하늘의 샛별...", ["깨달음", "붓다"], ["샛별", "연기법"], "새벽 별을 보며 마침내 무상정등각을 이루다.", "완료")
    ]),
    (5, "전법", "녹야원", [
        ("초전법륜", "다섯 비구에게...", ["사성제", "팔정도"], ["녹야원", "오비구"], "옛 도반들에게 처음으로 진리의 수레바퀴를 굴리다.", "학습중"),
        ("야사의 귀의", "부호의 아들 야사...", ["귀의", "승가"], ["야사", "재가자"], "모든 속박에서 벗어나는 길을 가르쳐 제자로 받아들이다.", "학습대기")
    ])
]

def create_samples():
    base_dir = "docs/sutras"
    
    for ch_num, ch_title, part, articles in SAMPLES:
        # 챕터 디렉토리 생성
        dir_path = os.path.join(base_dir, f"chapter{ch_num}")
        os.makedirs(dir_path, exist_ok=True)
        
        for idx, (title, content, tags, keywords, summary, status) in enumerate(articles, 1):
            filename = f"article{ch_num}-{idx}.md"
            filepath = os.path.join(dir_path, filename)
            
            frontmatter = f"""---
title: "{title}"
chapter: "{ch_title}"
part: "{part}"
order: {idx}
division: "{ch_num}품"
volume: "{ch_num}권"
tags: {tags}
keywords: {keywords}
summary: "{summary}"
learning_status: "{status}"
---

# {title}

{content}
"""
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(frontmatter)
            print(f"Created: {filepath}")

if __name__ == "__main__":
    create_samples()
