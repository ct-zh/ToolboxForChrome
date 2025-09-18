/**
 * Redis管理器事件总线
 * 用于组件间的事件通信和状态同步
 */
class EventBus {
    constructor() {
        // 事件监听器存储
        this.listeners = new Map();
        // 调试模式
        this.debug = false;
    }

    /**
     * 注册事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} context - 执行上下文
     * @returns {Function} 取消监听的函数
     */
    on(eventName, callback, context = null) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            throw new Error('事件名称必须是字符串，回调必须是函数');
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        const listener = {
            callback,
            context,
            id: this._generateId()
        };

        this.listeners.get(eventName).push(listener);

        if (this.debug) {
            console.log(`[EventBus] 注册事件监听器: ${eventName}`, listener.id);
        }

        // 返回取消监听的函数
        return () => this.off(eventName, listener.id);
    }

    /**
     * 注册一次性事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} context - 执行上下文
     * @returns {Function} 取消监听的函数
     */
    once(eventName, callback, context = null) {
        const onceWrapper = (...args) => {
            callback.apply(context, args);
            this.off(eventName, listener.id);
        };

        const listener = {
            callback: onceWrapper,
            context,
            id: this._generateId(),
            once: true
        };

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        this.listeners.get(eventName).push(listener);

        if (this.debug) {
            console.log(`[EventBus] 注册一次性事件监听器: ${eventName}`, listener.id);
        }

        return () => this.off(eventName, listener.id);
    }

    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {string} listenerId - 监听器ID（可选）
     */
    off(eventName, listenerId = null) {
        if (!this.listeners.has(eventName)) {
            return;
        }

        const listeners = this.listeners.get(eventName);

        if (listenerId) {
            // 移除特定监听器
            const index = listeners.findIndex(listener => listener.id === listenerId);
            if (index !== -1) {
                listeners.splice(index, 1);
                if (this.debug) {
                    console.log(`[EventBus] 移除事件监听器: ${eventName}`, listenerId);
                }
            }
        } else {
            // 移除所有监听器
            listeners.length = 0;
            if (this.debug) {
                console.log(`[EventBus] 移除所有事件监听器: ${eventName}`);
            }
        }

        // 如果没有监听器了，删除事件
        if (listeners.length === 0) {
            this.listeners.delete(eventName);
        }
    }

    /**
     * 触发事件
     * @param {string} eventName - 事件名称
     * @param {...any} args - 事件参数
     */
    emit(eventName, ...args) {
        if (!this.listeners.has(eventName)) {
            if (this.debug) {
                console.log(`[EventBus] 没有找到事件监听器: ${eventName}`);
            }
            return;
        }

        const listeners = this.listeners.get(eventName).slice(); // 复制数组避免在执行过程中被修改

        if (this.debug) {
            console.log(`[EventBus] 触发事件: ${eventName}`, args, `监听器数量: ${listeners.length}`);
        }

        listeners.forEach(listener => {
            try {
                listener.callback.apply(listener.context, args);
            } catch (error) {
                console.error(`[EventBus] 事件监听器执行错误: ${eventName}`, error);
            }
        });
    }

    /**
     * 异步触发事件
     * @param {string} eventName - 事件名称
     * @param {...any} args - 事件参数
     * @returns {Promise}
     */
    async emitAsync(eventName, ...args) {
        if (!this.listeners.has(eventName)) {
            return;
        }

        const listeners = this.listeners.get(eventName).slice();

        if (this.debug) {
            console.log(`[EventBus] 异步触发事件: ${eventName}`, args);
        }

        const promises = listeners.map(listener => {
            try {
                const result = listener.callback.apply(listener.context, args);
                return Promise.resolve(result);
            } catch (error) {
                console.error(`[EventBus] 异步事件监听器执行错误: ${eventName}`, error);
                return Promise.reject(error);
            }
        });

        return Promise.allSettled(promises);
    }

    /**
     * 获取事件监听器数量
     * @param {string} eventName - 事件名称（可选）
     * @returns {number}
     */
    getListenerCount(eventName = null) {
        if (eventName) {
            return this.listeners.has(eventName) ? this.listeners.get(eventName).length : 0;
        }
        
        let total = 0;
        for (const listeners of this.listeners.values()) {
            total += listeners.length;
        }
        return total;
    }

    /**
     * 获取所有事件名称
     * @returns {string[]}
     */
    getEventNames() {
        return Array.from(this.listeners.keys());
    }

    /**
     * 清除所有事件监听器
     */
    clear() {
        this.listeners.clear();
        if (this.debug) {
            console.log('[EventBus] 清除所有事件监听器');
        }
    }

    /**
     * 设置调试模式
     * @param {boolean} enabled - 是否启用调试
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`[EventBus] 调试模式: ${enabled ? '启用' : '禁用'}`);
    }

    /**
     * 生成唯一ID
     * @returns {string}
     * @private
     */
    _generateId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Redis管理器专用事件常量
const REDIS_EVENTS = {
    // 键相关事件
    KEY_SELECTED: 'key:selected',
    KEY_DELETED: 'key:deleted',
    KEY_RENAMED: 'key:renamed',
    KEY_EXPIRED: 'key:expired',
    KEY_CREATED: 'key:created',
    KEY_UPDATED: 'key:updated',
    
    // TTL相关事件
    TTL_UPDATED: 'ttl:updated',
    TTL_EXPIRED: 'ttl:expired',
    TTL_WARNING: 'ttl:warning',
    
    // 连接相关事件
    CONNECTION_CHANGED: 'connection:changed',
    CONNECTION_LOST: 'connection:lost',
    CONNECTION_RESTORED: 'connection:restored',
    
    // 数据相关事件
    DATA_LOADED: 'data:loaded',
    DATA_ERROR: 'data:error',
    DATA_REFRESH: 'data:refresh',
    
    // UI相关事件
    UI_LOADING: 'ui:loading',
    UI_ERROR: 'ui:error',
    UI_SUCCESS: 'ui:success',
    UI_NOTIFICATION: 'ui:notification'
};

// 创建全局事件总线实例
const redisEventBus = new EventBus();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = { EventBus, REDIS_EVENTS, redisEventBus };
} else {
    // 浏览器环境
    window.EventBus = EventBus;
    window.REDIS_EVENTS = REDIS_EVENTS;
    window.redisEventBus = redisEventBus;
}