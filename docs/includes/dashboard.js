
const initDbDashboard = () => {
    Alpine.data('dbDashboard', () => ({
        // Data Stores
        indexData: [],
        userData: { bookmarks: [], learning_status: {}, annotations: {} },

        // Aggregated Data
        libraryData: [],
        chartData: {
            chapters: [],
            series: [], // [{name: '대기', data: []}, ...]
            overall: { todo: 0, doing: 0, done: 0, total: 0 }
        },
        notebookData: [], // Flattened annotations
        chapterStats: [],
        statusStats: [],
        totalDocs: 0, // [New]

        // UI State
        isLoading: true,
        currentPage: 1,
        pageSize: 10,
        selectedIds: [], // Array for checkboxes

        // Chart Instances
        charts: {},

        async init() {
            console.log("📊 Dashboard Initializing...");
            await this.loadData();
            this.processData();
            this.isLoading = false;

            // Zensical Navigation Handler (Re-render on nav)
            if (window.document$) {
                window.document$.subscribe(() => {
                    // Re-process if needed, but usually Alpine re-inits on page load
                    console.log("🔄 Dashboard navigation update");
                });
            }
        },

        async loadData() {
            // 1. Fetch Metadata
            const paths = [
                '../assets/dharma_index.json', // Relative from /user/
                'assets/dharma_index.json',    // Relative from root
                '/assets/dharma_index.json',   // Absolute root
                '/DharmaBase-DEV/assets/dharma_index.json' // GH Pages / Sub-path
            ];

            let loaded = false;
            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        this.indexData = await response.json();
                        console.log(`✅ Dashboard loaded index from ${path} `);
                        loaded = true;
                        break;
                    }
                } catch (e) {
                    // Continue to next path
                }
            }

            if (!loaded) {
                console.error("❌ Dashboard failed to load dharma_index.json from any path");
                this.indexData = [];
            }

            // 2. Load User Data
            const stored = localStorage.getItem('db_user_data_v1');
            if (stored) {
                this.userData = JSON.parse(stored);
            } else {
                // Default empty structure
                this.userData = { bookmarks: [], learning_status: {}, annotations: {} };
            }
        },

        processData() {
            // A. Process Library (Bookmarks)
            // Join with indexData to get titles if missing
            this.libraryData = this.userData.bookmarks.map(b => {
                const meta = this.findMetadata(b.url);
                return {
                    url: b.url,
                    title: b.title || (meta ? meta.title : 'Unknown Document'),
                    chapter: b.chapter || (meta ? meta.chapter : 'Unknown Chapter'),
                    timestamp: b.timestamp,
                    // [New] Sort keys
                    chapter_order: meta ? (meta.metadata?.chapter_order ?? 999) : 999,
                    part: meta ? (meta.metadata?.part || '') : '',
                    order: meta ? (meta.metadata?.order ?? 999) : 999
                };
            }).sort((a, b) => {
                // 1. Chapter Order
                if (a.chapter_order !== b.chapter_order) {
                    return a.chapter_order - b.chapter_order;
                }
                // 2. Part (Group by Part)
                if (a.part !== b.part) {
                    return a.part.localeCompare(b.part);
                }
                // 3. Document Order
                if (a.order !== b.order) {
                    return a.order - b.order;
                }
                // 4. Title Fallback
                return a.title.localeCompare(b.title);
            });

            // B. Process Charts (Learning Status)
            // Group by Chapter
            const chapterMap = {}; // { "ChapterName": { todo: 0, doing: 0, done: 0 } }
            let totalDocs = 0;
            let statusCounts = { '학습대기': 0, '학습중': 0, '학습완료': 0 };

            // Initialize chapters from indexData
            this.indexData.forEach(doc => {
                if (doc.metadata?.doc_type === 'system') return;

                const chapter = doc.metadata?.chapter || '기타';
                const order = doc.metadata?.chapter_order ?? 999;

                if (!chapterMap[chapter]) {
                    chapterMap[chapter] = {
                        name: chapter,
                        todo: 0,
                        doing: 0,
                        done: 0,
                        total: 0,
                        order: 999
                    };
                }

                // Update minimum order for the chapter
                if (order < chapterMap[chapter].order) {
                    chapterMap[chapter].order = order;
                }

                // Get status
                const status = this.userData.learning_status[doc.id] || '학습대기';
                const statusKey = status === '학습대기' ? 'todo' : (status === '학습중' ? 'doing' : 'done');

                chapterMap[chapter][statusKey]++;
                chapterMap[chapter].total++;

                statusCounts[status]++;
                totalDocs++;
            });

            // Convert map to array and sort
            this.chapterStats = Object.values(chapterMap).sort((a, b) => a.order - b.order);

            // Overall Stats Array
            this.statusStats = [
                { label: '학습대기', count: statusCounts['학습대기'], id: 'todo' },
                { label: '학습중', count: statusCounts['학습중'], id: 'doing' },
                { label: '학습완료', count: statusCounts['학습완료'], id: 'done' }
            ];
            this.totalDocs = totalDocs; // [New] Expose total docs

            // C. Process Notebook (Annotations)
            // Flatten annotations object: { url: [notes] } -> [ { ...note, url, title } ]
            const flatNotes = [];
            Object.entries(this.userData.annotations).forEach(([url, notes]) => {
                const meta = this.findMetadata(url);
                notes.forEach(note => {
                    flatNotes.push({
                        ...note,
                        url: url,
                        docTitle: meta ? meta.title : 'Unknown Document',
                        chapter: meta ? (meta.metadata?.chapter || '기타') : 'Unknown Chapter',
                        isEditing: false,
                        editMemo: note.memo || ''
                    });
                });
            });

            // Sort by created_at desc
            this.notebookData = flatNotes.sort((a, b) => b.created_at - a.created_at);
        },

        findMetadata(url) {
            if (!this.indexData) return null;
            // Normalize URL: remove index.html, trailing slash
            const cleanUrl = url.replace(/\/index\.html$/, '').replace(/\/$/, '');

            return this.indexData.find(item => {
                const cleanItemUrl = item.id.replace(/\/index\.html$/, '').replace(/\/$/, '');

                // 1. Root handling
                if (cleanItemUrl === '' || cleanItemUrl === '/DharmaBase-DEV') {
                    return cleanUrl === '' || cleanUrl === '/DharmaBase-DEV';
                }

                // 2. Exact match (preferred)
                if (cleanUrl === cleanItemUrl) return true;

                // 3. Suffix match (handle site_url prefix)
                // Ensure we are matching a full path segment (start with /)
                if (cleanUrl.endsWith(cleanItemUrl)) {
                    // Check if it's a real suffix (e.g. /sutras/01 matches /sutras/01, but /othersutras/01 shouldn't match if logic was loose)
                    // But here cleanItemUrl usually starts with / (e.g. /sutras/...)
                    return true;
                }

                return false;
            });
        },

        // --- Charts ---
        destroyCharts() {
            Object.values(this.charts).forEach(chart => chart.destroy());
            this.charts = {};
        },

        // --- Notebook Table ---
        get paginatedNotebook() {
            const start = (this.currentPage - 1) * this.pageSize;
            return this.notebookData.slice(start, start + this.pageSize);
        },

        get totalPages() {
            return Math.ceil(this.notebookData.length / this.pageSize);
        },

        toggleSelection(id) {
            if (this.selectedIds.has(id)) {
                this.selectedIds.delete(id);
            } else {
                this.selectedIds.add(id);
            }
            // Force reactivity hack if needed, but Set usually works with Alpine if used carefully
            // Better to re-assign or use a reactive wrapper. 
            // Let's use a new Set to trigger reactivity
            this.selectedIds = new Set(this.selectedIds);
        },

        toggleAllSelection() {
            const pageIds = this.paginatedNotebook.map(n => n.id);
            const allSelected = pageIds.every(id => this.selectedIds.has(id));

            if (allSelected) {
                pageIds.forEach(id => this.selectedIds.delete(id));
            } else {
                pageIds.forEach(id => this.selectedIds.add(id));
            }
            this.selectedIds = new Set(this.selectedIds);
        },

        toggleEdit(note) {
            note.isEditing = !note.isEditing;
            if (!note.isEditing) {
                // Cancel: revert text
                note.editMemo = note.memo;
            }
        },

        saveNote(note) {
            // Update in userData
            const annotations = this.userData.annotations[note.url];
            const target = annotations.find(a => a.id === note.id);
            if (target) {
                target.memo = note.editMemo;
                note.memo = note.editMemo;
                note.isEditing = false;
                this.saveToStorage();
            }
        },

        deleteNote(note) {
            if (!confirm("삭제하시겠습니까?")) return;

            // Remove from userData
            this.userData.annotations[note.url] = this.userData.annotations[note.url].filter(a => a.id !== note.id);
            // Remove from flat list
            this.notebookData = this.notebookData.filter(n => n.id !== note.id);
            this.saveToStorage();
        },

        bulkDelete() {
            if (!confirm(`선택한 ${this.selectedIds.size}개 항목을 삭제하시겠습니까 ? `)) return;

            this.selectedIds.forEach(id => {
                // Find and remove
                // This is inefficient O(N^2) but fine for small user data
                for (const url in this.userData.annotations) {
                    this.userData.annotations[url] = this.userData.annotations[url].filter(a => a.id !== id);
                }
                this.notebookData = this.notebookData.filter(n => n.id !== id);
            });

            this.selectedIds.clear();
            this.saveToStorage();
        },

        bulkEdit() {
            this.selectedIds.forEach(id => {
                const note = this.notebookData.find(n => n.id === id);
                if (note) note.isEditing = true;
            });
        },

        saveToStorage() {
            localStorage.setItem('db_user_data_v1', JSON.stringify(this.userData));
            // Trigger global update if needed (e.g. for personalization.js to pick up changes?)
            // Ideally, we should dispatch an event or reload, but for now simple storage update is enough.
        },

        resetAllData() {
            if (confirm("정말로 모든 데이터를 초기화하시겠습니까?")) {
                localStorage.removeItem('db_user_data_v1');
                location.reload();
            }
        }
    }));
};

if (window.Alpine) {
    initDbDashboard();
} else {
    document.addEventListener('alpine:init', initDbDashboard);
}
