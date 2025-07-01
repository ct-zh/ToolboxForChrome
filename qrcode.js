document.addEventListener('DOMContentLoaded', function() {
    const navbarFrame = document.getElementById('navbarFrame');
    if (navbarFrame) {
        navbarFrame.onload = () => {
            navbarFrame.contentWindow.postMessage({ type: 'setTitle', title: '二维码生成' }, '*');
        };
    }

    const qrInput = document.getElementById('qrInput');
    const generateQrBtn = document.getElementById('generateQr');
    const qrcodeDiv = document.getElementById('qrcode');
    const historyListDiv = document.getElementById('historyList');
    const historyTitle = document.getElementById('historyTitle');

    // 引入 qrcode.min.js 库
    const script = document.createElement('script');
    script.src = '../js/qrcode.min.js';
    script.onload = () => {
        generateQrBtn.addEventListener('click', () => {
            const text = qrInput.value;
            if (text) {
                qrcodeDiv.innerHTML = ''; // 清空之前的二维码
                new QRCode(qrcodeDiv, {
                    text: text,
                    width: 256,
                    height: 256,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });


                // 保存历史记录
                chrome.storage.local.get(['qrHistory'], function(result) {
                    let history = result.qrHistory || [];
                    // 检查是否已存在，如果存在则移除旧的，确保最新
                    history = history.filter(item => item !== text);
                    history.unshift(text); // 添加到最前面
                    if (history.length > 5) {
                        history = history.slice(0, 5); // 只保留最近5条
                    }
                    chrome.storage.local.set({'qrHistory': history}, function() {
                        renderHistory(history);
                    });
                });
            } else {
                alert('请输入要生成二维码的内容！');
            }
        });
    };
    document.head.appendChild(script);

    // 渲染历史记录列表
    function renderHistory(history) {
        historyListDiv.innerHTML = '';
        if (history && history.length > 0) {
            historyTitle.style.display = 'block'; // 显示标题
            historyListDiv.style.display = 'block'; // 显示列表
            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.textContent = item.length > 50 ? item.substring(0, 50) + '...' : item; // 只显示一行
                historyItem.title = item; // 完整内容作为title
                historyItem.addEventListener('click', () => {
                    qrInput.value = item;
                });
                historyListDiv.appendChild(historyItem);
            });
        } else {
            historyTitle.style.display = 'none'; // 隐藏标题
            historyListDiv.style.display = 'none'; // 隐藏列表
        }
    }

    // 页面加载时加载并渲染历史记录
    chrome.storage.local.get(['qrHistory'], function(result) {
        renderHistory(result.qrHistory);
    });
});