---
hide:
  - navigation
  - toc
doc_type: system  
---

<div id="db-dashboard-root" x-data="dbDashboard" class="db-dashboard-container--v3">
    
    <!-- Row 1: 3-Column Grid -->
    <div class="db-dashboard-row-1">
        
        <!-- Col 1: My Library (Bookmarks) -->
        <div class="db-dashboard-card db-card-library">
            <div class="db-section-header">
                <div class="db-header-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    <span>나의 서재</span>
                </div>
            </div>
            
            <ul class="db-list-view">
                <template x-for="book in libraryData" :key="book.url">
                    <li class="db-list-item" @click="location.href = book.url">
                        <span class="db-badge" x-text="book.chapter"></span>
                        <span class="db-list-title" x-text="book.title"></span>
                    </li>
                </template>
                <template x-if="libraryData.length === 0">
                    <li class="db-list-empty">북마크한 문서가 없습니다.</li>
                </template>
            </ul>
        </div>

        <!-- Col 2: Chapter Status -->
        <div class="db-dashboard-card">
            <div class="db-section-header">
                <div class="db-header-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                    <span>챕터별 학습 현황</span>
                </div>
            </div>
            <div class="db-table-wrapper">
                <table class="db-simple-table">
                    <thead>
                        <tr>
                            <th>챕터</th>
                            <th>대기</th>
                            <th>진행</th>
                            <th>완료</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template x-for="stat in chapterStats" :key="stat.name">
                            <tr>
                                <td x-text="stat.name" style="font-weight: 500;"></td>
                                <td x-text="stat.todo" style="color: var(--db-muted-fg);"></td>
                                <td x-text="stat.doing" style="color: #3b82f6;"></td>
                                <td x-text="stat.done" style="color: #10b981;"></td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Col 3: Overall Status -->
        <div class="db-dashboard-card">
            <div class="db-section-header">
                <div class="db-header-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                    <span>학습 상태 요약</span>
                    <span style="font-size: 0.9em; color: var(--db-muted-fg); font-weight: normal; margin-left: auto;">
                        총 <strong x-text="totalDocs" style="color: var(--md-default-fg-color);"></strong> 건
                    </span>
                </div>
            </div>
            <ul class="db-list-view">
                <template x-for="stat in statusStats" :key="stat.id">
                    <li class="db-list-item" style="justify-content: space-between; cursor: default;">
                        <span x-text="stat.label"></span>
                        <p style="margin: 0; font-weight: 700;" 
                           :style="stat.id === 'todo' ? 'color: #64748b;' : (stat.id === 'doing' ? 'color: #3b82f6;' : 'color: #10b981;')"
                           x-text="`${stat.count}건`"></p>
                    </li>
                </template>
            </ul>
        </div>
    </div>

    <!-- Row 2: Notebook -->
    <div class="db-dashboard-row-2">
        <div class="db-section-header">
            <div class="db-header-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                <span>나의 노트북</span>
            </div>
        </div>
        <div class="db-dashboard-card" style="padding: 0; overflow: hidden;">
            <div style="overflow-x: auto;">
                <table class="db-notebook-table" style="min-width: 700px;">
                    <thead>
                        <tr>
                            <th style="width: 40px;">
                                <input type="checkbox" @change="toggleAllSelection()">
                            </th>
                            <th style="min-width: 80px; width: 100px;">챕터</th>
                            <th style="min-width: 100px; width: 250px;">문서 제목</th>
                            <th style="min-width: 300px;">하이라이트 / 메모</th>
                            <th style="min-width: 80px; width: 80px;">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template x-for="note in paginatedNotebook" :key="note.id">
                            <tr>
                                <td>
                                    <input type="checkbox" :value="note.id" x-model="selectedIds">
                                </td>
                                <td><span class="db-badge" x-text="note.chapter"></span></td>
                                <td><a :href="note.url" x-text="note.docTitle" style="text-decoration: none; color: inherit;"></a></td>
                                <td>
                                    <!-- View Mode -->
                                    <template x-if="!note.isEditing">
                                        <div>
                                            <div style="background: rgba(255,255,0,0.2); padding: 4px; border-radius: 4px; margin-bottom: 4px;">
                                                <span x-text="note.text"></span>
                                            </div>
                                            <div x-show="note.memo" style="color: var(--db-muted-fg); font-size: 0.9em; display: flex; align-items: center; gap: 4px;">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                <span x-text="note.memo"></span>
                                            </div>
                                        </div>
                                    </template>
                                    <!-- Edit Mode -->
                                    <template x-if="note.isEditing">
                                        <div>
                                            <div style="margin-bottom: 8px; font-size: 0.9em; color: var(--db-muted-fg);" x-text="note.text"></div>
                                            <textarea class="db-notebook-textarea" x-model="note.editMemo" placeholder="메모를 입력하세요"></textarea>
                                        </div>
                                    </template>
                                </td>
                                <td>
                                    <template x-if="!note.isEditing">
                                        <button @click="toggleEdit(note)" class="db-menu-btn" title="편집">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                    </template>
                                    <template x-if="note.isEditing">
                                        <div style="display: flex; flex-direction: column; gap: 4px;">
                                            <button @click="saveNote(note)" class="db-menu-btn db-menu-btn--primary">저장</button>
                                            <button @click="toggleEdit(note)" class="db-menu-btn">취소</button>
                                        </div>
                                    </template>
                                </td>
                            </tr>
                        </template>
                        <template x-if="notebookData.length === 0">
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--db-muted-fg);">
                                    아직 작성된 노트가 없습니다.
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <!-- Pagination & Bulk Actions -->
            <div class="db-notebook-footer">
                <div class="db-pagination" x-show="totalPages > 1">
                    <button class="db-page-btn" :disabled="currentPage === 1" @click="currentPage--">&lt;</button>
                    <span x-text="`${currentPage} / ${totalPages}`" style="font-size: 0.9rem;"></span>
                    <button class="db-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">&gt;</button>
                </div>
                
                <div class="db-static-actions">
                    <span x-show="selectedIds.length > 0" x-text="`${selectedIds.length}개 선택됨`" style="font-size: 0.9rem; color: var(--db-muted-fg); margin-right: 1rem;"></span>
                    <button @click="bulkEdit()" class="db-menu-btn" :disabled="selectedIds.length === 0">일괄 편집</button>
                    <button @click="bulkDelete()" class="db-menu-btn db-menu-btn--danger" :disabled="selectedIds.length === 0">일괄 삭제</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer: Reset Data -->
    <div class="db-dashboard-footer" style="margin-top: 2rem; text-align: right; border-top: 1px solid var(--db-border-color); padding-top: 1rem;">
        <button @click="resetAllData()" class="db-menu-btn db-menu-btn--danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            데이터 초기화
        </button>
    </div>

</div>
