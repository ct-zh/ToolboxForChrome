// 监听插件图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 打开主页面
  chrome.tabs.create({
    url: chrome.runtime.getURL('main.html'),
    active: true
  });
});