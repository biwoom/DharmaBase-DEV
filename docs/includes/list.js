const initDharmaList = () => {
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

                // Load User Data
                let userData = {};
                try {
                    const stored = localStorage.getItem('db_user_data_v1');
                    if (stored) userData = JSON.parse(stored);
                } catch (e) {
                    console.error("Failed to load user data", e);
                }
                const learningStatus = userData.learning_status || {};

                // Data Flattening & Filtering
                // 1. 시스템 파일 제외
                // 2. 메타데이터 평탄화 (metadata.* -> doc.*)
                // 3. [New] Merge User Status
                this.allDocs = rawData
                    .filter(item => item.metadata.doc_type !== 'system')
                    .map(item => {
                        // Determine Status
                        const userStatus = learningStatus[item.id] || '학습대기';

                        return {
                            url: item.id,
                            title: item.title,
                            chapter: item.metadata.chapter || 'Uncategorized',
                            chapter_order: item.metadata.chapter_order || 999,
                            status: userStatus, // Use merged status
                            tags: item.metadata.tags || [],
                            keywords: item.metadata.keywords || [],
                            summary: item.metadata.summary || '',
                            part: item.metadata.part || '',
                            order: item.metadata.order || 999,
                            sort_key: item.sort_key || '99-00-999' // [New]
                        };
                    });

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
            // Dispatch event for slide-over reader
            // Note: doc.url is relative (e.g., /sutras/...), we might need to adjust based on base path
            // Assuming doc.url comes from dharma_index.json which has site-relative paths

            // Construct full relative path from current page location if needed, 
            // but fetch() works well with root-relative paths if served correctly.
            // Let's try passing the doc.url directly first.

            // We need to handle the case where we are in /list_view/ (if it's a folder) or root.
            // doc.url usually starts with /

            // Dispatch event
            window.dispatchEvent(new CustomEvent('open-slideover', {
                detail: {
                    url: '..' + doc.url, // Adjusting path relative to list_view.md location? 
                    // list_view.md is in root docs/, so '..' might go up to parent of site?
                    // list_view.md is rendered at /list_view/ usually?
                    // If list_view.md is at root, doc.url (e.g. /sutras/...) should be fine as '.' + doc.url?
                    // Let's check how zensical serves. 
                    // Zensical serves /list_view/ usually.
                    // So '..' takes us to root, then + doc.url works.
                    title: doc.title
                }
            }));
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

                // Primary Sort
                if (valA !== valB) {
                    if (typeof valA === 'number' && typeof valB === 'number') {
                        return this.sortAsc ? valA - valB : valB - valA;
                    }
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                    if (valA < valB) return this.sortAsc ? -1 : 1;
                    if (valA > valB) return this.sortAsc ? 1 : -1;
                }

                // If primary sort keys are equal (rare for unique sort_key, but possible for other cols)
                // Use sort_key as ultimate tie-breaker
                if (this.sortKey !== 'sort_key') {
                    if (a.sort_key < b.sort_key) return -1;
                    if (a.sort_key > b.sort_key) return 1;
                    return 0;
                }

                return 0;
            });
        }
    }));
};

if (window.Alpine) {
    initDharmaList();
} else {
    document.addEventListener('alpine:init', initDharmaList);
}
