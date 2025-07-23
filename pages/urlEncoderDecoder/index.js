document.addEventListener('DOMContentLoaded', function() {
    const navbarFrame = document.getElementById('navbarFrame');
    if (navbarFrame) {
        navbarFrame.onload = () => {
            navbarFrame.contentWindow.postMessage({ type: 'setTitle', title: 'URL编码/解码' }, '*');
        };
    }
    
    // 监听来自 navbar.js 的消息
    window.addEventListener('message', function(event) {
        // 如果收到 goHome 消息，则转发到父窗口
        if (event.data && event.data.type === 'goHome') {
            window.parent.postMessage({ type: 'goHome' }, '*');
        }
    });

  const inputArea = document.getElementById('inputArea');
  const outputArea = document.getElementById('outputArea');
  const encodeBtn = document.getElementById('encodeBtn');
  const decodeBtn = document.getElementById('decodeBtn');

  encodeBtn.addEventListener('click', function() {
    try {
      outputArea.value = encodeURIComponent(inputArea.value);
    } catch (e) {
      outputArea.value = '编码失败: ' + e.message;
    }
  });

  decodeBtn.addEventListener('click', function() {
    try {
      outputArea.value = decodeURIComponent(inputArea.value);
    } catch (e) {
      outputArea.value = '解码失败: ' + e.message;
    }
  });
});