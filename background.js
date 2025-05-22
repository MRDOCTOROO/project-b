// background.js
chrome.runtime.onInstalled.addListener(() => {
    // 初始化插件时，可以设置默认值或进行其他初始化操作
    console.log("Extension Installed");
  
    // 在存储中设置默认用户ID
    // chrome.storage.sync.set({ userId: "defaultUser123" }, () => {
    //   console.log("User ID set to defaultUser123");
    // });

      // 检查用户是否已登录
      chrome.storage.local.get('user_id', (data) => {
        if (!data.user_id) {
          // 用户未登录，打开登录页面
          chrome.action.setPopup({ popup: "popup/login/login.html" });
        } else {
          // 用户已登录，打开 popup 页面
          chrome.action.setPopup({ popup: "popup/popup.html" });
          // chrome.action.setPopup({ popup: "popup/test/test.html" });
        }
      });
      



  //end
  });

  //插件重新打开的默认操作
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get('user_id', (data) => {
  if (data.user_id) {
  chrome.action.setPopup({ popup: "popup/popup.html" });
  // chrome.action.setPopup({ popup: "popup/test/test.html" });
  } else {
  chrome.action.setPopup({ popup: "popup/login/login.html" });
  
  }
  });
  });
  
  // 监听来自弹出页面的消息请求
  // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  //   if (message.action === "getUserId") {
  //     // 返回当前存储的用户ID
  //     chrome.storage.local.get("userId", (data) => {
  //       sendResponse({ userId: data.userId });
  //     });
  //     // 需要返回 true 以保持消息通道打开，直到获取响应
  //     return true;
  //   }
  // });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getUserId") {
    chrome.storage.local.get("user_id", (data) => {
      sendResponse({ userId: data.user_id });
    });
    return true;
  }
});
