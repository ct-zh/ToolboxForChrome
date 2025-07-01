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
    const backButton = document.getElementById('backButton');

    // 恢复上次打开的页面
    chrome.storage.local.get(['lastOpenedPage'], function(result) {
        if (result.lastOpenedPage) {
            loadPage(result.lastOpenedPage);
        }
    });

    document.getElementById('timestamp').addEventListener('click', function() {
        loadPage('timestamp.html');
    });

    document.getElementById('urlEncoderDecoder').addEventListener('click', function() {
        loadPage('urlEncoderDecoder.html');
    });

    document.getElementById('qrcode').addEventListener('click', function() {
        loadPage('qrcode.html');
    });

    backButton.addEventListener('click', function() {
        mainContent.innerHTML = `
            <h2>开发者工具 Dev Tools</h2>
            <button id="timestamp">时间戳转换</button>
            <button id="qrcode">二维码生成</button>
            <button id="urlEncoderDecoder">URL 编码/解码</button>
        `;
        // 重新绑定事件监听器
        document.getElementById('timestamp').addEventListener('click', function() {
            loadPage('timestamp.html');
        });
        document.getElementById('qrcode').addEventListener('click', function() {
            loadPage('qrcode.html');
        });
        document.getElementById('urlEncoderDecoder').addEventListener('click', function() {
            loadPage('urlEncoderDecoder.html');
        });
        chrome.storage.local.remove('lastOpenedPage');
        backButton.style.display = 'none';
    });

    function loadPage(pageName) {
        mainContent.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = chrome.runtime.getURL(pageName);
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        mainContent.appendChild(iframe);
        chrome.storage.local.set({lastOpenedPage: pageName});
        backButton.style.display = 'block';
    }

    // 监听子页面发送的消息
    window.addEventListener('message', function(event) {
        if (event.data.action === 'goHome') {
            backButton.click(); // 模拟点击返回按钮
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