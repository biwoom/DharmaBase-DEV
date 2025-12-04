console.log("📜 card.js loaded");

document.addEventListener('alpine:init', () => {
    Alpine.data('dharmaCard', () => ({
        items: [],
        search: '',
        // 필터 상태 변수들
        statusFilter: 'all',
        showSummary: false,
        showTags: false,
        showKeywords: false,
        showStatus: false,
        showPart: false,
        isLoading: true,

        async init() {
            console.log("🌊 DharmaBase Kanban View Initializing...");
            try {
                const response = await fetch('../assets/dharma_index.json');
                if (!response.ok) throw new Error('Failed to load index');
                const rawData = await response.json();

                // 1. 시스템 파일 제외 (doc_type: system)
                // 2. 경로 의존성 제거
                this.items = rawData.filter(item => item.metadata.doc_type !== 'system');

            } catch (error) {
                console.error("데이터 로드 실패:", error);
            } finally {
                this.isLoading = false;
            }
        },

        // [New] Grouping Logic
        get groupedItems() {
            const groups = {};
            // 기존 filteredItems 로직을 내부에 통합하여 필터링된 결과만 그룹화
            const keyword = this.search.toLowerCase().trim();

            const filtered = this.items.filter(item => {
                // Status Filter
                if (this.statusFilter !== 'all' && item.metadata.learning_status !== this.statusFilter) return false;
                // Search Filter
                if (keyword === '') return true;
                const searchTarget = [
                    item.title,
                    item.metadata.chapter,
                    item.metadata.part,
                    item.metadata.summary,
                    (item.metadata.tags || []).join(' '),
                    (item.metadata.keywords || []).join(' ')
                ].join(' ').toLowerCase();
                return searchTarget.includes(keyword);
            });

            // Grouping by Chapter
            filtered.forEach(item => {
                const key = item.metadata.chapter || '미분류';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });

            // Sorting Logic (chapter_order 기반)
            const groupArray = Object.keys(groups).map(key => {
                const items = groups[key];
                // 그룹 내 아이템 중 가장 작은 chapter_order 값을 그룹의 순서로 채택
                const minOrder = items.reduce((min, item) => {
                    const order = item.metadata.chapter_order;
                    return (order !== undefined && order < min) ? order : min;
                }, 9999);

                return {
                    title: key,
                    items: items,
                    order: minOrder
                };
            });

            // 최종: 칼럼(그룹) 정렬
            return groupArray.sort((a, b) => a.order - b.order);
        },

        toggleAll() {
            const newState = !(this.showSummary && this.showTags && this.showKeywords && this.showPart && this.showStatus);
            this.showSummary = newState;
            this.showTags = newState;
            this.showKeywords = newState;
            this.showPart = newState;
            this.showStatus = newState;
        }
    }));
});
