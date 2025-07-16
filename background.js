// background.js

// Listener for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getUserId") {
    chrome.storage.local.get("user_id", (data) => {
      sendResponse({ userId: data.user_id });
    });
    // Return true to indicate you wish to send a response asynchronously
    return true;
  }
});

console.log("Background script loaded.");
