// background.js
chrome.runtime.onInstalled.addListener(() => {
    // 初始化插件时，可以设置默认值或进行其他初始化操作
    console.log("Extension Installed");
  
    // 在存储中设置默认用户ID
    chrome.storage.sync.set({ userId: "defaultUser123" }, () => {
      console.log("User ID set to defaultUser123");
    });
  });
  
  // 监听来自弹出页面的消息请求
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getUserId") {
      // 返回当前存储的用户ID
      chrome.storage.sync.get("userId", (data) => {
        sendResponse({ userId: data.userId });
      });
      // 需要返回 true 以保持消息通道打开，直到获取响应
      return true;
    }
  });
  