// 统一配置管理工具类

class ConfigManager {
    constructor() {
        this.config = null;
        this.isLoaded = false;
        this.loadPromise = null;
    }

    // 单例模式
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    // 加载配置文件
    async loadConfig() {
        // 如果已经在加载中，返回同一个Promise
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // 如果已经加载完成，直接返回
        if (this.isLoaded) {
            return this.config;
        }

        // 开始加载配置
        this.loadPromise = this._loadConfigFromFile();
        
        try {
            this.config = await this.loadPromise;
            this.isLoaded = true;
            return this.config;
        } catch (error) {
            this.loadPromise = null; // 重置Promise，允许重试
            throw error;
        }
    }

    // 从文件加载配置
    async _loadConfigFromFile() {
        try {
            // 根据当前页面路径确定配置文件路径
            const configPath = this._getConfigPath();
            const response = await fetch(configPath);
            
            if (response.ok) {
                const config = await response.json();
                console.log('配置文件加载成功:', configPath);
                return config;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.warn('加载配置文件失败，使用默认配置:', error.message);
            return this._getDefaultConfig();
        }
    }

    // 获取配置文件路径
    _getConfigPath() {
        const currentPath = window.location.pathname;
        
        // 根据当前页面路径确定相对路径
        if (currentPath.includes('/pages/')) {
            return '../../config.json';
        } else if (currentPath.includes('/popup/')) {
            return '../config.json';
        } else {
            return './config.json';
        }
    }

    // 获取默认配置
    _getDefaultConfig() {
        return {
            frontend: {
                redisManager: {
                    apiBaseUrl: 'http://localhost:8080'
                }
            },
            backend: {
                redis: {
                    port: 8080,
                    allowedOrigins: ['http://localhost:3000']
                }
            }
        };
    }

    // 获取配置值
    getConfigValue(path, defaultValue = null) {
        if (!this.isLoaded || !this.config) {
            console.warn('配置尚未加载，返回默认值');
            return defaultValue;
        }
        
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    // 获取前端配置
    getFrontendConfig(moduleName = null) {
        if (!moduleName) {
            return this.getConfigValue('frontend', {});
        }
        return this.getConfigValue(`frontend.${moduleName}`, {});
    }

    // 获取后端配置
    getBackendConfig(serviceName = null) {
        if (!serviceName) {
            return this.getConfigValue('backend', {});
        }
        return this.getConfigValue(`backend.${serviceName}`, {});
    }

    // 获取API基础URL
    getApiBaseUrl(moduleName = 'redisManager') {
        const apiBaseUrl = this.getConfigValue(`frontend.${moduleName}.apiBaseUrl`);
        if (apiBaseUrl) {
            return apiBaseUrl;
        }
        
        // 回退到默认值
        const defaultConfig = this._getDefaultConfig();
        return defaultConfig.frontend[moduleName]?.apiBaseUrl || 'http://localhost:8080';
    }

    // 重新加载配置
    async reloadConfig() {
        this.config = null;
        this.isLoaded = false;
        this.loadPromise = null;
        return await this.loadConfig();
    }

    // 检查配置是否已加载
    isConfigLoaded() {
        return this.isLoaded;
    }

    // 获取完整配置对象（只读）
    getFullConfig() {
        if (!this.isLoaded || !this.config) {
            return null;
        }
        // 返回配置的深拷贝，防止外部修改
        return JSON.parse(JSON.stringify(this.config));
    }
}

// 导出单例实例
const configManager = ConfigManager.getInstance();

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== 'undefined') {
    window.ConfigManager = configManager;
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = configManager;
}