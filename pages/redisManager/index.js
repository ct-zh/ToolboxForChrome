// Redis管理器JavaScript逻辑

class RedisManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8080';
        this.connections = [];
        this.currentConnection = null;
        this.init();
    }

    // 初始化
    init() {
        this.bindEvents();
        this.loadConnections();
        this.checkServiceStatus();
        
        // 定期检查服务状态
        setInterval(() => {
            this.checkServiceStatus();
        }, 30000); // 每30秒检查一次
    }

    // 绑定事件
    bindEvents() {
        // 侧边栏控制
        document.getElementById('openSidebar').addEventListener('click', () => {
            this.openSidebar();
        });

        document.getElementById('closeSidebar').addEventListener('click', () => {
            this.closeSidebar();
        });

        document.getElementById('overlay').addEventListener('click', () => {
            this.closeSidebar();
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

        // ESC键关闭侧边栏
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
            }
        });
    }

    // 打开侧边栏
    openSidebar() {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('overlay').classList.add('show');
    }

    // 关闭侧边栏
    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('show');
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