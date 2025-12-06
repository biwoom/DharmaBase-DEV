console.log("📜 card.js loaded");

const initDharmaCard = () => {
    console.log("🌊 DharmaBase Kanban View Initializing...");
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
            try {
                const response = await fetch('../assets/dharma_index.json');
                if (!response.ok) throw new Error('Failed to load index');
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

                // 1. 시스템 파일 제외 (doc_type: system)
                // 2. 경로 의존성 제거
                // 3. [New] Merge User Status
                this.items = rawData
                    .filter(item => item.metadata.doc_type !== 'system')
                    .map(item => {
                        // Override status from LocalStorage
                        // Use item.id (url) as key
                        const userStatus = learningStatus[item.id];
                        if (userStatus) {
                            item.metadata.learning_status = userStatus;
                        } else {
                            // Default to '학습대기' if not set by user (ignoring frontmatter)
                            item.metadata.learning_status = '학습대기';
                        }
                        return item;
                    });

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

                // [New] Sort items within the group
                items.sort((a, b) => {
                    const orderA = a.metadata.order ?? 999;
                    const orderB = b.metadata.order ?? 999;
                    if (orderA !== orderB) return orderA - orderB;
                    return a.title.localeCompare(b.title);
                });

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
        },

        openReader(item) {
            window.dispatchEvent(new CustomEvent('open-slideover', {
                detail: {
                    url: '..' + item.id,
                    title: item.title
                }
            }));
        }
    }));
};

if (window.Alpine) {
    initDharmaCard();
} else {
    document.addEventListener('alpine:init', initDharmaCard);
}
