// JSON格式化功能
// document.getElementById('jsonFormat').addEventListener('click', () => {
//   chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
//     chrome.scripting.executeScript({
//       target: {tabId: tabs[0].id},
//       function: formatJSON
//     });
//   });
// });

// 时间戳转换功能
document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('mainContent');
    const initialMainContentHTML = mainContent.innerHTML; // 捕获初始HTML内容
    // const backButton = document.getElementById('backButton');

    // 恢复上次打开的页面
    chrome.storage.local.get(['lastOpenedPage'], function(result) {
        if (result.lastOpenedPage) {
            loadPage(result.lastOpenedPage);
        }
    });

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
    }

    bindMainButtons();

    function showMainContent() {
        mainContent.innerHTML = initialMainContentHTML;
        mainContent.className = 'tools-grid';
        // 重新绑定事件监听器
        bindMainButtons();
        chrome.storage.local.remove('lastOpenedPage');
    }

    function loadPage(pageName) {
        mainContent.innerHTML = '';
        mainContent.className = 'iframe-container';
        const iframe = document.createElement('iframe');
        iframe.id = 'contentFrame';
        iframe.src = chrome.runtime.getURL(pageName);
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.style.overflow = 'hidden';
        mainContent.appendChild(iframe);
        chrome.storage.local.set({lastOpenedPage: pageName});
    }

    // 监听子页面发送的消息
    window.addEventListener('message', function(event) {
        if (event.data.type === 'goHome') {
            showMainContent();
        }
    });
});



// Base64编码/解码功能
// document.getElementById('base64').addEventListener('click', () => {
//   chrome.tabs.create({url: 'base64.html'});
// });

function formatJSON() {
  // 这里实现JSON格式化逻辑
  alert('JSON格式化功能开发中');
}