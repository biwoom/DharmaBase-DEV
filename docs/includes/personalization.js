console.log("🔖 personalization.js loaded");

const DB_STORAGE_KEY = 'db_user_data_v1';

const Personalization = {
    data: {
        bookmarks: [],
        learning_status: {}, // [New] Map: url -> status string
        annotations: {}
    },
    indexData: null, // Cache for dharma_index.json

    async init() {
        this.loadData();
        await this.loadIndexData(); // Load index for metadata
        this.injectBookmarkButton();
        this.injectStatusControls(); // [New] Inject status buttons
        this.initSelectionEngine(); // [New] Init Highlight Selection
        this.injectFloatingMenu(); // [New] Inject UI Component
        this.initUI(); // [New] Init UI Event Delegation
        this.renderHighlights(); // [New] Render saved highlights
        this.updateBookmarkUI();

        if (window.Alpine) {
            console.log("✅ Alpine.js is loaded");
        } else {
            console.warn("⚠️ Alpine.js not found in window (yet)");
        }

        // Zensical Instant Navigation Support
        if (window.document$) {
            window.document$.subscribe(() => {
                console.log("🔄 Page navigation detected");
                // Reset UI State
                window.dispatchEvent(new CustomEvent('db-close-menu')); // [New] Close menu on nav

                // Re-inject button as content is replaced
                this.injectBookmarkButton();
                this.injectStatusControls(); // [New] Re-inject status buttons
                this.injectFloatingMenu(); // [New] Ensure menu exists
                this.renderHighlights(); // [New] Re-render highlights
                this.updateBookmarkUI();

                // Re-attach Selection Listeners (Content is replaced)
                this.initSelectionEngine(); // [New] Re-init selection engine
                this.initUI(); // [New] Re-init UI delegation
            });
        }
    },

    // ... (existing methods) ...

    injectFloatingMenu() {
        if (document.querySelector('.db-floating-menu')) return;

        console.log("💉 Injecting Floating Menu...");

        const menuHTML = `
            <div x-data="{
                isOpen: false,
                uuid: null,
                top: 0,
                left: 0,
                memo: '',
                mode: 'menu',

                init() {
                    console.log('🌵 Alpine Floating Menu Initialized');
                    // Close on click outside
                    document.addEventListener('click', (e) => {
                        if (this.isOpen && !this.$el.contains(e.target) && !e.target.closest('.db-highlight')) {
                            this.handleClose();
                        }
                    });
                },

                handleOpen(e) {
                    console.log('🌵 Alpine received event:', e.detail);
                    this.uuid = e.detail.uuid;
                    this.memo = e.detail.memo || '';
                    this.top = e.detail.top;
                    this.left = e.detail.left;
                    this.mode = 'menu';
                    this.isOpen = true;
                },
                
                handleClose() {
                    this.isOpen = false;
                    this.mode = 'menu';
                },

                save() {
                    if (window.Personalization) {
                        window.Personalization.saveMemo(this.uuid, this.memo);
                        this.isOpen = false;
                    }
                },

                remove() {
                    if (window.Personalization) {
                        window.Personalization.removeAnnotation(this.uuid);
                        this.isOpen = false;
                    }
                }
            }"
            @db-open-menu.window="handleOpen($event)"
            @db-close-menu.window="handleClose()"
            class="db-floating-menu"
            x-show="isOpen"
            :class="{ 'db-floating-menu--mobile': window.innerWidth <= 768 }"
            :style="window.innerWidth > 768 ? \`top: \${top}px; left: \${left}px\` : ''"
            style="display: none;"
            x-transition>
                
                <!-- Close Button -->
                <button @click="handleClose()" class="db-menu-close-btn" aria-label="Close">
                    &times;
                </button>

                <!-- Mode: Menu -->
                <div x-show="mode === 'menu'" class="db-menu-actions">
                    <button @click="mode = 'memo'" class="db-menu-btn" aria-label="Add Memo">
                        📝 메모
                    </button>
                    <button @click="remove()" class="db-menu-btn db-menu-btn--danger" aria-label="Delete Highlight">
                        🗑️ 삭제
                    </button>
                </div>

                <!-- Mode: Memo -->
                <div x-show="mode === 'memo'" class="db-memo-editor">
                    <textarea x-model="memo" placeholder="메모를 입력하세요..." rows="3"></textarea>
                    <div class="db-memo-actions">
                        <button @click="mode = 'menu'" class="db-menu-btn">취소</button>
                        <button @click="save()" class="db-menu-btn db-menu-btn--primary">저장</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', menuHTML);
    },

    initUI() {
        // Event Delegation for Highlight Click
        const content = document.querySelector('.md-content');
        if (!content) return;

        console.log("🖱️ UI Event Delegation Initialized");

        content.addEventListener('click', (e) => {
            const highlight = e.target.closest('.db-highlight');
            if (highlight) {
                console.log("🖱️ Highlight Clicked:", highlight.dataset.id);
                e.stopPropagation(); // Prevent document click (which closes menu)
                this.openMenu(highlight);
            }
        });
    },

    initSelectionEngine() {
        const content = document.querySelector('.md-content');
        if (!content) return;

        // Mouseup event to detect selection
        content.addEventListener('mouseup', (e) => this.handleSelection(e, window.getSelection()));

        // Clear selection/button on click elsewhere
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.db-temp-highlight-btn')) {
                this.removeTempHighlightBtn();
            }
        });
    },

    // ... (existing methods) ...

    injectStatusControls() {
        // Exclude system pages
        const currentUrl = this.getNormalizedUrl();
        const systemPaths = ['/card_view/', '/list_view/', '/user/'];

        if (systemPaths.some(path => currentUrl.endsWith(path))) {
            return;
        }

        const isRoot = currentUrl === '/' ||
            currentUrl === '/DharmaBase-DEV/' ||
            currentUrl.endsWith('/index.html');

        if (isRoot) return;

        // Target: .md-content__inner, append at bottom
        const contentInner = document.querySelector('.md-content__inner');
        if (!contentInner) return;

        // Check if already injected
        if (document.querySelector('.db-status-controls')) return;

        const container = document.createElement('div');
        container.className = 'db-status-controls';

        // Left: Status Buttons
        const leftGroup = document.createElement('div');
        leftGroup.className = 'db-status-group';

        const statuses = ['학습대기', '학습중', '학습완료'];
        statuses.forEach(status => {
            const btn = document.createElement('button');
            btn.textContent = status;
            btn.dataset.status = status;
            btn.className = 'db-status-btn';
            btn.onclick = () => this.setLearningStatus(status);
            leftGroup.appendChild(btn);
        });

        // Right: Stats
        const rightGroup = document.createElement('div');
        rightGroup.className = 'db-stats-group';
        rightGroup.innerHTML = `
            <span class="db-stat-badge" id="db-stat-highlight">하이라이트 0</span>
            <span class="db-stat-badge" id="db-stat-memo">메모 0</span>
        `;

        container.appendChild(leftGroup);
        container.appendChild(rightGroup);
        contentInner.appendChild(container);

        this.updateStatusUI();
        this.renderStats(); // Initial render
    },

    renderStats() {
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const highlights = this.data.annotations && this.data.annotations[currentUrl] ? this.data.annotations[currentUrl] : [];

        const highlightCount = highlights.length;
        const memoCount = highlights.filter(h => h.memo && h.memo.trim() !== '').length;

        const hlBadge = document.getElementById('db-stat-highlight');
        const memoBadge = document.getElementById('db-stat-memo');

        if (hlBadge) hlBadge.textContent = `하이라이트 ${highlightCount}`;
        if (memoBadge) memoBadge.textContent = `메모 ${memoCount}`;
    },

    // Update renderStats calls
    saveHighlight(data) {
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        if (!this.data.annotations) this.data.annotations = {};
        if (!this.data.annotations[currentUrl]) this.data.annotations[currentUrl] = [];

        this.data.annotations[currentUrl].push(data);
        this.saveData();
        console.log("Highlight saved:", data);
        this.renderStats(); // Update stats
    },

    saveMemo(uuid, memo) {
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const highlights = this.data.annotations[currentUrl];
        if (!highlights) return;

        const highlight = highlights.find(h => h.id === uuid);
        if (highlight) {
            highlight.memo = memo;
            this.saveData();
            console.log("Memo saved:", uuid);

            // Re-render to update UI (e.g. add underline)
            // Optimization: Just toggle class if we had the element reference, 
            // but re-rendering is safer for consistency.
            // Actually, renderHighlights is idempotent-ish but might be heavy.
            // Let's just update the specific element class for now?
            // No, renderHighlights handles the 'db-has-memo' class logic.
            this.renderHighlights();
            this.renderStats(); // Update stats
        }
    },

    removeAnnotation(uuid) {
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const highlights = this.data.annotations[currentUrl];
        if (!highlights) return;

        // Remove from data
        this.data.annotations[currentUrl] = highlights.filter(h => h.id !== uuid);
        this.saveData();

        // Remove from DOM
        const elements = document.querySelectorAll(`.db-highlight[data-id="${uuid}"]`);
        elements.forEach(el => {
            // Unwrap
            const parent = el.parentNode;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
        });

        this.renderStats(); // Update stats
    },

    handleSelection(e, selection) { // Modified to accept event and selection
        // [New] Exclude system pages
        const currentPath = window.location.pathname;
        const systemPaths = ['/card_view/', '/list_view/', '/user/'];

        console.log("🖱️ handleSelection called. Path:", currentPath);

        if (systemPaths.some(path => currentPath.includes(path))) {
            console.log("🚫 System page detected, ignoring selection.");
            return;
        }

        if (selection.isCollapsed) {
            this.removeTempHighlightBtn();
            return;
        }

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;

        // Ensure selection is within .md-content
        const contentArea = document.querySelector('.md-content');
        if (!contentArea.contains(container)) return;

        // Check for overlap with existing highlights
        // 1. Check if start or end is inside a highlight
        if (range.startContainer.parentElement.closest('.db-highlight') ||
            range.endContainer.parentElement.closest('.db-highlight')) {
            console.log("🚫 Overlap detected (start/end), ignoring.");
            this.removeTempHighlightBtn();
            return;
        }

        // 2. Check if range spans across any existing highlights
        const blockSelector = 'p, li, h1, h2, h3, h4, h5, h6, td, th, div';
        const block = container.nodeType === 3 ? container.parentElement.closest(blockSelector) : container.closest(blockSelector);

        if (block) {
            const existingHighlights = block.querySelectorAll('.db-highlight');
            let overlaps = false;
            existingHighlights.forEach(hl => {
                if (selection.containsNode(hl, true)) {
                    overlaps = true;
                }
            });

            if (overlaps) {
                console.log("🚫 Overlap detected (spanning), ignoring.");
                this.removeTempHighlightBtn();
                return;
            }
        }

        // Show Temp Button
        this.showTempHighlightBtn(e.pageX, e.pageY, range);
    },

    showTempHighlightBtn(x, y, range) {
        this.removeTempHighlightBtn();

        const btn = document.createElement('button');
        btn.className = 'db-temp-highlight-btn';
        btn.textContent = 'Highlight';
        btn.style.left = `${x}px`;
        btn.style.top = `${y - 30}px`; // Position above cursor

        btn.onclick = (e) => {
            e.stopPropagation(); // Prevent document mousedown from firing immediately
            this.createHighlight(range);
            this.removeTempHighlightBtn();
            window.getSelection().removeAllRanges();
        };

        document.body.appendChild(btn);
    },

    removeTempHighlightBtn() {
        const existing = document.querySelector('.db-temp-highlight-btn');
        if (existing) existing.remove();
    },

    // Calculate Block-Relative Coordinates and Save
    createHighlight(range) {
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;

        // Constraint: Only support selection within a single block for now
        // Find closest block parent (p, li, h1-h6, etc.)
        const blockSelector = 'p, li, h1, h2, h3, h4, h5, h6, td, th, div';
        const block = startContainer.nodeType === 3 ? startContainer.parentElement.closest(blockSelector) : startContainer.closest(blockSelector);

        if (!block) {
            console.warn("Could not find a valid block container.");
            return;
        }

        // Check if selection crosses blocks
        if (!block.contains(endContainer)) {
            alert("현재는 단일 문단 내 선택만 지원합니다.");
            return;
        }

        // Generate Selector (Simple nth-of-type strategy)
        const selector = this.generateSelector(block);
        if (!selector) return;

        // Calculate Offsets relative to the block's text content
        // This is tricky. Range offsets are relative to the *node*.
        // We need offsets relative to the *block's textContent*.
        // Simplification: For Step 1, we assume the block contains mostly text.
        // Robust way: Create a range from block start to selection start, and measure length.

        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(block);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const startOffset = preCaretRange.toString().length;

        const text = range.toString();
        const endOffset = startOffset + text.length;

        const highlightData = {
            id: crypto.randomUUID(),
            selector: selector,
            startOffset: startOffset,
            endOffset: endOffset,
            text: text,
            color: 'yellow',
            created_at: Date.now()
        };

        this.saveHighlight(highlightData);
        this.renderSingleHighlight(block, highlightData); // Immediate feedback
    },

    generateSelector(element) {
        // Generate a unique CSS selector for the element within .md-content
        // Strategy: TagName + nth-of-type
        // This is fragile if DOM changes, but standard for this approach.

        if (element.id) {
            // Fix: Escape ID if it starts with a digit or has special chars
            if (window.CSS && window.CSS.escape) {
                return `#${CSS.escape(element.id)}`;
            }
            return `#${element.id}`;
        }

        let path = [];
        while (element && element.nodeType === 1 && !element.classList.contains('md-content')) {
            let selector = element.tagName.toLowerCase();

            // Calculate nth-of-type
            let sibling = element;
            let nth = 1;
            while (sibling = sibling.previousElementSibling) {
                if (sibling.tagName.toLowerCase() === selector) nth++;
            }

            if (nth > 1) selector += `:nth-of-type(${nth})`;
            path.unshift(selector);
            element = element.parentElement;
        }

        return '.md-content ' + path.join(' > ');
    },

    saveHighlight(data) {
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        if (!this.data.annotations) this.data.annotations = {};
        if (!this.data.annotations[currentUrl]) this.data.annotations[currentUrl] = [];

        this.data.annotations[currentUrl].push(data);
        this.saveData();
        console.log("Highlight saved:", data);
        this.renderStats(); // [New] Update stats
    },

    saveMemo(uuid, text) {
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const annotations = this.data.annotations[currentUrl];
        if (!annotations) return;

        const data = annotations.find(a => a.id === uuid);
        if (data) {
            data.memo = text;
            this.saveData();

            // Update DOM
            const elements = document.querySelectorAll(`.db-highlight[data-id="${uuid}"]`);
            elements.forEach(el => {
                if (text && text.trim() !== '') {
                    el.classList.add('db-has-memo');
                } else {
                    el.classList.remove('db-has-memo');
                }
            });
            console.log("Memo saved:", uuid);
            this.renderStats(); // [New] Update stats
        }
    },

    removeAnnotation(uuid) {
        if (!confirm("정말로 이 하이라이트를 삭제하시겠습니까?")) return;

        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const annotations = this.data.annotations[currentUrl];
        if (!annotations) return;

        // 1. Remove from Data
        this.data.annotations[currentUrl] = annotations.filter(a => a.id !== uuid);
        this.saveData();

        // 2. Unwrap DOM
        const elements = document.querySelectorAll(`.db-highlight[data-id="${uuid}"]`);
        elements.forEach(el => {
            // Safe Unwrap: Move all children to parent, then remove element
            const parent = el.parentNode;
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
        });

        console.log("Annotation removed:", uuid);
        this.renderStats(); // [New] Update stats
    },

    loadData() {
        const stored = localStorage.getItem(DB_STORAGE_KEY);
        if (stored) {
            try {
                this.data = JSON.parse(stored);
                if (!this.data.bookmarks) this.data.bookmarks = [];
                if (!this.data.learning_status) this.data.learning_status = {};
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }
    },

    async loadIndexData() {
        if (this.indexData) return;
        try {
            // Try paths:
            // 1. Site-relative (if site_url path prefix exists)
            // 2. Root-relative
            // 3. Relative to current page (fallback)

            const paths = [
                '/DharmaBase-DEV/assets/dharma_index.json', // User's specific path
                '/assets/dharma_index.json',                // Standard root
                '../assets/dharma_index.json',              // Relative (1 level deep)
                '../../assets/dharma_index.json'            // Relative (2 levels deep)
            ];

            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        this.indexData = await response.json();
                        console.log(`✅ Loaded dharma_index.json from ${path}`);
                        return;
                    }
                } catch (e) {
                    // Continue to next path
                }
            }
            console.warn("⚠️ Failed to load dharma_index.json from all attempted paths");
        } catch (e) {
            console.error("Failed to load dharma_index.json for metadata", e);
        }
    },

    saveData() {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.data));
    },

    getNormalizedUrl() {
        let path = window.location.pathname;
        if (path.endsWith('index.html')) {
            path = path.substring(0, path.length - 10);
        }
        if (path.length > 1 && !path.endsWith('/') && !path.includes('.')) {
            path += '/';
        }
        return path;
    },

    getMetadata() {
        const currentUrl = this.getNormalizedUrl();
        const title = document.title.split(' - ')[0] || "Untitled";

        let chapter = 'Unknown';
        let part = 'Unknown';

        // Lookup in indexData
        if (this.indexData) {
            // Robust matching: check if currentUrl ends with item.id
            // item.id is like "/sutras/..."
            // currentUrl might be "/DharmaBase-DEV/sutras/..."

            const match = this.indexData.find(item => {
                // 1. Exact match
                if (item.id === currentUrl) return true;

                // 2. Suffix match (ignoring site prefix)
                // CAUTION: item.id "/" will match EVERYTHING ending in /. 
                // We must exclude root "/" from suffix matching unless currentUrl is also root-ish.

                if (item.id === '/' || item.id === '/index.html') {
                    // Only match if currentUrl is effectively root
                    // e.g. /DharmaBase-DEV/ or /DharmaBase-DEV/index.html
                    const path = currentUrl.replace(/\/$/, ''); // Remove trailing slash
                    const idPath = item.id.replace(/\/$/, '');
                    return path.endsWith(idPath) && path.split('/').pop() === idPath.split('/').pop();
                    // Actually, simpler: if item.id is root, we only match if currentUrl (minus site prefix) is empty or /
                    // But we don't know site prefix for sure.
                    // Let's rely on length or specific check.
                    // If item.id is '/', we skip suffix check here.
                    return false;
                }

                if (currentUrl.endsWith(item.id)) return true;

                // 3. Decoded match
                try {
                    if (decodeURIComponent(currentUrl).endsWith(item.id)) return true;
                } catch (e) { }
                return false;
            });

            if (match) {
                chapter = match.metadata.chapter || 'Unknown';
                part = match.metadata.part || 'Unknown';
                console.log("✅ Metadata matched:", match.id, chapter, part);
            } else {
                console.log("❌ No metadata match found for:", currentUrl);
                // Debug: log first few items to see format
                // console.log("First 3 index items:", this.indexData.slice(0, 3));
            }
        } else {
            console.warn("⚠️ Index data not loaded yet");
        }

        return {
            url: currentUrl,
            title: title,
            chapter: chapter,
            part: part,
            timestamp: Date.now()
        };
    },

    isBookmarked(url) {
        return this.data.bookmarks.some(b => b.url === url);
    },

    toggleBookmark() {
        const currentUrl = this.getNormalizedUrl();
        const btn = document.getElementById('db-bookmark-btn');

        if (this.isBookmarked(currentUrl)) {
            // Remove
            this.data.bookmarks = this.data.bookmarks.filter(b => b.url !== currentUrl);
            btn.classList.remove('db-bookmark-btn--active');
            console.log("Bookmark removed:", currentUrl);
        } else {
            // Add
            const meta = this.getMetadata();
            this.data.bookmarks.push(meta);
            btn.classList.add('db-bookmark-btn--active');
            console.log("Bookmark added:", meta);
        }
        this.saveData();
    },

    updateBookmarkUI() {
        const currentUrl = this.getNormalizedUrl();
        const btn = document.getElementById('db-bookmark-btn');
        if (btn) {
            if (this.isBookmarked(currentUrl)) {
                btn.classList.add('db-bookmark-btn--active');
            } else {
                btn.classList.remove('db-bookmark-btn--active');
            }
        }
    },

    // Helper to get canonical ID from indexData if available
    getCanonicalId(url) {
        if (!this.indexData) return url;

        // Find all potential matches
        const matches = this.indexData.filter(item => {
            if (item.id === url) return true;
            if (url.endsWith(item.id)) return true;
            try { if (decodeURIComponent(url).endsWith(item.id)) return true; } catch (e) { }
            return false;
        });

        // Return the longest match (most specific)
        if (matches.length > 0) {
            matches.sort((a, b) => b.id.length - a.id.length);
            return matches[0].id;
        }

        return url;
    },

    // Helper to get status
    getLearningStatus(url) {
        const key = this.getCanonicalId(url);
        return this.data.learning_status ? (this.data.learning_status[key] || '학습대기') : '학습대기';
    },

    setLearningStatus(status) {
        const currentUrl = this.getNormalizedUrl();
        const key = this.getCanonicalId(currentUrl);

        if (!this.data.learning_status) this.data.learning_status = {};
        this.data.learning_status[key] = status;
        this.saveData();
        this.updateStatusUI();
        console.log(`Set status for ${key} (url: ${currentUrl}) to ${status}`);
    },

    updateStatusUI() {
        const currentUrl = this.getNormalizedUrl();
        // getLearningStatus internally calls getCanonicalId(currentUrl)
        const currentStatus = this.getLearningStatus(currentUrl);

        const container = document.querySelector('.db-status-controls');
        if (!container) return;

        const buttons = container.querySelectorAll('button');
        buttons.forEach(btn => {
            const status = btn.dataset.status;
            if (status === currentStatus) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    injectStatusControls() {
        // Exclude system pages
        const currentUrl = this.getNormalizedUrl();
        const systemPaths = ['/card_view/', '/list_view/', '/user/'];

        if (systemPaths.some(path => currentUrl.endsWith(path))) {
            return;
        }

        const isRoot = currentUrl === '/' ||
            currentUrl === '/DharmaBase-DEV/' ||
            currentUrl.endsWith('/index.html');

        if (isRoot) return;

        // Target: .md-content__inner, append at bottom
        const contentInner = document.querySelector('.md-content__inner');
        if (!contentInner) return;

        // Check if already injected
        let container = document.querySelector('.db-status-controls');

        // If container exists but lacks stats (legacy version), remove it to re-inject
        if (container && !container.querySelector('.db-stats-group')) {
            container.remove();
            container = null;
        }

        if (!container) {
            container = document.createElement('div');
            container.className = 'db-status-controls';

            // Left: Status Buttons
            const leftGroup = document.createElement('div');
            leftGroup.className = 'db-status-group';

            const statuses = ['학습대기', '학습중', '학습완료'];
            statuses.forEach(status => {
                const btn = document.createElement('button');
                btn.textContent = status;
                btn.dataset.status = status;
                btn.className = 'db-status-btn';
                btn.onclick = () => this.setLearningStatus(status);
                leftGroup.appendChild(btn);
            });

            // Right: Stats
            const rightGroup = document.createElement('div');
            rightGroup.className = 'db-stats-group';
            rightGroup.innerHTML = `
                <span class="db-stat-badge" id="db-stat-highlight">하이라이트 0</span>
                <span class="db-stat-badge" id="db-stat-memo">메모 0</span>
            `;

            container.appendChild(leftGroup);
            container.appendChild(rightGroup);
            contentInner.appendChild(container);
        }

        this.updateStatusUI();
        this.renderStats(); // Initial render
    },

    renderStats() {
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const highlights = this.data.annotations && this.data.annotations[currentUrl] ? this.data.annotations[currentUrl] : [];

        const highlightCount = highlights.length;
        const memoCount = highlights.filter(h => h.memo && h.memo.trim() !== '').length;

        const hlBadge = document.getElementById('db-stat-highlight');
        const memoBadge = document.getElementById('db-stat-memo');

        if (hlBadge) hlBadge.textContent = `하이라이트 ${highlightCount}`;
        if (memoBadge) memoBadge.textContent = `메모 ${memoCount}`;
    },

    // --- Painting Engine ---

    renderHighlights() {
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const highlights = this.data.annotations && this.data.annotations[currentUrl];

        if (!highlights || highlights.length === 0) return;

        console.log(`Rendering ${highlights.length} highlights for ${currentUrl}`);

        highlights.forEach(data => {
            let block;
            try {
                block = document.querySelector(data.selector);
            } catch (e) {
                // Legacy Support: Try escaping ID if it starts with # and digit
                if (data.selector.startsWith('#')) {
                    try {
                        const id = data.selector.substring(1);
                        if (window.CSS && window.CSS.escape) {
                            block = document.querySelector('#' + CSS.escape(id));
                        } else {
                            block = document.getElementById(id);
                        }
                    } catch (e2) { }
                }

                if (!block) {
                    console.warn(`Invalid Selector: ${data.selector}`, e);
                    return;
                }
            }

            if (!block) {
                console.warn(`Orphaned Highlight: Block not found (${data.selector})`);
                return;
            }
            this.renderSingleHighlight(block, data);
        });
    },

    renderSingleHighlight(block, data) {
        // Fail-Soft: Verify text content
        const blockText = block.textContent;
        // Check bounds
        if (data.endOffset > blockText.length) {
            console.warn("Highlight out of bounds");
            return;
        }

        const targetText = blockText.substring(data.startOffset, data.endOffset);

        // Simple verification (Strict)
        if (targetText !== data.text) {
            console.warn(`Integrity Check Failed: Expected "${data.text}", found "${targetText}"`);
            return;
        }

        // Strategy: "Wrap Chunks"
        // Instead of creating one big range (which fails if it crosses element boundaries),
        // we identify all text nodes involved and wrap the relevant parts of each node.

        let currentOffset = 0;
        let startNode = null, startNodeOffset = 0;
        let endNode = null, endNodeOffset = 0;

        // 1. Find Start and End Nodes
        const findEndpoints = (node) => {
            if (node.nodeType === 3) { // Text Node
                const len = node.length;
                if (!startNode && currentOffset + len >= data.startOffset) {
                    startNode = node;
                    startNodeOffset = data.startOffset - currentOffset;
                }
                if (!endNode && currentOffset + len >= data.endOffset) {
                    endNode = node;
                    endNodeOffset = data.endOffset - currentOffset;
                    return true; // Stop
                }
                currentOffset += len;
            } else {
                for (const child of node.childNodes) {
                    if (findEndpoints(child)) return true;
                }
            }
            return false;
        };

        findEndpoints(block);

        if (!startNode || !endNode) {
            console.warn("Failed to map offsets to DOM nodes.");
            return;
        }

        // 2. Collect all text nodes in between
        const nodesToWrap = [];
        let collecting = false;

        const collectNodes = (node) => {
            if (node === startNode) collecting = true;

            if (collecting && node.nodeType === 3) {
                nodesToWrap.push(node);
            }

            if (node === endNode) {
                collecting = false;
                return true; // Stop
            }

            if (node.nodeType === 1) {
                for (const child of node.childNodes) {
                    if (collectNodes(child)) return true;
                }
            }
            return false;
        };

        collectNodes(block);

        // 3. Wrap each node
        nodesToWrap.forEach(node => {
            const r = document.createRange();

            if (node === startNode && node === endNode) {
                r.setStart(node, startNodeOffset);
                r.setEnd(node, endNodeOffset);
            } else if (node === startNode) {
                r.setStart(node, startNodeOffset);
                r.setEnd(node, node.length);
            } else if (node === endNode) {
                r.setStart(node, 0);
                r.setEnd(node, endNodeOffset);
            } else {
                r.selectNodeContents(node);
            }

            try {
                // Check if range is empty
                if (!r.collapsed) {
                    const span = document.createElement('span');
                    span.className = 'db-highlight';
                    if (data.memo && data.memo.trim() !== '') {
                        span.classList.add('db-has-memo');
                    }
                    span.dataset.id = data.id;
                    r.surroundContents(span);
                }
            } catch (e) {
                console.error("Failed to wrap chunk", e);
            }
        });
    },
    injectBookmarkButton() {
        // [New] Exclude specific pages (Card View, List View, User Dashboard)
        const currentUrl = this.getNormalizedUrl();
        const excludedPaths = ['/card_view/', '/list_view/', '/user/'];

        // Check if currentUrl ends with any of the excluded paths
        // We use endsWith to handle site_url prefix (e.g. /DharmaBase-DEV/card_view/)
        let isExcluded = excludedPaths.some(path => currentUrl.endsWith(path));

        // [New] Also check metadata for doc_type: system
        if (!isExcluded && this.indexData) {
            // Find metadata for current URL
            // Trust getCanonicalId to handle matching logic (including avoiding root ambiguity)
            const currentId = this.getCanonicalId(currentUrl);
            const doc = this.indexData.find(d => d.id === currentId);

            if (doc && doc.metadata && doc.metadata.doc_type === 'system') {
                isExcluded = true;
                console.log("🚫 System page detected via metadata (doc_type: system)");
            }
        }

        if (isExcluded) {
            console.log("🚫 Bookmark button disabled on system page:", currentUrl);
            // Ensure button is removed if it exists (e.g. from previous page in SPA)
            const existingBtn = document.getElementById('db-bookmark-btn-injected');
            if (existingBtn) existingBtn.remove();
            return;
        }

        // Move button from hidden container to Breadcrumbs (.md-path)
        const btnContainer = document.getElementById('db-bookmark-container');
        // Target: .md-path (Breadcrumbs container)
        // If not found (e.g. homepage), fallback to .md-header__inner or .md-content__inner
        let targetContainer = document.querySelector('.md-path');
        let insertMethod = 'append'; // 'append' or 'prepend'

        if (!targetContainer) {
            // Fallback: Content Inner
            targetContainer = document.querySelector('.md-content__inner');
            insertMethod = 'prepend';
        }

        if (btnContainer && targetContainer) {
            const btn = btnContainer.querySelector('button');

            // Check if already injected
            if (!document.getElementById('db-bookmark-btn-injected')) {
                btn.id = 'db-bookmark-btn';
                btn.onclick = () => this.toggleBookmark();

                const wrapper = document.createElement('div');
                wrapper.className = 'db-bookmark-wrapper';
                wrapper.id = 'db-bookmark-btn-injected';
                wrapper.appendChild(btn);

                if (insertMethod === 'prepend') {
                    targetContainer.insertBefore(wrapper, targetContainer.firstChild);
                } else {
                    targetContainer.appendChild(wrapper);
                }
            }
        }
    },

    // --- Phase 6.3 Step 3: UI & Interaction ---

    initUI() {
        // Event Delegation for Highlight Click
        const content = document.querySelector('.md-content');
        if (!content) return;

        console.log("🖱️ UI Event Delegation Initialized");

        content.addEventListener('click', (e) => {
            const highlight = e.target.closest('.db-highlight');
            if (highlight) {
                console.log("🖱️ Highlight Clicked:", highlight.dataset.id);
                e.stopPropagation(); // Prevent document click (which closes menu)
                this.openMenu(highlight);
            }
        });
    },

    openMenu(element) {
        const uuid = element.dataset.id;
        const rect = element.getBoundingClientRect();

        // Get existing memo
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const annotations = this.data.annotations[currentUrl] || [];
        const data = annotations.find(a => a.id === uuid);
        const memo = data ? data.memo : '';

        // Dispatch event to Alpine UI
        // Position: Fixed (Viewport coordinates)
        const top = rect.top - 50; // 50px offset up
        const left = rect.left + (rect.width / 2);

        console.log("🚀 Dispatching db-open-menu", { uuid, top, left });

        window.dispatchEvent(new CustomEvent('db-open-menu', {
            detail: {
                uuid: uuid,
                memo: memo,
                top: top,
                left: left
            }
        }));
    },

    saveMemo(uuid, text) {
        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const annotations = this.data.annotations[currentUrl];
        if (!annotations) return;

        const data = annotations.find(a => a.id === uuid);
        if (data) {
            data.memo = text;
            this.saveData();

            // Update DOM
            const elements = document.querySelectorAll(`.db-highlight[data-id="${uuid}"]`);
            elements.forEach(el => {
                if (text && text.trim() !== '') {
                    el.classList.add('db-has-memo');
                } else {
                    el.classList.remove('db-has-memo');
                }
            });
            console.log("Memo saved:", uuid);
            this.renderStats(); // [New] Update stats
        }
    },

    removeAnnotation(uuid) {
        if (!confirm("정말로 이 하이라이트를 삭제하시겠습니까?")) return;

        const currentUrl = this.getCanonicalId(this.getNormalizedUrl());
        const annotations = this.data.annotations[currentUrl];
        if (!annotations) return;

        // 1. Remove from Data
        this.data.annotations[currentUrl] = annotations.filter(a => a.id !== uuid);
        this.saveData();

        // 2. Unwrap DOM
        const elements = document.querySelectorAll(`.db-highlight[data-id="${uuid}"]`);
        elements.forEach(el => {
            // Safe Unwrap: Move all children to parent, then remove element
            const parent = el.parentNode;
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
        });

        console.log("Annotation removed:", uuid);
        this.renderStats(); // [New] Update stats
    },


    resetData() {
        if (confirm("정말로 모든 개인화 데이터(북마크, 학습상태, 하이라이트)를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            localStorage.removeItem(DB_STORAGE_KEY);
            location.reload();
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Expose to window for debugging/reset
    window.Personalization = Personalization;
    Personalization.init();
});
