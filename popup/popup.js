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
document.getElementById('timestamp').addEventListener('click', function() {
    // 清空弹层内容
    document.body.innerHTML = '';
    
    // 创建iframe加载timestamp.html
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('timestamp.html');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);
});

// Base64编码/解码功能
// document.getElementById('base64').addEventListener('click', () => {
//   chrome.tabs.create({url: 'base64.html'});
// });

function formatJSON() {
  // 这里实现JSON格式化逻辑
  alert('JSON格式化功能开发中');
}