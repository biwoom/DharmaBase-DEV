---
hide:
  - navigation
  - toc
doc_type: system
---

<div x-data="dharmaList" class="db-list-wrapper" style="width: 100%; max-width: auto; margin: 0 auto;">

  <!-- Search & Filter Area -->
  <div style="margin-bottom: 1.5rem;">
    <div class="db-select__trigger" style="width: 100%; display: flex; align-items: center;">
      <!-- Search Icon -->
      <svg class="db-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input 
        type="text" 
        x-model="searchQuery" 
        placeholder="검색 (제목, 내용, 태그)..." 
        style="border: none; outline: none; width: 100%; background: transparent; font-size: 0.875rem;"
      >
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="db-tab-header" style="margin-bottom: 1rem; display: flex; gap: 4px; border-bottom: none; background: transparent; padding: 0;">
    <template x-for="chapter in chapters" :key="chapter">
      <button 
        class="db-tab-btn" 
        :class="{ 'db-tab-btn--active': activeTab === chapter }"
        @click="setTab(chapter)"
        x-text="chapter"
        style="width: auto; padding: 0.5rem 1rem;"
      ></button>
    </template>
  </div>

  <!-- Data Table -->
  <div class="db-table-container" style="border: 1px solid var(--db-border); border-radius: var(--db-radius-lg); overflow: hidden;">
    <div class="db-table-scroll">
      <table class="db-table">
        <thead style="background-color: var(--db-muted);">
          <tr>
            <th style="width: 80px;">그룹</th>
            <th @click="sort('title')" style="cursor: pointer; width: 200px;">제목</th>
            <th style="min-width: 250px;">내용</th>
            <th style="width: 200px; min-width: 180px;">태그</th>
            <th style="width: 200px; min-width: 180px;">키워드</th>
            <th style="width: 80px;">학습</th>
          </tr>
        </thead>
        <tbody>
          <template x-for="doc in visibleDocs" :key="doc.url">
            <tr class="db-table__row" @click="openReader(doc)" style="cursor: pointer; transition: background 0.2s;">
              
              <!-- Part (Group) -->
              <td>
                <span class="db-badge db-badge--outline" x-text="doc.part"></span>
              </td>

              <!-- Title -->
              <td class="font-medium" style="color: var(--db-fg);">
                <span x-text="doc.title"></span>
              </td>

              <!-- Summary -->
              <td style="color: var(--db-muted-fg); font-size: 0.875rem; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" x-text="doc.summary"></td>

              <!-- Tags -->
              <td style="max-width: 200px;">
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  <template x-for="tag in doc.tags">
                    <span class="db-badge db-badge--outline" style="font-size: 11px;" x-text="tag"></span>
                  </template>
                </div>
              </td>

              <!-- Keywords -->
              <td style="max-width: 200px;">
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  <template x-for="kw in doc.keywords">
                    <span class="db-badge db-badge--outline" style="font-size: 11px; border-radius: 12px;" x-text="kw"></span>
                  </template>
                </div>
              </td>

              <!-- Status -->
              <td>
                <span 
                  class="db-badge db-badge--status" 
                  :class="{
                    'db-badge--waiting': doc.status === '학습대기',
                    'db-badge--progress': doc.status === '학습중',
                    'db-badge--completed': doc.status === '학습완료'
                  }"
                  style="display: inline-flex; align-items: center; gap: 4px;"
                >
                  <span style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; opacity: 0.7;"></span>
                  <span x-text="doc.status"></span>
                </span>
              </td>

            </tr>
          </template>
          
          <tr x-show="visibleDocs.length === 0">
            <td colspan="6" style="padding: 4rem; text-align: center; color: var(--db-muted-fg);">
              No results found for this filter.
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  </div>
  
  <div style="padding: 1rem; display: flex; justify-content: flex-end; color: var(--db-muted-fg); font-size: 0.875rem;">
    <span x-text="' 문서: ' + visibleDocs.length"></span>
  </div>

</div>

<!-- Slide-Over Reader Component -->
<div x-data="dharmaReader" 
     @keydown.escape.window="close()"
     class="db-reader-root">
    
    <!-- Backdrop -->
    <div x-show="isOpen" 
         @click="close()"
         x-transition.opacity
         class="db-slideover__backdrop"
         style="display: none;"></div>

    <!-- Panel -->
    <div x-show="isOpen"
         x-transition:enter="transition transform ease-out db-duration-2000"
         x-transition:enter-start="translate-x-full"
         x-transition:enter-end="translate-x-0"
         x-transition:leave="transition transform ease-in duration-500"
         x-transition:leave-start="translate-x-0"
         x-transition:leave-end="translate-x-full"
         class="db-slideover__panel"
         :style="`--panel-width: ${width}px`"
         style="display: none;">

        <!-- Resizer -->
        <div class="db-slideover__resizer" @mousedown="startResize"></div>

        <!-- Content Container -->
        <div class="db-slideover__content">
            <!-- Header -->
            <div class="db-slideover__header">
                <h3 class="db-slideover__title" x-text="title"></h3>
                <button @click="close()" class="db-slideover__close-btn" aria-label="Close">
                    <svg class="db-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Body -->
            <div class="db-slideover__body">
                <!-- Loading State -->
                <div x-show="isLoading" class="db-reader-loading">
                    <div class="db-spinner"></div>
                    <span>Loading...</span>
                </div>

                <!-- Content -->
                <div x-show="!isLoading" class="db-prose" x-html="content"></div>
            </div>
        </div>
    </div>
</div>
