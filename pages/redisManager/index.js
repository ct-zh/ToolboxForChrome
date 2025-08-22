// Redis管理器JavaScript逻辑

class RedisManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8080'; // 默认值，将从配置文件覆盖
        this.connections = [];
        this.currentConnection = null;
        this.configFiles = [];
        this.selectedConfig = null;
        this.cryptoUtils = new CryptoUtils(); // RSA加密工具
        this.currentToken = null; // 当前连接token
        
        // Redis组件相关
        this.eventBus = null;
        this.redisApiService = null;
        this.keyListComponent = null;
        this.keyOperationComponent = null;
        this.ttlCountdownComponent = null;
        
        this.init();
    }

    // 初始化
    async init() {
        await this.loadConfig(); // 首先加载配置
        this.initCrypto(); // 初始化加密工具
        this.initRedisComponents(); // 初始化Redis组件
        this.bindEvents();
        this.loadConnections();
        this.loadConfigFiles();
        this.checkServiceStatus();
        this.initSimplifiedComponents(); // 初始化简化组件
        
        // 定期检查服务状态
        setInterval(() => {
            this.checkServiceStatus();
        }, 30000); // 每30秒检查一次
    }

    // 绑定事件
    bindEvents() {
        // 侧边栏切换按钮
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

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

        // 新增卡片按钮
        const addCardButton = document.getElementById('addCardButton');
        if (addCardButton) {
            addCardButton.addEventListener('click', () => {
                this.addNewCard();
            });
        }

        // 统一的关闭按钮事件处理（使用事件委托）
        const cardsContainer = document.querySelector('.cards-container');
        if (cardsContainer) {
            cardsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('card-close-btn')) {
                    const cardId = e.target.getAttribute('data-card-id');
                    this.removeCard(cardId);
                }
            });
        }
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
            statusText.style.cursor = 'default';
            statusText.onclick = null;
            
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
                statusText.style.cursor = 'default';
                statusText.onclick = null;
                console.log('服务状态检查成功:', data);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            statusLight.classList.remove('connected');
            statusText.textContent = '点击重新连接';
            statusText.style.cursor = 'pointer';
            statusText.style.color = '#74D0CB';
            statusText.style.textDecoration = 'underline';
            statusText.onclick = () => {
                this.checkServiceStatus();
            };
            console.error('服务状态检查失败:', error.message);
        }
    }

    // 初始化加密工具
    initCrypto() {
        try {
            const publicKey = CryptoUtils.getPublicKeyFromConfig(this.config);
            if (publicKey) {
                this.cryptoUtils.init(publicKey);
                console.log('RSA加密工具初始化成功');
            } else {
                console.error('无法从配置中获取RSA公钥');
            }
        } catch (error) {
            console.error('初始化RSA加密工具失败:', error);
        }
    }

    // 初始化Redis组件
    initRedisComponents() {
        try {
            // 检查RedisBaseManager类是否存在
            if (typeof RedisBaseManager === 'undefined') {
                console.warn('RedisBaseManager类未加载，跳过组件初始化');
                return;
            }

            // 初始化事件总线
            this.eventBus = new EventBus();
            console.log('EventBus初始化成功');

            // 初始化API服务
            this.redisApiService = new RedisApiService(this.apiBaseUrl);
            console.log('RedisApiService初始化成功');

            // 绑定Redis相关事件
            this.bindRedisEvents();

            // 默认加载一个base类型的Redis管理卡片
            this.loadRedisCard('base');

            console.log('所有Redis组件初始化完成');
        } catch (error) {
            console.error('初始化Redis组件失败:', error);
        }
    }

    // 绑定Redis相关事件
    bindRedisEvents() {
        if (!this.eventBus) {
            return;
        }

        // 监听连接状态变化
        this.eventBus.on(REDIS_EVENTS.CONNECTION_CHANGED, (isConnected, connectionInfo) => {
            this.updateRedisCardStatus(isConnected, connectionInfo);
        });

        // 监听错误事件
        this.eventBus.on(REDIS_EVENTS.UI_ERROR, (message) => {
            console.error('Redis组件错误:', message);
            this.showErrorMessage(message);
        });

        // 监听成功事件
        this.eventBus.on(REDIS_EVENTS.UI_SUCCESS, (message) => {
            console.log('Redis组件成功:', message);
            this.showSuccessMessage(message);
        });

        console.log('Redis事件绑定完成');
    }

    // 更新Redis卡片状态
    updateRedisCardStatus(isConnected, connectionInfo) {
        // 更新所有Redis卡片的状态
        const redisCardStatuses = document.querySelectorAll('[id^="redisCardStatus"]');
        
        redisCardStatuses.forEach(statusElement => {
            if (isConnected && connectionInfo) {
                statusElement.textContent = `已连接: ${connectionInfo.host}:${connectionInfo.port}`;
                statusElement.style.background = '#d1fae5';
                statusElement.style.color = '#065f46';
            } else {
                statusElement.textContent = '未连接';
                statusElement.style.background = '#fef3c7';
                statusElement.style.color = '#d97706';
            }
        });
    }

    // 显示错误消息
    showErrorMessage(message) {
        // 简单的错误提示，可以后续改为更好的UI组件
        console.error(message);
        // 可以在这里添加toast通知或其他UI反馈
    }

    // 显示成功消息
    showSuccessMessage(message) {
        // 简单的成功提示，可以后续改为更好的UI组件
        console.log(message);
        // 可以在这里添加toast通知或其他UI反馈
    }

    // 设置Redis API认证信息
    setRedisApiAuth(token) {
        if (this.redisApiService && token) {
            this.redisApiService.setAuth(token);
            console.log('Redis API认证信息已设置');
        }
    }

    // 清除Redis API认证信息
    clearRedisApiAuth() {
        if (this.redisApiService) {
            this.redisApiService.clearAuth();
            console.log('Redis API认证信息已清除');
        }
    }

    // 添加连接
    async addConnection() {
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

        try {
            // 显示连接中状态
            this.showConnectingStatus(name);
            
            // 加密密码
            let encryptedPassword = '';
            if (password) {
                encryptedPassword = this.cryptoUtils.encryptPassword(password);
            }

            // 调用后端连接接口
            const response = await fetch(`${this.apiBaseUrl}/api/redis/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    host: host,
                    port: parseInt(port),
                    password: encryptedPassword,
                    database: parseInt(database)
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // 连接成功，保存连接信息和token
                const connection = {
                    id: result.data.connection_id,
                    name: name,
                    host: host,
                    port: parseInt(port),
                    password: password, // 本地存储明文密码
                    database: parseInt(database),
                    createdAt: new Date().toISOString()
                };

                // 保存token
                this.currentToken = result.data.token;
                this.currentConnection = connection;

                // 设置Redis API认证信息
                this.setRedisApiAuth(this.currentToken);

                // 触发连接状态变化事件
                if (this.eventBus) {
                    this.eventBus.emit(REDIS_EVENTS.CONNECTION_CHANGED, true, {
                        host: connection.host,
                        port: connection.port,
                        database: connection.database
                    });
                }

                // 添加到连接列表并保存
                this.connections.push(connection);
                this.saveConnections();
                this.renderConnections();
                this.clearForm();

                // 显示连接成功状态
                this.showConnectionStatus(connection);
                
                console.log('Redis连接成功:', connection);
                alert(`连接 "${name}" 建立成功！`);
            } else {
                // 连接失败
                const errorMsg = result.message || '连接失败';
                console.error('Redis连接失败:', errorMsg);
                alert(`连接失败: ${errorMsg}`);
                this.hideConnectionStatus();
            }
        } catch (error) {
            console.error('连接过程中发生错误:', error);
            alert(`连接失败: ${error.message}`);
            this.hideConnectionStatus();
        }
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
        
        const redisKeys = config.redis_keys || [];
        
        if (!config || redisKeys.length === 0) {
            redisKeysTitle.style.display = 'none';
            redisKeysList.style.display = 'none';
            return;
        }

        // 渲染Redis键值列表 - 将name和template合并到一个div中
        redisKeysList.innerHTML = redisKeys.map(keyObj => {
            // 只支持新格式包含详细信息
            if (keyObj.name && keyObj.template) {
                return `
                    <div class="redis-key-item horizontal">
                        <div class="redis-key-content">${this.escapeHtml(keyObj.name)}: ${this.escapeHtml(keyObj.template)}</div>
                    </div>
                `;
            }
            return ''; // 不符合新格式的数据不显示
        }).filter(item => item !== '').join('');
        
        // 显示键值展示区域
        redisKeysTitle.style.display = 'block';
        redisKeysList.style.display = 'block';
    }

    // 显示连接中状态
    showConnectingStatus(connectionName) {
        const statusElement = this.getOrCreateStatusElement();
        statusElement.innerHTML = `
            <span class="status-dot connecting"></span>
            <span class="status-text">正在连接到 ${this.escapeHtml(connectionName)}...</span>
        `;
        statusElement.style.display = 'inline-flex';
    }

    // 显示连接成功状态
    showConnectionStatus(connection) {
        const statusElement = this.getOrCreateStatusElement();
        statusElement.innerHTML = `
            <span class="status-dot connected"></span>
            <span class="status-text">已连接到 ${this.escapeHtml(connection.name)} (${this.escapeHtml(connection.host)}:${connection.port}/DB${connection.database})</span>
        `;
        statusElement.style.display = 'inline-flex';
    }

    // 隐藏连接状态
    hideConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.style.display = 'none';
        }
    }

    // 获取或创建状态元素
    getOrCreateStatusElement() {
        let statusElement = document.getElementById('connectionStatus');
        if (!statusElement) {
            // 创建状态元素
            statusElement = document.createElement('div');
            statusElement.id = 'connectionStatus';
            statusElement.className = 'connection-status';
            
            // 找到h1元素并在其后插入状态元素
            const h1Element = document.querySelector('.main-content h1');
            if (h1Element) {
                h1Element.parentNode.insertBefore(statusElement, h1Element.nextSibling);
            }
        }
        return statusElement;
    }

    // 选择连接
    async selectConnection(connectionId) {
        const connection = this.connections.find(conn => conn.id === connectionId);
        if (!connection) {
            return;
        }

        try {
            // 显示连接中状态
            this.showConnectingStatus(connection.name);
            
            // 加密密码
            let encryptedPassword = '';
            if (connection.password) {
                encryptedPassword = this.cryptoUtils.encryptPassword(connection.password);
            }

            // 重新连接到Redis
            const response = await fetch(`${this.apiBaseUrl}/api/redis/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    host: connection.host,
                    port: connection.port,
                    password: encryptedPassword,
                    database: connection.database
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // 连接成功
                this.currentToken = result.data.token;
                this.currentConnection = connection;

                // 设置Redis API认证信息
                this.setRedisApiAuth(this.currentToken);

                // 触发连接状态变化事件
                if (this.eventBus) {
                    this.eventBus.emit(REDIS_EVENTS.CONNECTION_CHANGED, true, {
                        host: connection.host,
                        port: connection.port,
                        database: connection.database
                    });
                }

                // 显示连接成功状态
                this.showConnectionStatus(connection);
                
                console.log('Redis重连成功:', connection);
                alert(`已连接到: ${connection.name}`);
                
                // 关闭侧边栏
                this.toggleSidebar();
            } else {
                // 连接失败
                const errorMsg = result.message || '连接失败';
                console.error('Redis重连失败:', errorMsg);
                alert(`连接失败: ${errorMsg}`);
                this.hideConnectionStatus();
            }
        } catch (error) {
            console.error('重连过程中发生错误:', error);
            alert(`连接失败: ${error.message}`);
            this.hideConnectionStatus();
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
            // 尝试加载配置文件
            const response = await fetch('../../config.json');
            if (response.ok) {
                this.config = await response.json();
                this.apiBaseUrl = this.config?.frontend?.redisManager?.apiBaseUrl || 'http://localhost:11367';
                console.log('从配置文件加载API基础URL:', this.apiBaseUrl);
            } else {
                throw new Error('配置文件加载失败');
            }
        } catch (error) {
            console.warn('加载配置文件失败，使用默认配置:', error.message);
            // 使用默认值
            this.apiBaseUrl = 'http://localhost:11367';
            this.config = {
                security: {
                    encryption: {
                        publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA02qULC84fzNoKsTwAso6\nDMElWR+DP1x/0lPVHu7UjHAyn8QebXCHxmO+KIGL72KQuor7LtZOOs+chVVAieCx\nxp4fZMBmW0gDmshtDEoCNz7qRIh7fbA6qsPs3VMhsSQGmUlQqSX31COleYxiFCok\nQKUK+BzJnl3GA7SDVCgVeDGj5SYJzFFKwWly6qKRWe4NFFnNDdVSTNqeDOZJGH8k\nH5DIBi1PLn5qvUutmflakZkIElGWP3IHTXXv2V16ZIBpt22KdmNvpcLChOasdMGX\nFF08qo1vphZmAQtYsTScKkyToqXwjVKSBF77FmkJ1uoLy1XLmWy9bzIszERrybmZ\nyQIDAQAB\n-----END PUBLIC KEY-----"
                    }
                }
            };
        }
    }

    // 获取配置值
    getConfigValue(path, defaultValue) {
        if (!this.config) return defaultValue;
        
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

    // 切换侧边栏显示/隐藏
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const mainContent = document.querySelector('.main-content');
        
        sidebar.classList.toggle('hidden');
        toggleBtn.classList.toggle('sidebar-visible');
        mainContent.classList.toggle('sidebar-hidden');
        
        // 更新按钮图标
        if (sidebar.classList.contains('hidden')) {
            toggleBtn.textContent = '▶';
        } else {
            toggleBtn.textContent = '◀';
        }
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 初始化简化组件
    initSimplifiedComponents() {
        this.currentSelectedKey = null;
        this.ttlInterval = null;
        
        // 绑定删除按钮事件
        const deleteBtn = document.getElementById('deleteKeyBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteCurrentKey();
            });
        }
        
        // 模拟选择一个键进行演示
        setTimeout(() => {
            this.selectKey({
                name: 'user:session:12345',
                type: 'string',
                value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                ttl: 3600
            });
        }, 2000);
    }

    // 选择键
    selectKey(keyData) {
        this.currentSelectedKey = keyData;
        
        // 更新键值展示
        this.updateKeyDisplay(keyData);
        
        // 更新键类型展示
        this.updateKeyType(keyData.type);
        
        // 启动TTL倒计时
        this.startTTLCountdown(keyData.ttl);
        
        // 启用所有删除按钮
        const deleteBtns = document.querySelectorAll('[id^="deleteKeyBtn"]');
        deleteBtns.forEach(btn => btn.disabled = false);
    }

    // 更新键值展示
    updateKeyDisplay(keyData) {
        const keyNameElements = document.querySelectorAll('[id^="displayKeyName"]');
        const keyValueElements = document.querySelectorAll('[id^="displayKeyValue"]');
        
        keyNameElements.forEach(el => {
            el.textContent = keyData.name;
        });
        
        keyValueElements.forEach(el => {
            // 截断长值进行预览
            let preview = keyData.value;
            if (preview && preview.length > 50) {
                preview = preview.substring(0, 50) + '...';
            }
            el.textContent = preview || '-';
        });
    }

    // 更新键类型展示
    updateKeyType(type) {
        const typeElements = document.querySelectorAll('[id^="currentKeyType"]');
        const typeMap = {
            'string': '📝 String',
            'hash': '🗂️ Hash',
            'list': '📋 List',
            'set': '🔗 Set',
            'zset': '📊 ZSet'
        };
        
        typeElements.forEach(el => {
            el.textContent = typeMap[type] || '❓ 未知类型';
            el.className = `key-type-badge type-${type}`;
        });
    }

    // 启动TTL倒计时
    startTTLCountdown(initialTTL) {
        // 清除之前的倒计时
        if (this.ttlInterval) {
            clearInterval(this.ttlInterval);
        }
        
        let currentTTL = initialTTL;
        
        const updateCountdown = () => {
            const countdownElements = document.querySelectorAll('[id^="currentTTLCountdown"]');
            const statusElements = document.querySelectorAll('[id^="ttlStatus"]');
            
            if (countdownElements.length === 0 || statusElements.length === 0) return;
            
            if (currentTTL === -1) {
                // 永不过期
                countdownElements.forEach(el => {
                    el.textContent = '∞';
                    el.className = 'ttl-time';
                });
                statusElements.forEach(el => el.textContent = '永不过期');
            } else if (currentTTL <= 0) {
                // 已过期
                countdownElements.forEach(el => {
                    el.textContent = '00:00:00';
                    el.className = 'ttl-time critical';
                });
                statusElements.forEach(el => el.textContent = '已过期');
                clearInterval(this.ttlInterval);
            } else {
                // 格式化时间显示
                const hours = Math.floor(currentTTL / 3600);
                const minutes = Math.floor((currentTTL % 3600) / 60);
                const seconds = currentTTL % 60;
                
                let timeStr;
                if (hours > 0) {
                    timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
                
                countdownElements.forEach(el => {
                    el.textContent = timeStr;
                    
                    // 设置样式
                    if (currentTTL <= 60) {
                        el.className = 'ttl-time critical';
                    } else if (currentTTL <= 300) {
                        el.className = 'ttl-time warning';
                    } else {
                        el.className = 'ttl-time';
                    }
                });
                
                statusElements.forEach(el => {
                    if (currentTTL <= 60) {
                        el.textContent = '即将过期';
                    } else if (currentTTL <= 300) {
                        el.textContent = '注意过期时间';
                    } else {
                        el.textContent = '正常';
                    }
                });
                
                currentTTL--;
            }
        };
        
        // 立即更新一次
        updateCountdown();
        
        // 如果有TTL，启动定时器
        if (currentTTL > 0) {
            this.ttlInterval = setInterval(updateCountdown, 1000);
        }
    }

    // 删除当前键
    async deleteCurrentKey() {
        if (!this.currentSelectedKey) {
            alert('没有选择要删除的键');
            return;
        }
        
        const keyName = this.currentSelectedKey.name;
        
        // 确认删除
        if (!confirm(`确定要删除键 "${keyName}" 吗？\n\n此操作不可撤销！`)) {
            return;
        }
        
        try {
            // 这里应该调用实际的删除API
            console.log('删除键:', keyName);
            
            // 模拟删除成功
            alert(`键 "${keyName}" 已删除`);
            
            // 清空当前选择
            this.clearCurrentKey();
            
        } catch (error) {
            console.error('删除键失败:', error);
            alert(`删除失败: ${error.message}`);
        }
    }

    // 清空当前键
    clearCurrentKey() {
        this.currentSelectedKey = null;
        
        // 清除TTL倒计时
        if (this.ttlInterval) {
            clearInterval(this.ttlInterval);
            this.ttlInterval = null;
        }
        
        // 重置所有卡片的显示
        const keyNameElements = document.querySelectorAll('[id^="displayKeyName"]');
        const keyValueElements = document.querySelectorAll('[id^="displayKeyValue"]');
        const typeElements = document.querySelectorAll('[id^="currentKeyType"]');
        const countdownElements = document.querySelectorAll('[id^="currentTTLCountdown"]');
        const statusElements = document.querySelectorAll('[id^="ttlStatus"]');
        const deleteBtns = document.querySelectorAll('[id^="deleteKeyBtn"]');
        
        keyNameElements.forEach(el => el.textContent = '未选择键');
        keyValueElements.forEach(el => el.textContent = '-');
        typeElements.forEach(el => {
            el.textContent = '未知类型';
            el.className = 'key-type-badge';
        });
        countdownElements.forEach(el => {
            el.textContent = '∞';
            el.className = 'ttl-time';
        });
        statusElements.forEach(el => el.textContent = '永不过期');
        deleteBtns.forEach(btn => btn.disabled = true);
    }

    // 加载Redis卡片
    async loadRedisCard(cardType = 'base', cardId = null) {
        try {
            // 生成唯一的卡片ID
            const uniqueId = cardId || `redis-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // 获取卡片容器
            const cardsContainer = document.querySelector('.cards-container');
            const addCardButton = document.getElementById('addCardButton');
            
            if (!cardsContainer) {
                console.error('未找到卡片容器');
                return null;
            }

            // 加载对应类型的HTML模板
            const response = await fetch(`components/${cardType}/${cardType}.html`);
            if (!response.ok) {
                throw new Error(`无法加载${cardType}卡片模板`);
            }
            
            const htmlContent = await response.text();
            
            // 创建新的卡片容器
            const cardContainer = document.createElement('div');
            cardContainer.className = 'redis-card-wrapper';
            cardContainer.id = uniqueId;
            cardContainer.style.position = 'relative';
            cardContainer.innerHTML = htmlContent;
            
            // 创建关闭按钮
            const closeButton = document.createElement('button');
            closeButton.className = 'card-close-btn';
            closeButton.id = `cardCloseBtn-${uniqueId}`;
            closeButton.title = '关闭卡片';
            closeButton.innerHTML = '✕';
            closeButton.setAttribute('data-card-id', uniqueId);
            
            // 将关闭按钮添加到卡片容器中
            cardContainer.appendChild(closeButton);
            
            // 更新卡片内部的ID，确保唯一性
            this.updateCardIds(cardContainer, uniqueId);
            
            // 插入卡片
            if (addCardButton) {
                cardsContainer.insertBefore(cardContainer, addCardButton);
            } else {
                cardsContainer.appendChild(cardContainer);
            }
            
            // 如果是base类型，初始化Redis基础管理器
            if (cardType === 'base') {
                const redisManagerCard = cardContainer.querySelector('.redis-manager-card');
                if (redisManagerCard && typeof RedisBaseManager !== 'undefined') {
                    const redisBaseManager = new RedisBaseManager(
                        redisManagerCard,
                        this.redisApiService,
                        this.eventBus
                    );
                    console.log(`Redis基础管理器初始化成功 - 卡片ID: ${uniqueId}`);
                }
            }
            
            console.log(`${cardType}类型卡片加载成功 - ID: ${uniqueId}`);
            return uniqueId;
            
        } catch (error) {
            console.error(`加载${cardType}卡片失败:`, error);
            return null;
        }
    }
    
    // 更新卡片内部元素的ID，确保唯一性
    updateCardIds(cardContainer, uniqueId) {
        const elementsWithId = cardContainer.querySelectorAll('[id]');
        elementsWithId.forEach(element => {
            const originalId = element.id;
            element.id = `${originalId}-${uniqueId}`;
        });
    }



    // 新增卡片
    addNewCard() {
        // 默认新增base类型的卡片
        this.loadRedisCard('base');
        console.log('新增base类型卡片');
    }

    // 移除卡片
    removeCard(cardId) {
        if (!cardId) {
            console.error('无效的卡片ID');
            return;
        }

        // 确认删除
        if (!confirm('确定要关闭这个卡片吗？')) {
            return;
        }

        const cardContainer = document.getElementById(cardId);
        if (!cardContainer) {
            console.error(`未找到ID为 ${cardId} 的卡片`);
            return;
        }

        // 添加移除动画
        cardContainer.style.transition = 'all 0.3s ease';
        cardContainer.style.transform = 'scale(0.8)';
        cardContainer.style.opacity = '0';

        // 延迟移除DOM元素
        setTimeout(() => {
            if (cardContainer.parentNode) {
                cardContainer.parentNode.removeChild(cardContainer);
                console.log(`卡片 ${cardId} 已移除`);
            }
        }, 300);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.redisManager = new RedisManager();
    console.log('Redis管理器初始化完成');
});