/**
 * Redis API服务类
 * 封装所有Redis相关的API调用和数据处理
 */
class RedisApiService {
    constructor(baseUrl = 'http://localhost:11367') {
        this.baseUrl = baseUrl;
        this.currentToken = null;
        this.currentConnectionId = null;
        this.requestTimeout = 10000; // 10秒超时
    }

    /**
     * 设置认证信息
     * @param {string} token - 认证令牌
     * @param {string} connectionId - 连接ID
     */
    setAuth(token, connectionId) {
        this.currentToken = token;
        this.currentConnectionId = connectionId;
    }

    /**
     * 清除认证信息
     */
    clearAuth() {
        this.currentToken = null;
        this.currentConnectionId = null;
    }

    /**
     * 发送HTTP请求的通用方法
     * @param {string} endpoint - API端点
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>}
     * @private
     */
    async _request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(this.requestTimeout)
        };

        // 添加认证头
        if (this.currentToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.currentToken}`;
        }

        if (this.currentConnectionId) {
            defaultOptions.headers['X-Connection-ID'] = this.currentConnectionId;
        }

        const finalOptions = { ...defaultOptions, ...options };

        // 如果有请求体，确保正确序列化
        if (finalOptions.body && typeof finalOptions.body === 'object') {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }

        try {
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: `HTTP ${response.status}: ${response.statusText}`
                }));
                throw new Error(errorData.message || `请求失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接');
            }
            throw error;
        }
    }

    /**
     * 检查服务状态
     * @returns {Promise<Object>}
     */
    async ping() {
        return this._request('/ping');
    }

    /**
     * 获取所有键
     * @param {string} pattern - 键模式（可选）
     * @param {number} limit - 限制数量（可选）
     * @returns {Promise<string[]>}
     */
    async getKeys(pattern = '*', limit = 1000) {
        const params = new URLSearchParams();
        if (pattern !== '*') params.append('pattern', pattern);
        if (limit !== 1000) params.append('limit', limit.toString());
        
        const queryString = params.toString();
        const endpoint = `/api/redis/keys${queryString ? '?' + queryString : ''}`;
        
        const response = await this._request(endpoint);
        return response.data || [];
    }

    /**
     * 获取键的类型
     * @param {string} key - 键名
     * @returns {Promise<string>}
     */
    async getKeyType(key) {
        const response = await this._request(`/api/redis/type`, {
            method: 'POST',
            body: { key }
        });
        return response.data;
    }

    /**
     * 获取键的TTL
     * @param {string} key - 键名
     * @returns {Promise<number>} TTL秒数，-1表示永不过期，-2表示键不存在
     */
    async getKeyTTL(key) {
        const response = await this._request(`/api/redis/ttl`, {
            method: 'POST',
            body: { key }
        });
        return response.data;
    }

    /**
     * 设置键的TTL
     * @param {string} key - 键名
     * @param {number} seconds - 过期时间（秒）
     * @returns {Promise<boolean>}
     */
    async setKeyTTL(key, seconds) {
        const response = await this._request(`/api/redis/expire`, {
            method: 'POST',
            body: { key, seconds }
        });
        return response.success;
    }

    /**
     * 移除键的过期时间
     * @param {string} key - 键名
     * @returns {Promise<boolean>}
     */
    async persistKey(key) {
        const response = await this._request(`/api/redis/persist`, {
            method: 'POST',
            body: { key }
        });
        return response.success;
    }

    /**
     * 删除键
     * @param {string|string[]} keys - 键名或键名数组
     * @returns {Promise<number>} 删除的键数量
     */
    async deleteKeys(keys) {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        const response = await this._request(`/api/redis/del`, {
            method: 'DELETE',
            body: { keys: keyArray }
        });
        return response.data;
    }

    /**
     * 重命名键
     * @param {string} oldKey - 原键名
     * @param {string} newKey - 新键名
     * @returns {Promise<boolean>}
     */
    async renameKey(oldKey, newKey) {
        const response = await this._request(`/api/redis/rename`, {
            method: 'POST',
            body: { oldKey, newKey }
        });
        return response.success;
    }

    /**
     * 检查键是否存在
     * @param {string} key - 键名
     * @returns {Promise<boolean>}
     */
    async keyExists(key) {
        const response = await this._request(`/api/redis/exists`, {
            method: 'POST',
            body: { key }
        });
        return response.data > 0;
    }

    /**
     * 获取键的大小（内存占用）
     * @param {string} key - 键名
     * @returns {Promise<number>}
     */
    async getKeySize(key) {
        const response = await this._request(`/api/redis/memory`, {
            method: 'POST',
            body: { key }
        });
        return response.data;
    }

    // ==================== 字符串操作 ====================

    /**
     * 获取字符串值
     * @param {string} key - 键名
     * @returns {Promise<string>}
     */
    async getString(key) {
        const response = await this._request(`/api/redis/string/get`, {
            method: 'POST',
            body: { key }
        });
        return response.data;
    }

    /**
     * 设置字符串值
     * @param {string} key - 键名
     * @param {string} value - 值
     * @param {Object} options - 选项（ex: 过期秒数, px: 过期毫秒数, nx: 仅当键不存在时设置, xx: 仅当键存在时设置）
     * @returns {Promise<boolean>}
     */
    async setString(key, value, options = {}) {
        const response = await this._request(`/api/redis/string/set`, {
            method: 'POST',
            body: { key, value, ...options }
        });
        return response.success;
    }

    /**
     * 追加字符串值
     * @param {string} key - 键名
     * @param {string} value - 要追加的值
     * @returns {Promise<number>} 追加后的字符串长度
     */
    async appendString(key, value) {
        const response = await this._request(`/api/redis/string/append`, {
            method: 'POST',
            body: { key, value }
        });
        return response.data;
    }

    // ==================== 哈希操作 ====================

    /**
     * 获取哈希的所有字段和值
     * @param {string} key - 键名
     * @returns {Promise<Object>}
     */
    async getHashAll(key) {
        const response = await this._request(`/api/redis/hash/getall`, {
            method: 'POST',
            body: { key }
        });
        return response.data;
    }

    /**
     * 获取哈希字段的值
     * @param {string} key - 键名
     * @param {string} field - 字段名
     * @returns {Promise<string>}
     */
    async getHashField(key, field) {
        const response = await this._request(`/api/redis/hash/get`, {
            method: 'POST',
            body: { key, field }
        });
        return response.data;
    }

    /**
     * 设置哈希字段的值
     * @param {string} key - 键名
     * @param {string} field - 字段名
     * @param {string} value - 值
     * @returns {Promise<boolean>}
     */
    async setHashField(key, field, value) {
        const response = await this._request(`/api/redis/hash/set`, {
            method: 'POST',
            body: { key, field, value }
        });
        return response.success;
    }

    /**
     * 删除哈希字段
     * @param {string} key - 键名
     * @param {string|string[]} fields - 字段名或字段名数组
     * @returns {Promise<number>} 删除的字段数量
     */
    async deleteHashFields(key, fields) {
        const fieldArray = Array.isArray(fields) ? fields : [fields];
        const response = await this._request(`/api/redis/hash/del`, {
            method: 'DELETE',
            body: { key, fields: fieldArray }
        });
        return response.data;
    }

    /**
     * 获取哈希的所有字段名
     * @param {string} key - 键名
     * @returns {Promise<string[]>}
     */
    async getHashKeys(key) {
        const response = await this._request(`/api/redis/hash/keys`, {
            method: 'POST',
            body: { key }
        });
        return response.data;
    }

    /**
     * 获取哈希的字段数量
     * @param {string} key - 键名
     * @returns {Promise<number>}
     */
    async getHashLength(key) {
        const response = await this._request(`/api/redis/hash/len`, {
            method: 'POST',
            body: { key }
        });
        return response.data;
    }

    // ==================== 批量操作 ====================

    /**
     * 批量获取键信息
     * @param {string[]} keys - 键名数组
     * @returns {Promise<Object[]>} 键信息数组
     */
    async getKeysInfo(keys) {
        const response = await this._request(`/api/redis/keys/info`, {
            method: 'POST',
            body: { keys }
        });
        return response.data;
    }

    /**
     * 批量设置TTL
     * @param {Object[]} operations - 操作数组，每个元素包含 {key, seconds}
     * @returns {Promise<Object>} 操作结果
     */
    async batchSetTTL(operations) {
        const response = await this._request(`/api/redis/batch/expire`, {
            method: 'POST',
            body: { operations }
        });
        return response.data;
    }

    // ==================== 工具方法 ====================

    /**
     * 格式化键大小
     * @param {number} bytes - 字节数
     * @returns {string}
     */
    static formatKeySize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 格式化TTL时间
     * @param {number} seconds - 秒数
     * @returns {string}
     */
    static formatTTL(seconds) {
        if (seconds === -1) return '永不过期';
        if (seconds === -2) return '键不存在';
        if (seconds <= 0) return '已过期';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (days > 0) {
            return `${days}天 ${hours}小时`;
        } else if (hours > 0) {
            return `${hours}小时 ${minutes}分钟`;
        } else if (minutes > 0) {
            return `${minutes}分钟 ${secs}秒`;
        } else {
            return `${secs}秒`;
        }
    }

    /**
     * 获取键类型的图标
     * @param {string} type - 键类型
     * @returns {string}
     */
    static getTypeIcon(type) {
        const icons = {
            'string': '📝',
            'hash': '🗂️',
            'list': '📋',
            'set': '🔗',
            'zset': '📊',
            'stream': '🌊'
        };
        return icons[type] || '❓';
    }

    /**
     * 获取键类型的颜色
     * @param {string} type - 键类型
     * @returns {string}
     */
    static getTypeColor(type) {
        const colors = {
            'string': '#28a745',
            'hash': '#17a2b8',
            'list': '#ffc107',
            'set': '#6f42c1',
            'zset': '#fd7e14',
            'stream': '#20c997'
        };
        return colors[type] || '#6c757d';
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = RedisApiService;
} else {
    // 浏览器环境
    window.RedisApiService = RedisApiService;
}