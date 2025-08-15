// Redis管理器JavaScript逻辑

class RedisManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8080'; // 默认值，将从配置文件覆盖
        this.connections = [];
        this.currentConnection = null;
        this.configFiles = [];
        this.selectedConfig = null;
        this.init();
    }

    // 初始化
    async init() {
        await this.loadConfig(); // 首先加载配置
        this.bindEvents();
        this.loadConnections();
        this.loadConfigFiles();
        this.checkServiceStatus();
        
        // 定期检查服务状态
        setInterval(() => {
            this.checkServiceStatus();
        }, 30000); // 每30秒检查一次
    }

    // 绑定事件
    bindEvents() {

        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 添加连接
        document.getElementById('addConnection').addEventListener('click', () => {
            this.addConnection();
        });

        // 表单回车提交
        const formInputs = document.querySelectorAll('.connection-form input');
        formInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addConnection();
                }
            });
        });

        // 配置文件搜索和选择
        this.bindConfigEvents();


    }



    // 切换标签页
    switchTab(tabName) {
        // 移除所有标签页的active状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // 激活选中的标签页
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');

        console.log(`切换到标签页: ${tabName}`);
    }

    // 绑定配置文件相关事件
    bindConfigEvents() {
        const configSearch = document.getElementById('configSearch');
        const configDropdownList = document.getElementById('configDropdownList');

        if (!configSearch || !configDropdownList) {
            console.warn('配置文件相关元素未找到');
            return;
        }

        // 搜索输入事件已在renderConfigSelector中处理

        // 点击输入框显示下拉列表
        configSearch.addEventListener('focus', () => {
            this.showConfigDropdown();
        });

        // 点击外部隐藏下拉列表
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.config-dropdown')) {
                this.hideConfigDropdown();
            }
        });
    }

    // 检查服务状态
    async checkServiceStatus() {
        const statusLight = document.getElementById('statusLight');
        const statusText = document.getElementById('statusText');
        
        try {
            statusText.textContent = '检查服务状态...';
            
            const response = await fetch(`${this.apiBaseUrl}/ping`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // 设置超时
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const data = await response.json();
                statusLight.classList.add('connected');
                statusText.textContent = '服务连接成功';
                console.log('服务状态检查成功:', data);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            statusLight.classList.remove('connected');
            statusText.textContent = '服务连接失败';
            console.error('服务状态检查失败:', error.message);
        }
    }

    // 添加连接
    addConnection() {
        const name = document.getElementById('connectionName').value.trim();
        const host = document.getElementById('host').value.trim();
        const port = document.getElementById('port').value.trim();
        const password = document.getElementById('password').value;
        const database = document.getElementById('database').value.trim();

        // 验证必填字段
        if (!name) {
            alert('请输入连接名称');
            document.getElementById('connectionName').focus();
            return;
        }

        if (!host) {
            alert('请输入主机地址');
            document.getElementById('host').focus();
            return;
        }

        if (!port || isNaN(port) || port < 1 || port > 65535) {
            alert('请输入有效的端口号 (1-65535)');
            document.getElementById('port').focus();
            return;
        }

        if (!database || isNaN(database) || database < 0 || database > 15) {
            alert('请输入有效的数据库号 (0-15)');
            document.getElementById('database').focus();
            return;
        }

        // 检查连接名称是否重复
        if (this.connections.some(conn => conn.name === name)) {
            alert('连接名称已存在，请使用其他名称');
            document.getElementById('connectionName').focus();
            return;
        }

        // 创建连接对象
        const connection = {
            id: Date.now().toString(),
            name,
            host,
            port: parseInt(port),
            password,
            database: parseInt(database),
            createdAt: new Date().toISOString()
        };

        // 添加到连接列表
        this.connections.push(connection);
        this.saveConnections();
        this.renderConnections();
        this.clearForm();
        
        console.log('添加连接成功:', connection);
        alert('连接添加成功！');
    }

    // 清空表单
    clearForm() {
        document.getElementById('connectionName').value = '';
        document.getElementById('host').value = 'localhost';
        document.getElementById('port').value = '6379';
        document.getElementById('password').value = '';
        document.getElementById('database').value = '0';
    }

    // 渲染连接列表
    renderConnections() {
        const connectionsList = document.getElementById('connectionsList');
        
        if (this.connections.length === 0) {
            connectionsList.innerHTML = '<p style="color: #6c757d; font-size: 14px; text-align: center; padding: 20px;">暂无保存的连接</p>';
            return;
        }

        connectionsList.innerHTML = this.connections.map(conn => `
            <div class="connection-item" data-id="${conn.id}">
                <div class="connection-name">${this.escapeHtml(conn.name)}</div>
                <div class="connection-info">${this.escapeHtml(conn.host)}:${conn.port} (DB${conn.database})</div>
            </div>
        `).join('');

        // 绑定连接项点击事件
        connectionsList.querySelectorAll('.connection-item').forEach(item => {
            item.addEventListener('click', () => {
                const connectionId = item.dataset.id;
                this.selectConnection(connectionId);
            });
        });
    }

    // 加载配置文件
    async loadConfigFiles() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/configs`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    this.configFiles = data.data || [];
                    this.renderConfigSelector();
                    console.log('配置文件加载成功:', this.configFiles);
                } else {
                    throw new Error(data.message || '配置文件加载失败');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('加载配置文件失败:', error.message);
            this.configFiles = [];
            this.renderConfigSelector();
        }
    }

    // 渲染配置选择器
    renderConfigSelector() {
        const configSearch = document.getElementById('configSearch');
        const configDropdownList = document.getElementById('configDropdownList');
        const configEmptyState = document.getElementById('configEmptyState');
        
        if (!configSearch || !configDropdownList) {
            console.error('配置选择器元素未找到');
            return;
        }

        // 根据配置文件数量显示/隐藏空状态
        if (configEmptyState) {
            if (this.configFiles.length === 0) {
                configEmptyState.style.display = 'block';
                configSearch.parentElement.parentElement.style.display = 'none';
            } else {
                configEmptyState.style.display = 'none';
                configSearch.parentElement.parentElement.style.display = 'block';
            }
        }

        // 绑定搜索输入事件
        configSearch.removeEventListener('input', this.handleConfigSearchBound);
        configSearch.removeEventListener('focus', this.handleConfigFocusBound);
        configSearch.removeEventListener('blur', this.handleConfigBlurBound);
        
        this.handleConfigSearchBound = this.handleConfigSearch.bind(this);
        this.handleConfigFocusBound = this.handleConfigFocus.bind(this);
        this.handleConfigBlurBound = this.handleConfigBlur.bind(this);
        
        configSearch.addEventListener('input', this.handleConfigSearchBound);
        configSearch.addEventListener('focus', this.handleConfigFocusBound);
        configSearch.addEventListener('blur', this.handleConfigBlurBound);

        // 渲染配置选项
        this.renderConfigOptions();
    }

    // 渲染配置选项
    renderConfigOptions(searchTerm = '') {
        const configDropdownList = document.getElementById('configDropdownList');
        
        if (this.configFiles.length === 0) {
            configDropdownList.innerHTML = '<div class="config-empty-state">暂无可用的配置文件</div>';
            return;
        }

        // 过滤配置文件
        const filteredConfigs = this.configFiles.filter(config => {
            const serviceName = config.service || config.service_name || '';
            return serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   config.file_name.toLowerCase().includes(searchTerm.toLowerCase());
        });

        if (filteredConfigs.length === 0) {
            configDropdownList.innerHTML = '<div class="config-empty-state">未找到匹配的配置文件</div>';
            return;
        }

        configDropdownList.innerHTML = filteredConfigs.map(config => {
            const serviceName = config.service || config.service_name || '未知服务';
            return `
                <div class="config-option" data-config-id="${this.escapeHtml(config.file_name)}">
                    <div class="config-option-name">${this.escapeHtml(serviceName)}</div>
                    <div class="config-option-file">${this.escapeHtml(config.file_name)}</div>
                </div>
            `;
        }).join('');

        // 绑定配置选项点击事件
        configDropdownList.querySelectorAll('.config-option').forEach(option => {
            option.addEventListener('click', () => {
                const configId = option.dataset.configId;
                this.selectConfigFile(configId);
            });
        });
    }

    // 处理配置搜索
    handleConfigSearch(searchTerm) {
        this.renderConfigOptions(searchTerm);
        this.showConfigDropdown();
    }

    // 显示配置下拉列表
    showConfigDropdown() {
        const configDropdownList = document.getElementById('configDropdownList');
        if (configDropdownList) {
            configDropdownList.classList.add('show');
        }
    }

    // 隐藏配置下拉列表
    hideConfigDropdown() {
        const configDropdownList = document.getElementById('configDropdownList');
        if (configDropdownList) {
            configDropdownList.classList.remove('show');
        }
    }

    // 处理配置输入框获得焦点
    handleConfigFocus() {
        const configDropdownList = document.getElementById('configDropdownList');
        configDropdownList.classList.add('show');
        this.renderConfigOptions(document.getElementById('configSearch').value);
    }

    // 处理配置输入框失去焦点
    handleConfigBlur() {
        // 延迟隐藏下拉列表，以便点击事件能够触发
        setTimeout(() => {
            const configDropdownList = document.getElementById('configDropdownList');
            configDropdownList.classList.remove('show');
        }, 200);
    }

    // 选择配置文件
    selectConfigFile(configId) {
        const config = this.configFiles.find(c => c.file_name === configId);
        if (!config) {
            console.error('配置文件未找到:', configId);
            return;
        }

        this.selectedConfig = config;
        
        // 更新输入框显示
        const configSearch = document.getElementById('configSearch');
        const serviceName = config.service || config.service_name || '未知服务';
        configSearch.value = serviceName;
        
        // 隐藏下拉列表
        const configDropdownList = document.getElementById('configDropdownList');
        configDropdownList.classList.remove('show');
        
        // 显示Redis键值
        this.displayRedisKeys(config);
        
        console.log('选择配置文件:', config);
    }

    // 显示Redis键值
    displayRedisKeys(config) {
        const redisKeysTitle = document.getElementById('redisKeysTitle');
        const redisKeysList = document.getElementById('redisKeysList');
        
        // 兼容新旧格式
        const redisKeys = config.redis_keys || config.redis_key || [];
        
        if (!config || redisKeys.length === 0) {
            redisKeysTitle.style.display = 'none';
            redisKeysList.style.display = 'none';
            return;
        }

        // 渲染Redis键值列表 - 只显示name和template，水平排列
        redisKeysList.innerHTML = redisKeys.map(keyObj => {
            // 新格式包含详细信息
            if (keyObj.name && keyObj.template) {
                return `
                    <div class="redis-key-item horizontal">
                        <div class="redis-key-name">${this.escapeHtml(keyObj.name)}</div>
                        <div class="redis-key-template">${this.escapeHtml(keyObj.template)}</div>
                    </div>
                `;
            } else {
                // 旧格式兼容
                const keyValue = keyObj.key || keyObj.template || keyObj.name || '';
                return `
                    <div class="redis-key-item horizontal">
                        <div class="redis-key-name">未知键名</div>
                        <div class="redis-key-template">${this.escapeHtml(keyValue)}</div>
                    </div>
                `;
            }
        }).join('');
        
        // 显示键值展示区域
        redisKeysTitle.style.display = 'block';
        redisKeysList.style.display = 'block';
    }

    // 选择连接
    selectConnection(connectionId) {
        const connection = this.connections.find(conn => conn.id === connectionId);
        if (connection) {
            this.currentConnection = connection;
            console.log('选择连接:', connection);
            alert(`已选择连接: ${connection.name}`);
            this.closeSidebar();
        }
    }

    // 保存连接到本地存储
    saveConnections() {
        try {
            localStorage.setItem('redis_connections', JSON.stringify(this.connections));
        } catch (error) {
            console.error('保存连接失败:', error);
        }
    }

    // 从本地存储加载连接
    loadConnections() {
        try {
            const saved = localStorage.getItem('redis_connections');
            if (saved) {
                this.connections = JSON.parse(saved);
                this.renderConnections();
            }
        } catch (error) {
            console.error('加载连接失败:', error);
            this.connections = [];
        }
    }

    // 加载配置文件
    async loadConfig() {
        try {
            // 尝试从项目根目录加载配置文件
            const configPath = '../../config.json';
            const response = await fetch(configPath);
            
            if (response.ok) {
                const config = await response.json();
                
                // 更新API基础URL
                if (config.frontend && config.frontend.redisManager && config.frontend.redisManager.apiBaseUrl) {
                    this.apiBaseUrl = config.frontend.redisManager.apiBaseUrl;
                    console.log('从配置文件加载API基础URL:', this.apiBaseUrl);
                } else {
                    console.warn('配置文件中未找到redisManager.apiBaseUrl，使用默认值');
                }
                
                // 保存完整配置供其他地方使用
                this.config = config;
                
            } else {
                console.warn('无法加载配置文件，使用默认配置:', response.status);
            }
        } catch (error) {
            console.warn('加载配置文件失败，使用默认配置:', error.message);
        }
    }

    // 获取配置值
    getConfigValue(path, defaultValue) {
        if (!this.config) {
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

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.redisManager = new RedisManager();
    console.log('Redis管理器初始化完成');
});