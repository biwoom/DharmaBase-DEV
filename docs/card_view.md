---
title: Card View
doc_type: system
hide:
  - navigation
  - toc
---

<div x-data="dharmaCard" class="card-container">

    <div class="db-controls">
        <div style="margin-bottom: 1rem;">
            <div class="db-select__trigger" style="width: 100%; display: flex; align-items: center;">
                <!-- Search Icon -->
                <svg class="db-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                    type="text" 
                    x-model="search" 
                    placeholder="검색 (제목, 내용, 태그)..." 
                    style="border: none; outline: none; width: 100%; background: transparent; font-size: 0.875rem;"
                >
            </div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
            <button class="db-btn db-btn--toggle" @click="toggleAll()">All</button>
            <button class="db-btn db-btn--toggle" @click="showPart = !showPart" :class="{ 'is-active': showPart }">그룹</button>
            <button class="db-btn db-btn--toggle" @click="showSummary = !showSummary" :class="{ 'is-active': showSummary }">내용</button>
            <button class="db-btn db-btn--toggle" @click="showTags = !showTags" :class="{ 'is-active': showTags }">태그</button>
            <button class="db-btn db-btn--toggle" @click="showKeywords = !showKeywords" :class="{ 'is-active': showKeywords }">키워드</button>
            
            <div style="width: 1px; height: 20px; background: #ddd; margin: 0 8px;"></div>
            
            <select 
                x-model="statusFilter" 
                style="min-width: 120px; padding: 4px 12px; border: 1px solid #ddd; border-radius: 8px;"
            >
                <option value="all">모든 상태</option>
                <option value="학습대기">학습대기</option>
                <option value="학습중">학습중</option>
                <option value="완료">학습완료</option>
            </select>
        </div>
    </div>

    <div x-show="isLoading" style="text-align: center; padding: 2rem;">
        <p>🪷 데이터를 불러오는 중입니다...</p>
    </div>

    <div class="db-board" x-show="!isLoading">
        
        <template x-for="group in groupedItems" :key="group.title">
            <div class="db-column">
                
                <div class="db-column__header">
                    <span x-text="group.title"></span>
                    <span style="font-size: 12px; opacity: 0.6;" x-text="group.items.length"></span>
                </div>

                <div class="db-stack">
                    <template x-for="item in group.items" :key="item.id">
                        <a :href="'..' + item.id" class="db-kanban-card">
                            
                            <div x-show="showPart || showStatus" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span class="db-badge db-badge--secondary" 
                                      x-show="showPart && item.metadata.part" 
                                      x-text="item.metadata.part"></span>
                                
                                <span class="db-badge db-badge--status" 
                                      x-show="showStatus"
                                      x-text="item.metadata.learning_status"
                                      :style="item.metadata.learning_status === '완료' ? 'color: green; border-color: green;' : ''">
                                </span>
                            </div>

                            <h3 class="db-kanban-card__title" x-text="item.title"></h3>

                            <p x-show="showSummary" class="db-kanban-card__meta" x-text="item.metadata.summary"></p>

                            <div class="db-kanban-card__badges">
                                <template x-for="tag in item.metadata.tags">
                                    <span class="db-badge db-badge--outline" x-show="showTags" x-text="tag"></span>
                                </template>
                                <template x-for="kw in item.metadata.keywords">
                                    <span class="db-badge db-badge--outline" x-show="showKeywords" style="border-radius: 12px;" x-text="kw"></span>
                                </template>
                            </div>

                        </a>
                    </template>
                </div>

                <button class="db-btn db-btn--dashed db-btn--full" style="margin-top: 12px;">
                    + 카드 추가
                </button>

            </div>
        </template>

    </div>

    <div x-show="!isLoading && groupedItems.length === 0" style="text-align: center; color: gray; margin-top: 2rem;">
        <p>검색 결과가 없습니다.</p>
    </div>

</div>
