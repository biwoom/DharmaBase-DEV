const initDharmaReader = () => {
    Alpine.data('dharmaReader', () => ({
        // --- State ---
        isOpen: false,
        isLoading: false,
        content: '',
        title: '',
        width: window.innerWidth * 0.5, // Default 50%
        isResizing: false,
        startX: 0,
        startWidth: 0,

        // --- Initialization ---
        init() {
            // Event Listener for opening the reader
            window.addEventListener('open-slideover', (event) => {
                const { url, title } = event.detail;
                this.open(url, title);
            });

            // Resize Event Listeners (Global)
            window.addEventListener('mousemove', (e) => this.resize(e));
            window.addEventListener('mouseup', () => this.stopResize());
        },

        // --- Actions ---
        async open(url, title) {
            this.isOpen = true;
            this.title = title || 'Document';
            this.isLoading = true;
            this.content = ''; // Reset content

            try {
                // Fetch the HTML page
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to load ${url}`);

                const htmlText = await response.text();

                // Parse HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');

                // Extract Content (.md-content is Zensical's main content wrapper)
                // Fallback to body if .md-content not found
                const contentNode = doc.querySelector('.md-content') || doc.body;

                // Remove unwanted elements (e.g., header anchors if needed, but usually fine)
                // We might want to adjust relative links here if necessary

                this.content = contentNode.innerHTML;

            } catch (error) {
                console.error('Reader Error:', error);
                this.content = `<div class="admonition failure"><p class="admonition-title">Error</p><p>Failed to load content: ${error.message}</p></div>`;
            } finally {
                this.isLoading = false;
            }
        },

        close() {
            this.isOpen = false;
        },

        // --- Resizing Logic ---
        startResize(event) {
            this.isResizing = true;
            this.startX = event.clientX;
            this.startWidth = this.width;

            // Prevent text selection during resize
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
        },

        resize(event) {
            if (!this.isResizing) return;

            // Calculate new width (Right-aligned panel, so dragging left increases width)
            // Delta X: Current X - Start X
            // If we move left (smaller X), Delta is negative. 
            // We want width to INCREASE when moving left.
            const deltaX = this.startX - event.clientX;
            const newWidth = this.startWidth + deltaX;

            // Constraints (Min 320px, Max 90vw)
            const minWidth = 320;
            const maxWidth = window.innerWidth * 0.9;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                this.width = newWidth;
            }
        },

        stopResize() {
            if (this.isResizing) {
                this.isResizing = false;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            }
        }
    }));
};

if (window.Alpine) {
    initDharmaReader();
} else {
    document.addEventListener('alpine:init', initDharmaReader);
}
