document.addEventListener('alpine:init', () => {
    Alpine.data('dharmaList', () => ({
        // --- State ---
        allDocs: [],         // 전체 문서 데이터 (Raw Data)
        chapters: [],        // 추출된 챕터 목록 (탭 메뉴용)
        activeTab: '',       // 현재 활성화된 챕터
        searchQuery: '',     // 검색어
        sortKey: 'chapter_order', // 정렬 기준 키 (기본: 챕터 순서)
        sortAsc: true,       // 정렬 방향 (true: 오름차순, false: 내림차순)

        // --- Initialization ---
        async init() {
            try {
                // 데이터 로드
                const response = await fetch('../assets/dharma_index.json');
                if (!response.ok) throw new Error('Failed to load dharma_index.json');

                const rawData = await response.json();

                // Data Flattening & Filtering
                // 1. 시스템 파일 제외
                // 2. 메타데이터 평탄화 (metadata.* -> doc.*)
                this.allDocs = rawData
                    .filter(item => item.metadata.doc_type !== 'system')
                    .map(item => ({
                        url: item.id,
                        title: item.title,
                        chapter: item.metadata.chapter || 'Uncategorized',
                        chapter_order: item.metadata.chapter_order || 999,
                        status: item.metadata.learning_status || '학습대기',
                        tags: item.metadata.tags || [],
                        keywords: item.metadata.keywords || [],
                        summary: item.metadata.summary || '',
                        part: item.metadata.part || '',
                        // 필요한 경우 추가 필드 매핑
                    }));

                // 챕터 추출 및 정렬 (유니크한 값, Uncategorized 제외)
                const uniqueChapters = Array.from(new Set(this.allDocs.map(doc => doc.chapter)))
                    .filter(chapter => chapter !== 'Uncategorized');

                // 챕터 목록 정렬 로직 (chapter_order 기준)
                this.chapters = uniqueChapters.sort((a, b) => {
                    const docA = this.allDocs.find(d => d.chapter === a);
                    const docB = this.allDocs.find(d => d.chapter === b);
                    const orderA = docA ? docA.chapter_order : 999;
                    const orderB = docB ? docB.chapter_order : 999;
                    return orderA - orderB;
                });

                // 첫 번째 탭을 기본 활성화
                if (this.chapters.length > 0) {
                    this.activeTab = this.chapters[0];
                }

            } catch (error) {
                console.error('Error loading DharmaBase index:', error);
            }
        },

        // --- Actions ---
        setTab(chapter) {
            this.activeTab = chapter;
        },

        sort(key) {
            // 같은 키를 다시 클릭하면 정렬 방향 토글
            if (this.sortKey === key) {
                this.sortAsc = !this.sortAsc;
            } else {
                this.sortKey = key;
                this.sortAsc = true; // 새로운 키는 오름차순으로 시작
            }
        },

        openReader(doc) {
            // Slide-Over 호출을 위한 커스텀 이벤트 발생
            // slideover.js가 이 이벤트를 리스닝하고 있어야 함 (추후 구현 필요 시)
            // 현재는 단순 링크 이동으로 처리하거나, 추후 slideover 연동
            window.location.href = '..' + doc.url;
        },

        // --- Computed Logic ---
        get visibleDocs() {
            // 1. 탭 필터링 (현재 선택된 챕터의 문서만)
            let docs = this.allDocs.filter(doc => doc.chapter === this.activeTab);

            // 2. 검색어 필터링 (Multi-keyword AND condition)
            if (this.searchQuery.trim()) {
                const keywords = this.searchQuery.toLowerCase().split(/\s+/).filter(k => k);

                docs = docs.filter(doc => {
                    const searchableText = [
                        doc.title,
                        doc.chapter,
                        doc.status,
                        doc.part,
                        ...doc.tags,
                        doc.summary
                    ].join(' ').toLowerCase();

                    return keywords.every(keyword => searchableText.includes(keyword));
                });
            }

            // 3. 정렬 적용
            return docs.sort((a, b) => {
                let valA = a[this.sortKey];
                let valB = b[this.sortKey];

                if (valA === undefined) valA = '';
                if (valB === undefined) valB = '';

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return this.sortAsc ? valA - valB : valB - valA;
                }

                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();

                if (valA < valB) return this.sortAsc ? -1 : 1;
                if (valA > valB) return this.sortAsc ? 1 : -1;
                return 0;
            });
        }
    }));
});
