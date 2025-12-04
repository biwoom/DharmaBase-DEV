---
title: Card View
doc_type: system
hide:
  - navigation
  - toc
---

<div x-data="dharmaCard" class="card-container">

    <div class="db-controls">
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
            <input 
                type="text" 
                x-model="search" 
                placeholder="검색어 입력 (제목, 내용, 태그)..."
                style="flex-grow: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px;"
            >
        </div>
        
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
            <button class="db-btn--toggle" @click="toggleAll()">All</button>
            <button class="db-btn--toggle" @click="showPart = !showPart" :class="{ 'is-active': showPart }">그룹</button>
            <button class="db-btn--toggle" @click="showSummary = !showSummary" :class="{ 'is-active': showSummary }">내용</button>
            <button class="db-btn--toggle" @click="showTags = !showTags" :class="{ 'is-active': showTags }">태그</button>
            <button class="db-btn--toggle" @click="showKeywords = !showKeywords" :class="{ 'is-active': showKeywords }">키워드</button>
            
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
                        <a :href="'..' + item.id" class="db-card">
                            
                            <div x-show="showPart || showStatus" style="display: flex; justify-content: space-between;">
                                <span class="db-badge--part" 
                                      x-show="showPart && item.metadata.part" 
                                      x-text="item.metadata.part"></span>
                                
                                <span class="db-badge--tag" 
                                      x-show="showStatus"
                                      x-text="item.metadata.learning_status"
                                      :style="item.metadata.learning_status === '완료' ? 'color: green; border-color: green;' : ''">
                                </span>
                            </div>

                            <h3 class="db-card__title" x-text="item.title"></h3>

                            <p x-show="showSummary" class="db-card__meta" x-text="item.metadata.summary"></p>

                            <div class="db-card__badges">
                                <template x-for="tag in item.metadata.tags">
                                    <span class="db-badge--tag" x-show="showTags" x-text="tag"></span>
                                </template>
                                <template x-for="kw in item.metadata.keywords">
                                    <span class="db-badge--tag" x-show="showKeywords" style="border-radius: 12px;" x-text="kw"></span>
                                </template>
                            </div>

                        </a>
                    </template>
                </div>

                <button class="db-btn--add">
                    + 카드 추가
                </button>

            </div>
        </template>

    </div>

    <div x-show="!isLoading && groupedItems.length === 0" style="text-align: center; color: gray; margin-top: 2rem;">
        <p>검색 결과가 없습니다.</p>
    </div>

</div>
