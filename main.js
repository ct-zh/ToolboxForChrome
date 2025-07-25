document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('mainContent');
    const backButton = document.getElementById('backButton');
    const initialMainContentHTML = mainContent.innerHTML; // 捕获初始HTML内容

    function bindMainButtons() {
        document.getElementById('timestamp').addEventListener('click', function() {
            loadPage('pages/timestamp/index.html');
        });

        document.getElementById('urlEncoderDecoder').addEventListener('click', function() {
            loadPage('pages/urlEncoderDecoder/index.html');
        });

        document.getElementById('apiTester').addEventListener('click', function() {
            chrome.tabs.create({
                url: chrome.runtime.getURL('pages/apiTester/index.html'),
                active: true
            });
        });

        document.getElementById('qrcode').addEventListener('click', function() {
            loadPage('pages/qrcode/index.html');
        });
        
        document.getElementById('imageBase64').addEventListener('click', function() {
            loadPage('pages/imageBase64/index.html');
        });
        
        document.getElementById('jsonParser').addEventListener('click', function() {
            chrome.tabs.create({
                url: chrome.runtime.getURL('pages/jsonParser/index.html'),
                active: true
            });
        });
        
        document.getElementById('redisManager').addEventListener('click', function() {
            loadPage('pages/redisManager/index.html');
        });
    }

    bindMainButtons();

    // 返回按钮事件
    backButton.addEventListener('click', function() {
        showMainContent();
    });

    function showMainContent() {
        mainContent.innerHTML = initialMainContentHTML;
        mainContent.className = 'tools-grid';
        backButton.style.display = 'none';
        // 重新绑定事件监听器
        bindMainButtons();
    }

    function loadPage(pageName) {
        mainContent.innerHTML = '';
        mainContent.className = 'iframe-container';
        backButton.style.display = 'block';
        
        const iframe = document.createElement('iframe');
        iframe.id = 'contentFrame';
        iframe.src = chrome.runtime.getURL(pageName);
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.style.borderRadius = '16px';
        iframe.style.flex = '1'; // 让iframe占满flex容器
        iframe.style.minHeight = '0'; // 允许iframe缩小
        mainContent.appendChild(iframe);
    }

    // 监听子页面发送的消息
    window.addEventListener('message', function(event) {
        if (event.data.type === 'goHome') {
            showMainContent();
        }
    });

    // 键盘快捷键支持
    document.addEventListener('keydown', function(event) {
        // ESC键返回主页
        if (event.key === 'Escape') {
            showMainContent();
        }
    });
});