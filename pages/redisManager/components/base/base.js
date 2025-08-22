/**
 * Redis基础管理组件
 * 融合了键列表、键操作和TTL倒计时三个组件的功能
 */

// Redis事件常量
const REDIS_EVENTS = {
    CONNECTION_CHANGED: 'connection:changed',
    KEY_SELECTED: 'key:selected',
    KEY_DELETED: 'key:deleted',
    KEY_RENAMED: 'key:renamed',
    TTL_UPDATED: 'ttl:updated',
    TTL_EXPIRED: 'ttl:expired',
    DATA_LOADED: 'data:loaded',
    DATA_REFRESH: 'data:refresh',
    DATA_ERROR: 'data:error',
    UI_LOADING: 'ui:loading',
    UI_SUCCESS: 'ui:success',
    UI_ERROR: 'ui:error'
};

/**
 * Redis键列表组件
 * 负责展示Redis键列表、搜索过滤和键选择功能
 */
class KeyListComponent {
    constructor(container, apiService, eventBus) {
        this.container = container;
        this.apiService = apiService;
        this.eventBus = eventBus;
        
        // 组件状态
        this.keys = [];
        this.filteredKeys = [];
        this.selectedKey = null;
        this.loading = false;
        this.error = null;
        
        // 过滤器状态
        this.filters = {
            pattern: '',
            type: [],
            ttlRange: 'all' // all, expiring, persistent
        };
        
        // 分页状态
        this.pagination = {
            current: 1,
            pageSize: 50,
            total: 0
        };
        
        // 排序状态
        this.sorting = {
            field: 'name',
            order: 'asc' // asc, desc
        };
        
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.render();
        this.bindEvents();
        this.loadKeys();
    }

    /**
     * 渲染组件HTML结构
     */
    render() {
        this.container.innerHTML = `
            <div class="key-list-component">
                <!-- 工具栏 -->
                <div class="key-list-toolbar">
                    <div class="search-section">
                        <div class="search-input-group">
                            <input type="text" 
                                   id="keySearchInput" 
                                   class="search-input" 
                                   placeholder="搜索键名（支持通配符 * ?）"
                                   value="${this.filters.pattern}">
                            <button id="searchBtn" class="search-btn" title="搜索">
                                🔍
                            </button>
                            <button id="clearSearchBtn" class="clear-search-btn" title="清除搜索">
                                ✕
                            </button>
                        </div>
                    </div>
                    
                    <div class="filter-section">
                        <div class="filter-group">
                            <label>类型过滤:</label>
                            <div class="type-filters">
                                <label class="type-filter-item">
                                    <input type="checkbox" value="string" ${this.filters.type.includes('string') ? 'checked' : ''}>
                                    <span class="type-badge type-string">📝 String</span>
                                </label>
                                <label class="type-filter-item">
                                    <input type="checkbox" value="hash" ${this.filters.type.includes('hash') ? 'checked' : ''}>
                                    <span class="type-badge type-hash">🗂️ Hash</span>
                                </label>
                                <label class="type-filter-item">
                                    <input type="checkbox" value="list" ${this.filters.type.includes('list') ? 'checked' : ''}>
                                    <span class="type-badge type-list">📋 List</span>
                                </label>
                                <label class="type-filter-item">
                                    <input type="checkbox" value="set" ${this.filters.type.includes('set') ? 'checked' : ''}>
                                    <span class="type-badge type-set">🔗 Set</span>
                                </label>
                                <label class="type-filter-item">
                                    <input type="checkbox" value="zset" ${this.filters.type.includes('zset') ? 'checked' : ''}>
                                    <span class="type-badge type-zset">📊 ZSet</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label>TTL过滤:</label>
                            <select id="ttlFilter" class="ttl-filter">
                                <option value="all" ${this.filters.ttlRange === 'all' ? 'selected' : ''}>全部</option>
                                <option value="persistent" ${this.filters.ttlRange === 'persistent' ? 'selected' : ''}>永不过期</option>
                                <option value="expiring" ${this.filters.ttlRange === 'expiring' ? 'selected' : ''}>有过期时间</option>
                                <option value="soon" ${this.filters.ttlRange === 'soon' ? 'selected' : ''}>即将过期(&lt;1小时)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="action-section">
                        <button id="refreshBtn" class="action-btn refresh-btn" title="刷新列表">
                            🔄 刷新
                        </button>
                        <button id="selectAllBtn" class="action-btn select-all-btn" title="全选">
                            ☑️ 全选
                        </button>
                    </div>
                </div>
                
                <!-- 统计信息 -->
                <div class="key-list-stats">
                    <span class="stats-item">
                        总计: <strong id="totalCount">${this.keys.length}</strong>
                    </span>
                    <span class="stats-item">
                        显示: <strong id="filteredCount">${this.filteredKeys.length}</strong>
                    </span>
                    <span class="stats-item">
                        已选: <strong id="selectedCount">0</strong>
                    </span>
                </div>
                
                <!-- 排序控制 -->
                <div class="key-list-sorting">
                    <label>排序:</label>
                    <select id="sortField" class="sort-field">
                        <option value="name" ${this.sorting.field === 'name' ? 'selected' : ''}>键名</option>
                        <option value="type" ${this.sorting.field === 'type' ? 'selected' : ''}>类型</option>
                        <option value="ttl" ${this.sorting.field === 'ttl' ? 'selected' : ''}>TTL</option>
                        <option value="size" ${this.sorting.field === 'size' ? 'selected' : ''}>大小</option>
                    </select>
                    <button id="sortOrder" class="sort-order-btn" data-order="${this.sorting.order}">
                        ${this.sorting.order === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
                
                <!-- 键列表 -->
                <div class="key-list-container">
                    <div id="keyListLoading" class="loading-state" style="display: none;">
                        <div class="loading-spinner"></div>
                        <span>加载中...</span>
                    </div>
                    
                    <div id="keyListError" class="error-state" style="display: none;">
                        <div class="error-icon">⚠️</div>
                        <div class="error-message"></div>
                        <button class="retry-btn">重试</button>
                    </div>
                    
                    <div id="keyListEmpty" class="empty-state" style="display: none;">
                        <div class="empty-icon">📭</div>
                        <div class="empty-message">没有找到匹配的键</div>
                    </div>
                    
                    <div id="keyList" class="key-list"></div>
                </div>
                
                <!-- 分页控制 -->
                <div class="key-list-pagination">
                    <button id="prevPageBtn" class="page-btn" disabled>上一页</button>
                    <span class="page-info">
                        第 <span id="currentPage">${this.pagination.current}</span> 页，
                        共 <span id="totalPages">1</span> 页
                    </span>
                    <button id="nextPageBtn" class="page-btn" disabled>下一页</button>
                    
                    <div class="page-size-control">
                        <label>每页显示:</label>
                        <select id="pageSizeSelect">
                            <option value="25" ${this.pagination.pageSize === 25 ? 'selected' : ''}>25</option>
                            <option value="50" ${this.pagination.pageSize === 50 ? 'selected' : ''}>50</option>
                            <option value="100" ${this.pagination.pageSize === 100 ? 'selected' : ''}>100</option>
                            <option value="200" ${this.pagination.pageSize === 200 ? 'selected' : ''}>200</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 搜索相关事件
        const searchInput = this.container.querySelector('#keySearchInput');
        const searchBtn = this.container.querySelector('#searchBtn');
        const clearSearchBtn = this.container.querySelector('#clearSearchBtn');
        
        searchInput.addEventListener('input', this.debounce(() => {
            this.filters.pattern = searchInput.value;
            this.applyFilters();
        }, 300));
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.filters.pattern = searchInput.value;
                this.applyFilters();
            }
        });
        
        searchBtn.addEventListener('click', () => {
            this.filters.pattern = searchInput.value;
            this.applyFilters();
        });
        
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.filters.pattern = '';
            this.applyFilters();
        });
        
        // 类型过滤事件
        const typeFilters = this.container.querySelectorAll('.type-filters input[type="checkbox"]');
        typeFilters.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateTypeFilters();
                this.applyFilters();
            });
        });
        
        // TTL过滤事件
        const ttlFilter = this.container.querySelector('#ttlFilter');
        ttlFilter.addEventListener('change', () => {
            this.filters.ttlRange = ttlFilter.value;
            this.applyFilters();
        });
        
        // 排序事件
        const sortField = this.container.querySelector('#sortField');
        const sortOrder = this.container.querySelector('#sortOrder');
        
        sortField.addEventListener('change', () => {
            this.sorting.field = sortField.value;
            this.applySorting();
        });
        
        sortOrder.addEventListener('click', () => {
            this.sorting.order = this.sorting.order === 'asc' ? 'desc' : 'asc';
            sortOrder.dataset.order = this.sorting.order;
            sortOrder.textContent = this.sorting.order === 'asc' ? '↑' : '↓';
            this.applySorting();
        });
        
        // 操作按钮事件
        const refreshBtn = this.container.querySelector('#refreshBtn');
        const selectAllBtn = this.container.querySelector('#selectAllBtn');
        
        refreshBtn.addEventListener('click', () => this.loadKeys());
        selectAllBtn.addEventListener('click', () => this.toggleSelectAll());
        
        // 分页事件
        const prevPageBtn = this.container.querySelector('#prevPageBtn');
        const nextPageBtn = this.container.querySelector('#nextPageBtn');
        const pageSizeSelect = this.container.querySelector('#pageSizeSelect');
        
        prevPageBtn.addEventListener('click', () => this.goToPreviousPage());
        nextPageBtn.addEventListener('click', () => this.goToNextPage());
        pageSizeSelect.addEventListener('change', () => {
            this.pagination.pageSize = parseInt(pageSizeSelect.value);
            this.pagination.current = 1;
            this.renderKeyList();
        });
        
        // 错误重试事件
        const retryBtn = this.container.querySelector('.retry-btn');
        retryBtn.addEventListener('click', () => this.loadKeys());
        
        // 监听外部事件
        this.eventBus.on(REDIS_EVENTS.CONNECTION_CHANGED, () => {
            this.loadKeys();
        });
        
        this.eventBus.on(REDIS_EVENTS.KEY_DELETED, (keyName) => {
            this.removeKeyFromList(keyName);
        });
        
        this.eventBus.on(REDIS_EVENTS.KEY_RENAMED, (oldName, newName) => {
            this.updateKeyInList(oldName, newName);
        });
        
        this.eventBus.on(REDIS_EVENTS.DATA_REFRESH, () => {
            this.loadKeys();
        });
    }

    /**
     * 加载Redis键列表
     */
    async loadKeys() {
        this.setLoading(true);
        this.setError(null);
        
        try {
            // 获取键列表
            const keys = await this.apiService.getKeys('*', 10000);
            
            // 获取键的详细信息
            const keyInfoPromises = keys.map(async (keyName) => {
                try {
                    const [type, ttl, size] = await Promise.all([
                        this.apiService.getKeyType(keyName),
                        this.apiService.getKeyTTL(keyName),
                        this.apiService.getKeySize(keyName).catch(() => 0)
                    ]);
                    
                    return {
                        name: keyName,
                        type,
                        ttl,
                        size,
                        selected: false,
                        lastModified: Date.now()
                    };
                } catch (error) {
                    console.warn(`获取键 ${keyName} 信息失败:`, error);
                    return {
                        name: keyName,
                        type: 'unknown',
                        ttl: -1,
                        size: 0,
                        selected: false,
                        lastModified: Date.now()
                    };
                }
            });
            
            this.keys = await Promise.all(keyInfoPromises);
            this.applyFilters();
            
            // 触发数据加载完成事件
            this.eventBus.emit(REDIS_EVENTS.DATA_LOADED, this.keys);
            
        } catch (error) {
            console.error('加载键列表失败:', error);
            this.setError(error.message);
            this.eventBus.emit(REDIS_EVENTS.DATA_ERROR, error);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 应用过滤器
     */
    applyFilters() {
        let filtered = [...this.keys];
        
        // 应用模式过滤
        if (this.filters.pattern) {
            const pattern = this.filters.pattern.toLowerCase();
            const regex = new RegExp(
                pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
                'i'
            );
            filtered = filtered.filter(key => regex.test(key.name));
        }
        
        // 应用类型过滤
        if (this.filters.type.length > 0) {
            filtered = filtered.filter(key => this.filters.type.includes(key.type));
        }
        
        // 应用TTL过滤
        switch (this.filters.ttlRange) {
            case 'persistent':
                filtered = filtered.filter(key => key.ttl === -1);
                break;
            case 'expiring':
                filtered = filtered.filter(key => key.ttl > 0);
                break;
            case 'soon':
                filtered = filtered.filter(key => key.ttl > 0 && key.ttl <= 3600);
                break;
        }
        
        this.filteredKeys = filtered;
        this.applySorting();
    }

    /**
     * 应用排序
     */
    applySorting() {
        this.filteredKeys.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sorting.field) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'type':
                    aValue = a.type;
                    bValue = b.type;
                    break;
                case 'ttl':
                    aValue = a.ttl;
                    bValue = b.ttl;
                    break;
                case 'size':
                    aValue = a.size;
                    bValue = b.size;
                    break;
                default:
                    aValue = a.name;
                    bValue = b.name;
            }
            
            let result;
            if (typeof aValue === 'string') {
                result = aValue.localeCompare(bValue);
            } else {
                result = aValue - bValue;
            }
            
            return this.sorting.order === 'asc' ? result : -result;
        });
        
        this.pagination.current = 1;
        this.renderKeyList();
    }

    /**
     * 渲染键列表
     */
    renderKeyList() {
        const keyListContainer = this.container.querySelector('#keyList');
        const loadingState = this.container.querySelector('#keyListLoading');
        const errorState = this.container.querySelector('#keyListError');
        const emptyState = this.container.querySelector('#keyListEmpty');
        
        // 隐藏所有状态
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        
        if (this.loading) {
            loadingState.style.display = 'block';
            keyListContainer.innerHTML = '';
            return;
        }
        
        if (this.error) {
            errorState.style.display = 'block';
            errorState.querySelector('.error-message').textContent = this.error;
            keyListContainer.innerHTML = '';
            return;
        }
        
        if (this.filteredKeys.length === 0) {
            emptyState.style.display = 'block';
            keyListContainer.innerHTML = '';
            this.updateStats();
            return;
        }
        
        // 计算分页
        const startIndex = (this.pagination.current - 1) * this.pagination.pageSize;
        const endIndex = startIndex + this.pagination.pageSize;
        const pageKeys = this.filteredKeys.slice(startIndex, endIndex);
        
        // 渲染键项
        keyListContainer.innerHTML = pageKeys.map(key => this.renderKeyItem(key)).join('');
        
        // 绑定键项事件
        this.bindKeyItemEvents();
        
        // 更新统计和分页
        this.updateStats();
        this.updatePagination();
    }

    /**
     * 渲染单个键项
     * @param {Object} key - 键对象
     * @returns {string} HTML字符串
     */
    renderKeyItem(key) {
        const typeIcon = this.getTypeIcon(key.type);
        const typeColor = this.getTypeColor(key.type);
        const formattedSize = this.formatKeySize(key.size);
        const ttlDisplay = this.formatTTLDisplay(key.ttl);
        const isSelected = key.selected ? 'selected' : '';
        const isExpiring = key.ttl > 0 && key.ttl <= 300; // 5分钟内过期
        
        return `
            <div class="key-item ${isSelected} ${isExpiring ? 'expiring' : ''}" data-key="${this.escapeHtml(key.name)}">
                <div class="key-item-checkbox">
                    <input type="checkbox" ${key.selected ? 'checked' : ''}>
                </div>
                
                <div class="key-item-icon">
                    <span class="type-icon" style="color: ${typeColor}">${typeIcon}</span>
                </div>
                
                <div class="key-item-content">
                    <div class="key-name" title="${this.escapeHtml(key.name)}">
                        ${this.highlightSearchTerm(this.escapeHtml(key.name))}
                    </div>
                    <div class="key-meta">
                        <span class="key-type" style="background-color: ${typeColor}">${key.type.toUpperCase()}</span>
                        <span class="key-size">${formattedSize}</span>
                        <span class="key-ttl ${isExpiring ? 'warning' : ''}">${ttlDisplay}</span>
                    </div>
                </div>
                
                <div class="key-item-actions">
                    <button class="action-btn view-btn" title="查看详情" data-action="view">
                        👁️
                    </button>
                    <button class="action-btn edit-btn" title="编辑" data-action="edit">
                        ✏️
                    </button>
                    <button class="action-btn delete-btn" title="删除" data-action="delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 绑定键项事件
     */
    bindKeyItemEvents() {
        const keyItems = this.container.querySelectorAll('.key-item');
        
        keyItems.forEach(item => {
            const keyName = item.dataset.key;
            const checkbox = item.querySelector('input[type="checkbox"]');
            
            // 复选框事件
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleKeySelection(keyName, checkbox.checked);
            });
            
            // 键项点击事件（选择键）
            item.addEventListener('click', (e) => {
                if (e.target.closest('.key-item-actions') || e.target.type === 'checkbox') {
                    return;
                }
                this.selectKey(keyName);
            });
            
            // 操作按钮事件
            const actionBtns = item.querySelectorAll('.action-btn');
            actionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    this.handleKeyAction(keyName, action);
                });
            });
        });
    }

    /**
     * 处理键操作
     * @param {string} keyName - 键名
     * @param {string} action - 操作类型
     */
    handleKeyAction(keyName, action) {
        const key = this.keys.find(k => k.name === keyName);
        if (!key) return;
        
        switch (action) {
            case 'view':
                this.eventBus.emit(REDIS_EVENTS.KEY_SELECTED, keyName, key.type, 'view');
                break;
            case 'edit':
                this.eventBus.emit(REDIS_EVENTS.KEY_SELECTED, keyName, key.type, 'edit');
                break;
            case 'delete':
                this.eventBus.emit('key:delete:request', keyName);
                break;
        }
    }

    /**
     * 选择键
     * @param {string} keyName - 键名
     */
    selectKey(keyName) {
        const key = this.keys.find(k => k.name === keyName);
        if (!key) return;
        
        // 更新选中状态
        if (this.selectedKey !== keyName) {
            this.selectedKey = keyName;
            
            // 更新UI
            this.container.querySelectorAll('.key-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const selectedItem = this.container.querySelector(`[data-key="${this.escapeAttribute(keyName)}"]`);
            if (selectedItem) {
                selectedItem.classList.add('active');
            }
            
            // 触发事件
            this.eventBus.emit(REDIS_EVENTS.KEY_SELECTED, keyName, key.type, 'select');
        }
    }

    /**
     * 切换键的选择状态（复选框）
     * @param {string} keyName - 键名
     * @param {boolean} selected - 是否选中
     */
    toggleKeySelection(keyName, selected) {
        const key = this.keys.find(k => k.name === keyName);
        if (key) {
            key.selected = selected;
            this.updateStats();
        }
    }

    /**
     * 切换全选状态
     */
    toggleSelectAll() {
        const hasSelected = this.filteredKeys.some(key => key.selected);
        const newState = !hasSelected;
        
        this.filteredKeys.forEach(key => {
            key.selected = newState;
        });
        
        // 更新UI
        this.container.querySelectorAll('.key-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = newState;
        });
        
        this.updateStats();
    }

    /**
     * 更新类型过滤器
     */
    updateTypeFilters() {
        const checkedTypes = Array.from(
            this.container.querySelectorAll('.type-filters input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        
        this.filters.type = checkedTypes;
    }

    /**
     * 从列表中移除键
     * @param {string} keyName - 键名
     */
    removeKeyFromList(keyName) {
        this.keys = this.keys.filter(key => key.name !== keyName);
        this.applyFilters();
    }

    /**
     * 更新列表中的键
     * @param {string} oldName - 旧键名
     * @param {string} newName - 新键名
     */
    updateKeyInList(oldName, newName) {
        const key = this.keys.find(k => k.name === oldName);
        if (key) {
            key.name = newName;
            this.applyFilters();
        }
    }

    /**
     * 设置加载状态
     * @param {boolean} loading - 是否加载中
     */
    setLoading(loading) {
        this.loading = loading;
        if (loading) {
            this.renderKeyList();
        }
    }

    /**
     * 设置错误状态
     * @param {string} error - 错误信息
     */
    setError(error) {
        this.error = error;
        if (error) {
            this.renderKeyList();
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const totalCount = this.container.querySelector('#totalCount');
        const filteredCount = this.container.querySelector('#filteredCount');
        const selectedCount = this.container.querySelector('#selectedCount');
        
        if (totalCount) totalCount.textContent = this.keys.length;
        if (filteredCount) filteredCount.textContent = this.filteredKeys.length;
        if (selectedCount) {
            const selected = this.keys.filter(key => key.selected).length;
            selectedCount.textContent = selected;
        }
    }

    /**
     * 更新分页信息
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredKeys.length / this.pagination.pageSize);
        this.pagination.total = totalPages;
        
        const currentPageEl = this.container.querySelector('#currentPage');
        const totalPagesEl = this.container.querySelector('#totalPages');
        const prevBtn = this.container.querySelector('#prevPageBtn');
        const nextBtn = this.container.querySelector('#nextPageBtn');
        
        if (currentPageEl) currentPageEl.textContent = this.pagination.current;
        if (totalPagesEl) totalPagesEl.textContent = totalPages;
        
        if (prevBtn) prevBtn.disabled = this.pagination.current <= 1;
        if (nextBtn) nextBtn.disabled = this.pagination.current >= totalPages;
    }

    /**
     * 上一页
     */
    goToPreviousPage() {
        if (this.pagination.current > 1) {
            this.pagination.current--;
            this.renderKeyList();
        }
    }

    /**
     * 下一页
     */
    goToNextPage() {
        const totalPages = Math.ceil(this.filteredKeys.length / this.pagination.pageSize);
        if (this.pagination.current < totalPages) {
            this.pagination.current++;
            this.renderKeyList();
        }
    }

    /**
     * 格式化TTL显示
     * @param {number} ttl - TTL秒数
     * @returns {string}
     */
    formatTTLDisplay(ttl) {
        if (ttl === -1) return '永不过期';
        if (ttl === -2) return '键不存在';
        if (ttl <= 0) return '已过期';
        
        if (ttl <= 60) {
            return `${ttl}秒`;
        } else if (ttl <= 3600) {
            const minutes = Math.floor(ttl / 60);
            const seconds = ttl % 60;
            return `${minutes}分${seconds}秒`;
        } else {
            const hours = Math.floor(ttl / 3600);
            const minutes = Math.floor((ttl % 3600) / 60);
            return `${hours}时${minutes}分`;
        }
    }

    /**
     * 高亮搜索词
     * @param {string} text - 文本
     * @returns {string}
     */
    highlightSearchTerm(text) {
        if (!this.filters.pattern) return text;
        
        const pattern = this.filters.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${pattern})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 转义HTML
     * @param {string} text - 文本
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 转义HTML属性
     * @param {string} text - 文本
     * @returns {string}
     */
    escapeAttribute(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /**
     * 获取选中的键
     * @returns {string[]}
     */
    getSelectedKeys() {
        return this.keys.filter(key => key.selected).map(key => key.name);
    }

    /**
     * 清除选择
     */
    clearSelection() {
        this.keys.forEach(key => key.selected = false);
        this.container.querySelectorAll('.key-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateStats();
    }

    /**
     * 获取类型图标
     * @param {string} type - 类型
     * @returns {string}
     */
    getTypeIcon(type) {
        const icons = {
            string: '📝',
            hash: '🗂️',
            list: '📋',
            set: '🔗',
            zset: '📊',
            stream: '🌊',
            unknown: '❓'
        };
        return icons[type] || icons.unknown;
    }

    /**
     * 获取类型颜色
     * @param {string} type - 类型
     * @returns {string}
     */
    getTypeColor(type) {
        const colors = {
            string: '#10b981',
            hash: '#f59e0b',
            list: '#3b82f6',
            set: '#8b5cf6',
            zset: '#ef4444',
            stream: '#06b6d4',
            unknown: '#6b7280'
        };
        return colors[type] || colors.unknown;
    }

    /**
     * 格式化键大小
     * @param {number} size - 大小
     * @returns {string}
     */
    formatKeySize(size) {
        if (size === 0) return '0B';
        if (size < 1024) return `${size}B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
        return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 移除事件监听器
        this.eventBus.off(REDIS_EVENTS.CONNECTION_CHANGED);
        this.eventBus.off(REDIS_EVENTS.KEY_DELETED);
        this.eventBus.off(REDIS_EVENTS.KEY_RENAMED);
        this.eventBus.off(REDIS_EVENTS.DATA_REFRESH);
        
        // 清空容器
        this.container.innerHTML = '';
    }
}

/**
 * Redis键操作组件
 * 负责处理Redis键的各种操作：删除、重命名、设置TTL、复制等
 */
class KeyOperationComponent {
    constructor(container, apiService, eventBus) {
        this.container = container;
        this.apiService = apiService;
        this.eventBus = eventBus;
        
        // 组件状态
        this.currentKey = null;
        this.currentKeyInfo = null;
        
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.render();
        this.bindEvents();
    }

    /**
     * 渲染组件HTML结构
     */
    render() {
        // 使用简化的HTML结构，与base.html中的内容匹配
        console.log('KeyOperationComponent渲染完成');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听外部事件
        this.eventBus.on(REDIS_EVENTS.KEY_SELECTED, (keyName, keyType, action) => {
            this.setCurrentKey(keyName, keyType);
        });
    }

    /**
     * 设置当前操作的键
     */
    setCurrentKey(keyName, keyType) {
        this.currentKey = keyName;
        console.log(`当前选中键: ${keyName}, 类型: ${keyType}`);
    }

    /**
     * 销毁组件
     */
    destroy() {
        this.eventBus.off(REDIS_EVENTS.KEY_SELECTED);
    }
}

/**
 * Redis键TTL倒计时组件
 * 负责实时显示和更新键的过期时间倒计时
 */
class TTLCountdownComponent {
    constructor(container, apiService, eventBus) {
        this.container = container;
        this.apiService = apiService;
        this.eventBus = eventBus;
        
        // 组件状态
        this.countdowns = new Map();
        this.updateInterval = null;
        this.isActive = false;
        
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.render();
        this.bindEvents();
        this.startCountdown();
    }

    /**
     * 渲染组件HTML结构
     */
    render() {
        // 使用简化的HTML结构，与base.html中的内容匹配
        console.log('TTLCountdownComponent渲染完成');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听外部事件
        this.eventBus.on(REDIS_EVENTS.KEY_SELECTED, (keyName, keyType) => {
            this.addKeyToMonitor(keyName, keyType);
        });
        
        this.eventBus.on(REDIS_EVENTS.KEY_DELETED, (keyName) => {
            this.removeKeyFromMonitor(keyName);
        });
    }

    /**
     * 添加键到监控列表
     */
    async addKeyToMonitor(keyName, keyType) {
        try {
            const ttl = await this.apiService.getKeyTTL(keyName);
            if (ttl > 0) {
                this.countdowns.set(keyName, {
                    keyName,
                    keyType,
                    ttl,
                    startTime: Date.now()
                });
                console.log(`添加TTL监控: ${keyName} (${ttl}秒)`);
            }
        } catch (error) {
            console.error(`添加TTL监控失败: ${keyName}`, error);
        }
    }

    /**
     * 从监控列表移除键
     */
    removeKeyFromMonitor(keyName) {
        if (this.countdowns.has(keyName)) {
            this.countdowns.delete(keyName);
            console.log(`移除TTL监控: ${keyName}`);
        }
    }

    /**
     * 开始倒计时
     */
    startCountdown() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            this.updateCountdowns();
        }, 1000);
        
        this.isActive = true;
    }

    /**
     * 更新所有倒计时
     */
    updateCountdowns() {
        const now = Date.now();
        
        for (const [keyName, countdown] of this.countdowns) {
            const elapsed = Math.floor((now - countdown.startTime) / 1000);
            const remaining = Math.max(0, countdown.ttl - elapsed);
            
            if (remaining <= 0) {
                this.eventBus.emit(REDIS_EVENTS.TTL_EXPIRED, keyName);
                this.countdowns.delete(keyName);
            }
        }
    }

    /**
     * 销毁组件
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.eventBus.off(REDIS_EVENTS.KEY_SELECTED);
        this.eventBus.off(REDIS_EVENTS.KEY_DELETED);
        
        this.countdowns.clear();
    }
}

/**
 * Redis基础管理器
 * 整合键列表、键操作和TTL倒计时功能
 */
class RedisBaseManager {
    constructor(container, apiService, eventBus) {
        this.container = container;
        this.apiService = apiService;
        this.eventBus = eventBus;
        
        this.components = {};
        
        this.init();
    }

    /**
     * 初始化管理器
     */
    init() {
        this.loadHTML();
    }

    /**
     * 加载HTML模板
     */
    async loadHTML() {
        try {
            const response = await fetch('./components/base/base.html');
            const html = await response.text();
            this.container.innerHTML = html;
            
            this.initializeComponents();
        } catch (error) {
            console.error('加载base.html失败:', error);
            this.container.innerHTML = '<div class="error">加载组件失败</div>';
        }
    }

    /**
     * 初始化组件
     */
    initializeComponents() {
        // 初始化键列表组件
        const keyListContainer = this.container.querySelector('#keyListContainer');
        if (keyListContainer) {
            this.components.keyList = new KeyListComponent(
                keyListContainer,
                this.apiService,
                this.eventBus
            );
        }
        
        // 初始化键操作组件
        const keyOperationContainer = this.container.querySelector('#keyOperationContainer');
        if (keyOperationContainer) {
            this.components.keyOperation = new KeyOperationComponent(
                keyOperationContainer,
                this.apiService,
                this.eventBus
            );
        }
        
        // 初始化TTL倒计时组件
        const ttlCountdownContainer = this.container.querySelector('#ttlCountdownContainer');
        if (ttlCountdownContainer) {
            this.components.ttlCountdown = new TTLCountdownComponent(
                ttlCountdownContainer,
                this.apiService,
                this.eventBus
            );
        }
    }

    /**
     * 销毁管理器
     */
    destroy() {
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        this.components = {};
        this.container.innerHTML = '';
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RedisBaseManager,
        KeyListComponent,
        REDIS_EVENTS
    };
} else {
    window.RedisBaseManager = RedisBaseManager;
    window.KeyListComponent = KeyListComponent;
    window.REDIS_EVENTS = REDIS_EVENTS;
}