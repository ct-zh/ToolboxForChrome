/**
 * Redis基础管理组件
 * 专注于单个Redis键的管理，包含键输入、键操作和TTL倒计时功能
 */

/**
 * 事件总线类
 * 用于组件间的事件通信
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * 监听事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * 移除事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (!this.events[event]) return;
        
        if (callback) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        } else {
            delete this.events[event];
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {...any} args - 参数
     */
    emit(event, ...args) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`事件处理器错误 [${event}]:`, error);
            }
        });
    }
}

/**
 * Redis API服务类
 * 负责与后端Redis服务的通信
 */
class RedisApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.token = null;
    }

    /**
     * 设置认证token
     * @param {string} token - 认证token
     */
    setAuth(token) {
        this.token = token;
    }

    /**
     * 清除认证信息
     */
    clearAuth() {
        this.token = null;
    }

    /**
     * 获取请求头
     * @returns {Object} 请求头对象
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    /**
     * 发送API请求
     * @param {string} endpoint - API端点
     * @param {Object} options - 请求选项
     * @returns {Promise} 请求结果
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API请求失败 [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * 获取键的详细信息
     * @param {string} keyName - 键名
     * @returns {Promise<Object>} 键信息
     */
    async getKeyInfo(keyName) {
        const result = await this.request(`/api/redis/key/${encodeURIComponent(keyName)}`);
        return result.data;
    }

    /**
     * 获取键的值
     * @param {string} keyName - 键名
     * @returns {Promise<any>} 键值
     */
    async getKeyValue(keyName) {
        const keyInfo = await this.getKeyInfo(keyName);
        return keyInfo.value;
    }

    /**
     * 获取键的类型
     * @param {string} keyName - 键名
     * @returns {Promise<string>} 键类型
     */
    async getKeyType(keyName) {
        const keyInfo = await this.getKeyInfo(keyName);
        return keyInfo.type;
    }

    /**
     * 获取键的TTL
     * @param {string} keyName - 键名
     * @returns {Promise<number>} TTL值
     */
    async getKeyTTL(keyName) {
        const keyInfo = await this.getKeyInfo(keyName);
        return keyInfo.ttl;
    }

    /**
     * 删除键
     * @param {string} keyName - 键名
     * @returns {Promise<boolean>} 删除结果
     */
    async deleteKey(keyName) {
        const result = await this.request(`/api/redis/key/${encodeURIComponent(keyName)}`, {
            method: 'DELETE'
        });
        return result.success;
    }

    /**
     * 设置键的TTL
     * @param {string} keyName - 键名
     * @param {number} ttl - TTL值（秒）
     * @returns {Promise<boolean>} 设置结果
     */
    async setKeyTTL(keyName, ttl) {
        const result = await this.request(`/api/redis/key/${encodeURIComponent(keyName)}/ttl`, {
            method: 'PUT',
            body: JSON.stringify({ ttl })
        });
        return result.success;
    }

    /**
     * 检查键是否存在
     * @param {string} keyName - 键名
     * @returns {Promise<boolean>} 是否存在
     */
    async keyExists(keyName) {
        try {
            await this.getKeyInfo(keyName);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Redis事件常量
const REDIS_EVENTS = {
    CONNECTION_CHANGED: 'connection:changed',
    KEY_SELECTED: 'key:selected',
    KEY_DELETED: 'key:deleted',
    KEY_UPDATED: 'key:updated',
    TTL_UPDATED: 'ttl:updated',
    TTL_EXPIRED: 'ttl:expired',
    DATA_LOADED: 'data:loaded',
    DATA_ERROR: 'data:error',
    UI_LOADING: 'ui:loading',
    UI_SUCCESS: 'ui:success',
    UI_ERROR: 'ui:error'
};

/**
 * 键输入组件
 * 负责键名输入和验证
 */
class KeyInputComponent {
    constructor(container, apiService, eventBus) {
        this.container = container;
        this.apiService = apiService;
        this.eventBus = eventBus;
        this.currentKey = null;
        
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.bindEvents();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 使用类选择器和相对查找，避免ID冲突问题
        const keyInput = this.container.querySelector('.key-input');
        const loadKeyBtn = this.container.querySelector('.load-btn');
        const clearKeyBtn = this.container.querySelector('.clear-btn');
        
        console.log('KeyInputComponent bindEvents:', {
            container: this.container,
            keyInput: keyInput,
            loadKeyBtn: loadKeyBtn,
            clearKeyBtn: clearKeyBtn
        });
        
        if (keyInput) {
            keyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter key pressed, loading key...');
                    this.loadKey();
                }
            });
        }
        
        if (loadKeyBtn) {
            loadKeyBtn.addEventListener('click', () => {
                console.log('loadKeyBtn clicked');
                this.loadKey();
            });
        } else {
            console.error('loadKeyBtn not found in container:', this.container);
        }
        
        if (clearKeyBtn) {
            clearKeyBtn.addEventListener('click', () => {
                console.log('clearKeyBtn clicked');
                this.clearKey();
            });
        }
    }

    /**
     * 加载键
     */
    async loadKey() {
        const keyInput = this.container.querySelector('.key-input');
        const keyName = keyInput.value.trim();
        
        if (!keyName) {
            this.showError('请输入键名');
            return;
        }
        
        try {
            this.setLoading(true);
            
            // 检查键是否存在
            const exists = await this.apiService.keyExists(keyName);
            if (!exists) {
                this.showError('键不存在');
                return;
            }
            
            // 获取键信息
            const [keyInfo, keyValue, keyType, keyTTL] = await Promise.all([
                this.apiService.getKeyInfo(keyName),
                this.apiService.getKeyValue(keyName),
                this.apiService.getKeyType(keyName),
                this.apiService.getKeyTTL(keyName)
            ]);
            
            this.currentKey = {
                name: keyName,
                value: keyValue,
                type: keyType,
                ttl: keyTTL,
                ...keyInfo
            };
            
            // 触发键选择事件
            this.eventBus.emit(REDIS_EVENTS.KEY_SELECTED, this.currentKey);
            
            this.showSuccess('键加载成功');
            
        } catch (error) {
            console.error('加载键失败:', error);
            this.showError(`加载失败: ${error.message}`);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 清除当前键
     */
    clearKey() {
        const keyInput = this.container.querySelector('.key-input');
        keyInput.value = '';
        this.currentKey = null;
        
        // 触发键清除事件
        this.eventBus.emit(REDIS_EVENTS.KEY_SELECTED, null);
    }

    /**
     * 设置加载状态
     */
    setLoading(loading) {
        const loadKeyBtn = this.container.querySelector('.load-btn');
        const keyInput = this.container.querySelector('.key-input');
        
        if (loadKeyBtn) {
            loadKeyBtn.disabled = loading;
            loadKeyBtn.textContent = loading ? '加载中...' : '加载键';
        }
        
        if (keyInput) {
            keyInput.disabled = loading;
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        this.eventBus.emit(REDIS_EVENTS.UI_ERROR, message);
    }

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        this.eventBus.emit(REDIS_EVENTS.UI_SUCCESS, message);
    }
}

/**
 * 键操作组件
 * 负责键的操作功能
 */
class KeyOperationComponent {
    constructor(container, apiService, eventBus) {
        this.container = container;
        this.apiService = apiService;
        this.eventBus = eventBus;
        this.currentKey = null;
        
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.bindEvents();
        this.updateUI();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        const deleteBtn = this.container.querySelector('#deleteKeyBtn');
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteKey());
        }
        
        // 监听键选择事件
        this.eventBus.on(REDIS_EVENTS.KEY_SELECTED, (keyData) => {
            this.currentKey = keyData;
            this.updateUI();
        });
    }

    /**
     * 删除键
     */
    async deleteKey() {
        if (!this.currentKey) {
            this.showError('没有选择的键');
            return;
        }
        
        if (!confirm(`确定要删除键 "${this.currentKey.name}" 吗？`)) {
            return;
        }
        
        try {
            this.setLoading(true);
            
            const success = await this.apiService.deleteKey(this.currentKey.name);
            if (success) {
                this.showSuccess('键删除成功');
                this.eventBus.emit(REDIS_EVENTS.KEY_DELETED, this.currentKey.name);
                this.currentKey = null;
                this.updateUI();
            } else {
                this.showError('键删除失败');
            }
            
        } catch (error) {
            console.error('删除键失败:', error);
            this.showError(`删除失败: ${error.message}`);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        const keyNameEl = this.container.querySelector('#displayKeyName');
        const keyValueEl = this.container.querySelector('#displayKeyValue');
        const keyTypeEl = this.container.querySelector('#currentKeyType');
        const deleteBtn = this.container.querySelector('#deleteKeyBtn');
        
        if (this.currentKey) {
            if (keyNameEl) keyNameEl.textContent = this.currentKey.name;
            if (keyValueEl) {
                let preview = this.currentKey.value;
                if (preview && preview.length > 50) {
                    preview = preview.substring(0, 50) + '...';
                }
                keyValueEl.textContent = preview || '-';
            }
            if (keyTypeEl) {
                const typeMap = {
                    'string': '📝 String',
                    'hash': '🗂️ Hash',
                    'list': '📋 List',
                    'set': '🔗 Set',
                    'zset': '📊 ZSet'
                };
                keyTypeEl.textContent = typeMap[this.currentKey.type] || '❓ 未知类型';
                keyTypeEl.className = `key-type-badge type-${this.currentKey.type}`;
            }
            if (deleteBtn) deleteBtn.disabled = false;
        } else {
            if (keyNameEl) keyNameEl.textContent = '未选择键';
            if (keyValueEl) keyValueEl.textContent = '-';
            if (keyTypeEl) {
                keyTypeEl.textContent = '未知类型';
                keyTypeEl.className = 'key-type-badge';
            }
            if (deleteBtn) deleteBtn.disabled = true;
        }
    }

    /**
     * 设置加载状态
     */
    setLoading(loading) {
        const deleteBtn = this.container.querySelector('#deleteKeyBtn');
        
        if (deleteBtn) {
            deleteBtn.disabled = loading;
            const btnText = deleteBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = loading ? '删除中...' : '删除键';
            }
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        this.eventBus.emit(REDIS_EVENTS.UI_ERROR, message);
    }

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        this.eventBus.emit(REDIS_EVENTS.UI_SUCCESS, message);
    }
}

/**
 * TTL倒计时组件
 * 负责显示和更新键的TTL倒计时
 */
class TTLCountdownComponent {
    constructor(container, apiService, eventBus) {
        this.container = container;
        this.apiService = apiService;
        this.eventBus = eventBus;
        this.currentKey = null;
        this.updateInterval = null;
        this.startTime = null;
        
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.bindEvents();
        this.updateUI();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听键选择事件
        this.eventBus.on(REDIS_EVENTS.KEY_SELECTED, (keyData) => {
            this.currentKey = keyData;
            this.startCountdown();
        });
        
        // 监听键删除事件
        this.eventBus.on(REDIS_EVENTS.KEY_DELETED, () => {
            this.stopCountdown();
        });
    }

    /**
     * 开始倒计时
     */
    startCountdown() {
        this.stopCountdown();
        
        if (!this.currentKey || this.currentKey.ttl <= 0) {
            this.updateUI();
            return;
        }
        
        this.startTime = Date.now();
        this.updateInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);
        
        this.updateUI();
    }

    /**
     * 停止倒计时
     */
    stopCountdown() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.startTime = null;
        this.updateUI();
    }

    /**
     * 更新倒计时
     */
    updateCountdown() {
        if (!this.currentKey || !this.startTime) {
            return;
        }
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const remaining = Math.max(0, this.currentKey.ttl - elapsed);
        
        if (remaining <= 0) {
            this.eventBus.emit(REDIS_EVENTS.TTL_EXPIRED, this.currentKey.name);
            this.stopCountdown();
            return;
        }
        
        this.updateUI(remaining);
    }

    /**
     * 更新UI显示
     */
    updateUI(remainingTTL = null) {
        const countdownEl = this.container.querySelector('#currentTTLCountdown');
        const statusEl = this.container.querySelector('#ttlStatus');
        
        if (!this.currentKey) {
            if (countdownEl) {
                countdownEl.textContent = '∞';
                countdownEl.className = 'ttl-time';
            }
            if (statusEl) statusEl.textContent = '未选择键';
            return;
        }
        
        const ttl = remainingTTL !== null ? remainingTTL : this.currentKey.ttl;
        
        if (ttl === -1) {
            // 永不过期
            if (countdownEl) {
                countdownEl.textContent = '∞';
                countdownEl.className = 'ttl-time';
            }
            if (statusEl) statusEl.textContent = '永不过期';
        } else if (ttl <= 0) {
            // 已过期
            if (countdownEl) {
                countdownEl.textContent = '00:00:00';
                countdownEl.className = 'ttl-time critical';
            }
            if (statusEl) statusEl.textContent = '已过期';
        } else {
            // 格式化时间显示
            const hours = Math.floor(ttl / 3600);
            const minutes = Math.floor((ttl % 3600) / 60);
            const seconds = ttl % 60;
            
            let timeStr;
            if (hours > 0) {
                timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (countdownEl) {
                countdownEl.textContent = timeStr;
                
                // 设置样式
                if (ttl <= 60) {
                    countdownEl.className = 'ttl-time critical';
                } else if (ttl <= 300) {
                    countdownEl.className = 'ttl-time warning';
                } else {
                    countdownEl.className = 'ttl-time';
                }
            }
            
            if (statusEl) {
                if (ttl <= 60) {
                    statusEl.textContent = '即将过期';
                } else if (ttl <= 300) {
                    statusEl.textContent = '5分钟内过期';
                } else {
                    statusEl.textContent = '正常';
                }
            }
        }
    }

    /**
     * 销毁组件
     */
    destroy() {
        this.stopCountdown();
        this.eventBus.off(REDIS_EVENTS.KEY_SELECTED);
        this.eventBus.off(REDIS_EVENTS.KEY_DELETED);
    }
}

/**
 * Redis基础管理器
 * 整合键输入、键操作和TTL倒计时功能
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
        this.initializeComponents();
    }

    /**
     * 初始化组件
     */
    initializeComponents() {
        // 初始化键输入组件
        const keyInputContainer = this.container.querySelector('#keyInputContainer');
        if (keyInputContainer) {
            this.components.keyInput = new KeyInputComponent(
                keyInputContainer,
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
        EventBus,
        RedisApiService,
        RedisBaseManager,
        KeyInputComponent,
        KeyOperationComponent,
        TTLCountdownComponent,
        REDIS_EVENTS
    };
} else {
    window.EventBus = EventBus;
    window.RedisApiService = RedisApiService;
    window.RedisBaseManager = RedisBaseManager;
    window.KeyInputComponent = KeyInputComponent;
    window.KeyOperationComponent = KeyOperationComponent;
    window.TTLCountdownComponent = TTLCountdownComponent;
    window.REDIS_EVENTS = REDIS_EVENTS;
}