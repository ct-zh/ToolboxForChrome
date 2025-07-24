// JSON解析器功能实现
class JSONParser {
    constructor() {
        this.jsonInput = document.getElementById('jsonInput');
        this.jsonOutput = document.getElementById('jsonOutput');
        this.validationStatus = document.getElementById('validationStatus');
        this.leftLineNumbers = document.getElementById('leftLineNumbers');
        this.rightLineNumbers = document.getElementById('rightLineNumbers');
        this.copyNotification = document.getElementById('copyNotification');
        
        // 工具栏按钮
        this.expandAllBtn = document.getElementById('expandAllBtn');
        this.collapseAllBtn = document.getElementById('collapseAllBtn');
        this.toggleLineNumbersBtn = document.getElementById('toggleLineNumbersBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.copyJsonBtn = document.getElementById('copyJsonBtn');
        this.toggleEscapeBtn = document.getElementById('toggleEscapeBtn');
        
        // 状态变量
        this.showLineNumbers = false;
        this.escapeStrings = false;
        this.parsedData = null;
        this.expandedNodes = new Set();
        
        this.init();
    }
    
    init() {
        // 绑定事件监听器
        this.jsonInput.addEventListener('input', () => this.handleInputChange());
        this.jsonInput.addEventListener('scroll', () => this.syncLineNumbers());
        
        // 工具栏事件
        this.expandAllBtn.addEventListener('click', () => this.expandAll());
        this.collapseAllBtn.addEventListener('click', () => this.collapseAll());
        this.toggleLineNumbersBtn.addEventListener('click', () => this.toggleLineNumbers());
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        this.copyJsonBtn.addEventListener('click', () => this.copyJson());
        this.toggleEscapeBtn.addEventListener('click', () => this.toggleEscape());
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // 初始化示例数据
        this.loadSampleData();
    }
    
    loadSampleData() {
        const sampleJson = {
            "name": "JSON解析器示例",
            "version": "1.0.0",
            "features": [
                "JSON格式化",
                "语法验证",
                "树形展示",
                "一键复制"
            ],
            "config": {
                "theme": "light",
                "autoFormat": true,
                "showLineNumbers": false
            },
            "metadata": {
                "created": "2024-01-01",
                "author": "DevToolkit",
                "tags": ["json", "parser", "formatter"],
                "isActive": true,
                "count": 42,
                "description": "这是一个功能强大的JSON解析工具，支持格式化、验证和树形展示。"
            }
        };
        
        this.jsonInput.value = JSON.stringify(sampleJson, null, 2);
        
        // 初始化时展开第一层
        this.expandedNodes.add('root');
        
        this.handleInputChange();
    }
    
    handleInputChange() {
        const input = this.jsonInput.value.trim();
        
        if (!input) {
            this.updateValidationStatus('empty', '待输入');
            this.jsonOutput.innerHTML = '<div style="color: #999; text-align: center; padding: 40px;">请在左侧输入有效的JSON数据</div>';
            this.updateLineNumbers();
            return;
        }
        
        try {
            this.parsedData = JSON.parse(input);
            this.updateValidationStatus('valid', '格式正确');
            this.renderJsonTree();
            this.updateLineNumbers();
        } catch (error) {
            this.updateValidationStatus('invalid', '格式错误');
            this.showError(error.message);
            this.updateLineNumbers();
        }
    }
    
    updateValidationStatus(type, message) {
        this.validationStatus.className = `validation-status ${type}`;
        this.validationStatus.textContent = message;
    }
    
    showError(message) {
        this.jsonOutput.innerHTML = `
            <div class="error-message">
                <strong>JSON解析错误：</strong><br>
                ${this.escapeHtml(message)}
            </div>
        `;
    }
    
    renderJsonTree() {
        if (!this.parsedData) return;
        
        this.jsonOutput.innerHTML = '';
        const treeElement = this.createJsonNode(this.parsedData, '', 0, 'root');
        this.jsonOutput.appendChild(treeElement);
        this.updateLineNumbers();
    }
    
    createJsonNode(data, key, level, path = '') {
        const container = document.createElement('div');
        container.className = 'json-node';
        
        // 生成当前节点的路径
        const currentPath = path || (key || 'root');
        
        if (data === null) {
            container.innerHTML = this.formatKeyValue(key, 'null', 'json-null', level);
        } else if (typeof data === 'boolean') {
            container.innerHTML = this.formatKeyValue(key, data.toString(), 'json-boolean', level);
        } else if (typeof data === 'number') {
            container.innerHTML = this.formatKeyValue(key, data.toString(), 'json-number', level);
        } else if (typeof data === 'string') {
            const displayValue = this.escapeStrings ? this.escapeString(data) : data;
            container.innerHTML = this.formatKeyValue(key, `"${displayValue}"`, 'json-string', level);
        } else if (Array.isArray(data)) {
            container.appendChild(this.createCollapsibleNode(data, key, level, currentPath, true));
        } else if (typeof data === 'object') {
            container.appendChild(this.createCollapsibleNode(data, key, level, currentPath, false));
        }
        
        return container;
    }
    
    createCollapsibleNode(data, key, level, path, isArray) {
        const container = document.createElement('div');
        const currentPath = path || (key || 'root');
        // 修改默认展开逻辑：只有在expandedNodes中明确包含的路径才展开
        const isExpanded = this.expandedNodes.has(currentPath);
        
        const header = document.createElement('div');
        header.className = 'json-expandable';
        header.style.marginLeft = `${level * 20}px`;
        
        const toggle = document.createElement('span');
        toggle.className = 'json-toggle';
        toggle.textContent = isExpanded ? '▼' : '▶';
        
        const keySpan = key ? `<span class="json-key">"${key}"</span>: ` : '';
        const bracket = isArray ? '[' : '{';
        const closeBracket = isArray ? ']' : '}';
        const count = isArray ? data.length : Object.keys(data).length;
        
        header.innerHTML = `${keySpan}<span class="json-bracket">${bracket}</span>`;
        
        if (!isExpanded) {
            const preview = document.createElement('span');
            preview.className = 'json-collapsed';
            preview.textContent = ` ... ${count} ${isArray ? 'items' : 'properties'} `;
            header.appendChild(preview);
            
            const closeBracketSpan = document.createElement('span');
            closeBracketSpan.className = 'json-bracket';
            closeBracketSpan.textContent = closeBracket;
            header.appendChild(closeBracketSpan);
        }
        
        header.insertBefore(toggle, header.firstChild);
        
        const content = document.createElement('div');
        content.style.display = isExpanded ? 'block' : 'none';
        
        if (isExpanded) {
            if (isArray) {
                data.forEach((item, index) => {
                    const itemPath = `${currentPath}[${index}]`;
                    content.appendChild(this.createJsonNode(item, index.toString(), level + 1, itemPath));
                });
            } else {
                Object.entries(data).forEach(([objKey, value]) => {
                    const itemPath = currentPath === 'root' ? objKey : `${currentPath}.${objKey}`;
                    content.appendChild(this.createJsonNode(value, objKey, level + 1, itemPath));
                });
            }
            
            const closingBracket = document.createElement('div');
            closingBracket.style.marginLeft = `${level * 20}px`;
            closingBracket.innerHTML = `<span class="json-bracket">${closeBracket}</span>`;
            content.appendChild(closingBracket);
        }
        
        header.addEventListener('click', () => {
            const wasExpanded = content.style.display === 'block';
            content.style.display = wasExpanded ? 'none' : 'block';
            toggle.textContent = wasExpanded ? '▶' : '▼';
            
            if (wasExpanded) {
                this.expandedNodes.delete(currentPath);
                // 重新构建折叠状态的header
                header.innerHTML = `${keySpan}<span class="json-bracket">${bracket}</span>`;
                const preview = document.createElement('span');
                preview.className = 'json-collapsed';
                preview.textContent = ` ... ${count} ${isArray ? 'items' : 'properties'} `;
                header.appendChild(preview);
                
                const closeBracketSpan = document.createElement('span');
                closeBracketSpan.className = 'json-bracket';
                closeBracketSpan.textContent = closeBracket;
                header.appendChild(closeBracketSpan);
                header.insertBefore(toggle, header.firstChild);
            } else {
                this.expandedNodes.add(currentPath);
                // 重新构建展开状态的header
                header.innerHTML = `${keySpan}<span class="json-bracket">${bracket}</span>`;
                header.insertBefore(toggle, header.firstChild);
                
                // 重新渲染内容
                content.innerHTML = '';
                if (isArray) {
                    data.forEach((item, index) => {
                        const itemPath = `${currentPath}[${index}]`;
                        content.appendChild(this.createJsonNode(item, index.toString(), level + 1, itemPath));
                    });
                } else {
                    Object.entries(data).forEach(([objKey, value]) => {
                        const itemPath = currentPath === 'root' ? objKey : `${currentPath}.${objKey}`;
                        content.appendChild(this.createJsonNode(value, objKey, level + 1, itemPath));
                    });
                }
                
                const closingBracket = document.createElement('div');
                closingBracket.style.marginLeft = `${level * 20}px`;
                closingBracket.innerHTML = `<span class="json-bracket">${closeBracket}</span>`;
                content.appendChild(closingBracket);
            }
            
            // 更新行号
            this.updateLineNumbers();
        });
        
        container.appendChild(header);
        container.appendChild(content);
        
        return container;
    }
    
    formatKeyValue(key, value, className, level) {
        const indent = '&nbsp;'.repeat(level * 8);
        const keyPart = key ? `<span class="json-key">"${key}"</span>: ` : '';
        return `<div style="margin-left: ${level * 20}px;">${keyPart}<span class="${className}">${value}</span></div>`;
    }
    
    escapeString(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    expandAll() {
        this.expandedNodes.clear();
        this.expandAllNodes(this.parsedData, 'root');
        this.renderJsonTree();
    }
    
    expandAllNodes(data, path) {
        if (Array.isArray(data)) {
            this.expandedNodes.add(path);
            data.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    this.expandAllNodes(item, `${path}[${index}]`);
                }
            });
        } else if (typeof data === 'object' && data !== null) {
            this.expandedNodes.add(path);
            Object.entries(data).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    const itemPath = path === 'root' ? key : `${path}.${key}`;
                    this.expandAllNodes(value, itemPath);
                }
            });
        }
    }
    
    collapseAll() {
        this.expandedNodes.clear();
        // 不保留任何展开状态，完全折叠
        this.renderJsonTree();
    }
    
    toggleLineNumbers() {
        this.showLineNumbers = !this.showLineNumbers;
        this.toggleLineNumbersBtn.classList.toggle('active', this.showLineNumbers);
        
        if (this.showLineNumbers) {
            this.leftLineNumbers.style.display = 'block';
            this.rightLineNumbers.style.display = 'block';
            this.jsonInput.classList.add('with-line-numbers');
            this.jsonOutput.classList.add('with-line-numbers');
        } else {
            this.leftLineNumbers.style.display = 'none';
            this.rightLineNumbers.style.display = 'none';
            this.jsonInput.classList.remove('with-line-numbers');
            this.jsonOutput.classList.remove('with-line-numbers');
        }
        
        this.updateLineNumbers();
    }
    
    updateLineNumbers() {
        if (!this.showLineNumbers) return;
        
        // 左侧行号：基于输入框的实际行数
        const leftLines = this.jsonInput.value.split('\n').length;
        this.leftLineNumbers.innerHTML = Array.from({length: leftLines}, (_, i) => i + 1).join('\n');
        
        // 右侧行号：基于实际显示的视觉行数
        const rightLines = this.countVisibleLines();
        this.rightLineNumbers.innerHTML = Array.from({length: rightLines}, (_, i) => i + 1).join('\n');
    }
    
    countVisibleLines() {
        // 计算右侧JSON输出区域的实际视觉行数
        const outputElement = this.jsonOutput;
        if (!outputElement.children.length) return 1;
        
        let lineCount = 0;
        
        const countElementLines = (element) => {
            if (element.style.display === 'none') return 0;
            
            // 如果是json-node，计算其内部的行数
            if (element.classList.contains('json-node')) {
                let nodeLines = 0;
                for (let child of element.children) {
                    nodeLines += countElementLines(child);
                }
                return Math.max(nodeLines, 1); // 至少算作1行
            }
            
            // 如果是json-expandable（头部），算作1行
            if (element.classList.contains('json-expandable')) {
                return 1;
            }
            
            // 如果是包含json-bracket的div（结束括号），算作1行
            if (element.innerHTML && element.innerHTML.includes('json-bracket')) {
                return 1;
            }
            
            // 如果是包含具体值的div，算作1行
            if (element.innerHTML && (
                element.innerHTML.includes('json-string') ||
                element.innerHTML.includes('json-number') ||
                element.innerHTML.includes('json-boolean') ||
                element.innerHTML.includes('json-null')
            )) {
                return 1;
            }
            
            // 递归计算子元素
            let childLines = 0;
            for (let child of element.children) {
                childLines += countElementLines(child);
            }
            
            return childLines;
        };
        
        for (let child of outputElement.children) {
            lineCount += countElementLines(child);
        }
        
        return Math.max(lineCount, 1);
    }
    
    syncLineNumbers() {
        if (!this.showLineNumbers) return;
        
        const scrollTop = this.jsonInput.scrollTop;
        this.leftLineNumbers.scrollTop = scrollTop;
    }
    
    clearAll() {
        if (confirm('确定要清空所有数据吗？')) {
            this.jsonInput.value = '';
            this.jsonOutput.innerHTML = '<div style="color: #999; text-align: center; padding: 40px;">请在左侧输入有效的JSON数据</div>';
            this.updateValidationStatus('empty', '待输入');
            this.parsedData = null;
            this.expandedNodes.clear();
            this.updateLineNumbers();
        }
    }
    
    copyJson() {
        if (!this.parsedData) {
            this.showCopyNotification('没有可复制的数据');
            return;
        }
        
        try {
            const jsonString = JSON.stringify(this.parsedData, null, 2);
            navigator.clipboard.writeText(jsonString).then(() => {
                this.showCopyNotification('JSON数据已复制到剪贴板');
            }).catch(() => {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = jsonString;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showCopyNotification('JSON数据已复制到剪贴板');
            });
        } catch (error) {
            this.showCopyNotification('复制失败');
        }
    }
    
    toggleEscape() {
        this.escapeStrings = !this.escapeStrings;
        this.toggleEscapeBtn.classList.toggle('active', this.escapeStrings);
        
        if (this.parsedData) {
            this.renderJsonTree();
        }
    }
    
    showCopyNotification(message) {
        this.copyNotification.textContent = message;
        this.copyNotification.classList.add('show');
        
        setTimeout(() => {
            this.copyNotification.classList.remove('show');
        }, 2000);
    }
    
    handleKeydown(e) {
        // Ctrl/Cmd + Enter: 格式化JSON
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.formatInput();
        }
        
        // Ctrl/Cmd + K: 清空
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.clearAll();
        }
        
        // Ctrl/Cmd + C: 复制（当焦点不在输入框时）
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.activeElement !== this.jsonInput) {
            e.preventDefault();
            this.copyJson();
        }
    }
    
    formatInput() {
        try {
            const parsed = JSON.parse(this.jsonInput.value);
            this.jsonInput.value = JSON.stringify(parsed, null, 2);
            this.handleInputChange();
        } catch (error) {
            // 如果解析失败，不做任何操作
        }
    }
}

// 初始化JSON解析器
document.addEventListener('DOMContentLoaded', () => {
    new JSONParser();
});

// 添加一些实用的全局函数
window.jsonParser = {
    // 美化JSON字符串
    beautify: (jsonString) => {
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed, null, 2);
        } catch (error) {
            throw new Error('Invalid JSON string');
        }
    },
    
    // 压缩JSON字符串
    minify: (jsonString) => {
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed);
        } catch (error) {
            throw new Error('Invalid JSON string');
        }
    },
    
    // 验证JSON字符串
    validate: (jsonString) => {
        try {
            JSON.parse(jsonString);
            return { valid: true, error: null };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
};