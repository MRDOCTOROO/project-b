// 页面切换

document.getElementById("recomond").addEventListener("click", () => {
    window.location.href = "recomond.html";
  });

//提示建议

const textarea = document.getElementById('userInput');
const shadow = document.getElementById('shadowText');
const suggestionList = document.getElementById('suggestionList');

let debounceTimer = null;

textarea.addEventListener('input', () => {
  const val = textarea.value;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (val.trim()) {
      fetchSuggestions(val.trim());
    } else {
      shadow.textContent = '';
      suggestionList.innerHTML = '';
    }
  }, 300); // 防抖，避免频繁请求
});

async function fetchSuggestions(inputValue) {
  try {
    const res = await fetch(`http://localhost:5000/api/suggestions?q=${encodeURIComponent(inputValue)}`);
    const data = await res.json();
    const matches = data.suggestions || [];
    updateSuggestions(matches, inputValue);
  } catch (err) {
    console.error("获取建议失败：", err);
  }
}

function updateSuggestions(matches, inputValue) {
  suggestionList.innerHTML = '';

  if (matches.length === 0) {
    shadow.textContent = '';
    return;
  }

  const first = matches[0];
  if (first.toLowerCase().startsWith(inputValue.toLowerCase())) {
    shadow.textContent = first;
  } else {
    shadow.textContent = '';
  }

  matches.forEach(s => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.textContent = s;
    div.onclick = () => {
      textarea.value = s;
      shadow.textContent = s;
      suggestionList.innerHTML = '';
    };
    suggestionList.appendChild(div);
  });
}

// TAB 键补全
textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const suggestionItems = suggestionList.querySelectorAll('.suggestion-item');
    if (suggestionItems.length > 0) {
      const first = suggestionItems[0].textContent;
      textarea.value = first;
      shadow.textContent = first;
      suggestionList.innerHTML = '';
    }
  }
});

// blur 后隐藏建议
textarea.addEventListener('blur', () => {
  setTimeout(() => suggestionList.innerHTML = '', 200);
});




// 页面加载时就要执行的功能

document.addEventListener("DOMContentLoaded", () => {

//推荐用户信息

// 获取当前登录用户的用户名（这里假设通过某种方式获取，例如从浏览器扩展的存储中读取）

//修改数据库--新增字段 包含中文用户名称-曙光平台用户名 在getCurrentUser()函数中获取
async function getCurrentUser() {
    // 模拟当前登录用户
    // return "李可丰"; // 后续可以替换为动态获取的用户名
    const user_id =  await generateUserId();
    console.log("查询用户推荐的关键字：", user_id);
    return user_id;
}

// 调用 Flask API 接口获取关联用户信息
async function fetchRelatedUsers(username) {
    const apiUrl = `https://xgtj.bbzb.ddns-ip.net/api/users/${encodeURIComponent(username)}`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching related users:", error);
        return null;
    }
}

// 动态更新页面内容
// function updateChatContent(users) {
//     const chatContent = document.getElementById("chatContent");
//     const welcomeMessage = document.getElementById("welcomeMessage");

//     // 清空欢迎消息
//     if (welcomeMessage) {
//         chatContent.removeChild(welcomeMessage);
//     }

//     if (!users || users.length === 0) {
//         chatContent.innerHTML = "<p>未找到与您关联的用户信息。</p>";
//         return;
//     }

//     // 添加关联用户信息
//     users.forEach(user => {
//         const userInfoDiv = document.createElement("div");
//         userInfoDiv.className = "user-info";
//         userInfoDiv.innerHTML = `
//             <strong>研究推荐用户:</strong> ${user.user.name} (${user.user.email})<br>
//             <strong>相关研究主题:</strong> ${user.topic_name} (ID: ${user.topic_id})
//         `;
//         chatContent.appendChild(userInfoDiv);
//     });
// }
function updateChatContent(users) {
    const chatContent = document.getElementById("chatContent");
    const welcomeMessage = document.getElementById("welcomeMessage");

    // 清除欢迎消息
    if (welcomeMessage) {
        chatContent.removeChild(welcomeMessage);
    }

    // 无结果提示
    if (!users || users.length === 0) {
        chatContent.innerHTML = "<p>未找到与您关联的用户信息。</p>";
        return;
    }

    // 显示用户推荐信息
    users.forEach(user => {
        const userInfoDiv = document.createElement("div");
        userInfoDiv.className = "user-info";
        userInfoDiv.innerHTML = `
            <strong>推荐用户:</strong> ${user.name} (${user.email})<br>
            <strong>学院:</strong> ${user.college}<br>
            <strong>相关研究主题:</strong> ${user.topic_name}
        `;
        chatContent.appendChild(userInfoDiv);
    });
}


// 初始化页面
async function initrel() {
    const currentUser = await getCurrentUser(); // 获取当前登录用户
    const relatedUsers = await fetchRelatedUsers(currentUser); // 查询关联用户
    updateChatContent(relatedUsers); // 更新页面内容
}
initrel(); // 初始化页面
//图片解析
// 获取上传图片按钮和文件选择框
const imageUploadBtn = document.getElementById("imageUploadBtn");
const imageFileInput = document.getElementById("imageFileInput");

if (imageUploadBtn && imageFileInput) {
    imageUploadBtn.addEventListener("click", () => {
        imageFileInput.click();
    });
} else {
    console.error("DOM 元素未找到！");
}

// // 点击上传按钮，触发文件选择框
// imageUploadBtn.addEventListener("click", () => {
//     imageFileInput.click();
// });

// // 监听文件选择框变化事件，选择文件后触发上传
imageFileInput.addEventListener("change", async (event) => {
    currentMode = 'image';
    updateModeDisplay();

    const file = event.target.files[0];
    if (file) {
        await parseImage(file); // 解析图片并返回文本
    }
});

// // 图片解析功能
async function parseImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        // 发送图片文件到OCR API
        const response = await fetch('http://127.0.0.1:5000/ocr', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            const ocrText = result.text; // 获取OCR识别的文本
            
            // 处理解析文本，例如调用其他函数使用该文本
            handleOcrResult(ocrText); 
            
            console.log('OCR识别结果:', ocrText);
            document.getElementById('ocrResult').innerText = ocrText;  // 显示解析结果
            
        } else {
            document.getElementById('ocrResult').innerText = `识别失败：${result.error}`;
        }
    } catch (error) {
        document.getElementById('ocrResult').innerText = `网络错误：${error.message}`;
    }
}

let ocrTextResult = ""; // 用于存储 OCR 解析的文本
// 示例函数：处理OCR结果文本
function handleOcrResult(text) {
    // 这里可以将解析的文本传递给其他函数或进行进一步处理
    console.log('文本传递给其他函数处理:', text);

    ocrTextResult = text; // 存储 OCR 结果

     // 将识别的文本填充到文本框中
    //  const inputText = document.getElementById('userInput');
    //  inputText.value = text; // 自动填充文本框
    // 可以在这里进行更复杂的操作，比如调用另一个API、更新界面等
}



    //对话模式切换
    // 全局变量，记录当前模式（默认为资源模式）
let currentMode = 'resource';

// 获取 DOM 元素
const modeToggleBtn = document.getElementById('modeToggle');
const currentModeDisplay = document.getElementById('currentModeDisplay');

//上传图片的prompt判断标签
// const uploadButton = document.getElementById('imageFileInput');
// const imageFileInput_model = document.getElementById('imageFileInput');
// const imageUploadBtn_model = document.getElementById('imageUploadBtn');

// 初始化按钮和提示文本
// function updateModeDisplay() {
//     if (currentMode === 'resource') {
//         modeToggleBtn.textContent = '切换模式: 知识库助手'; //查询解析文档内容
//         currentModeDisplay.textContent = '当前模式: 任务助手模式';
//         currentModeDisplay.style.color = '#4CAF50'; // 绿色表示资源模式
//     } else {
//         modeToggleBtn.textContent = '切换模式:任务助手模式 ';//资源使用建议模式
//         currentModeDisplay.textContent = '当前模式: 知识库助手';
//         currentModeDisplay.style.color = '#2196F3'; // 蓝色表示文档模式
//     }
//     console.log(currentMode)
// }
function updateModeDisplay() {
    if (currentMode === 'resource') {
        modeToggleBtn.textContent = '切换模式: 知识库助手'; // 查询解析文档内容
        currentModeDisplay.textContent = '当前模式: 任务助手模式';
        currentModeDisplay.style.color = '#4CAF50'; // 绿色表示资源模式
    } else if (currentMode === 'document') {
        modeToggleBtn.textContent = '切换模式: 任务助手模式'; // 资源使用建议模式
        currentModeDisplay.textContent = '当前模式: 知识库助手';
        currentModeDisplay.style.color = '#2196F3'; // 蓝色表示文档模式
    } else if (currentMode === 'image') {
        currentModeDisplay.textContent = '当前模式: 图片识别模式';
        currentModeDisplay.style.color = '#FF9800'; // 橙色表示图片模式
    }
    console.log("当前模式:", currentMode);
}

// 初始显示
updateModeDisplay();

// 按钮点击事件
// modeToggleBtn.addEventListener('click', () => {
//     currentMode = currentMode === 'resource' ? 'document' : 'resource';
//     updateModeDisplay();
// });
modeToggleBtn.addEventListener('click', () => {
    if (currentMode === 'resource') {
        currentMode = 'document';
    } else if (currentMode === 'document') {
        currentMode = 'resource';
    }
    updateModeDisplay();
});


// 原始 chatHistory 初始化为空数组
let chatHistory = [];

// 新增函数：根据用户ID加载所有对话 loadUserChats是加载列表 loadChatHistory是加载对话内容
//加载对话列表功能完成 代优化对话名称
async function loadUserChats() {
    const user_id = await generateUserId(); // 假设 generateUserId() 从 Session 获取用户ID
    console.log("获取对话列表是的 ID:", user_id); // 检查 user_id 是否正确
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/get_chats?user_id=${user_id}`);
        const data = await response.json();
        // console.log(data);
        console.log("获取的对话列表", data);
        if (data.success) {
            // 转换后端返回的对话列表格式
            chatHistory = data.chats.map(chat => ({
                id: chat.chat_id,
                title: chat.title,
                time: new Date(chat.created_at).toLocaleString(),
                content: []
            }));
            renderChatList(); // 更新对话列表
        }
        console.log("获取的对话列表格式化之后", chatHistory);
        // console.log(chatHistory);
    } catch (error) {
        console.error("加载对话列表失败:", error);
    }
}
//打开插件 检测到登录则加载对话列表
// document.addEventListener('DOMContentLoaded', async () => {
//     // 检查用户是否已登录（假设通过 generateUserId() 判断）
//     try {
//         const user_id = await generateUserId();
//         if (user_id) {
//             await loadUserChats(); // 加载用户对话列表
//         }
//     } catch (error) {
//         console.error("获取用户ID失败:", error);
//     }
// });
loadUserChats();



// 渲染历史对话列表
function renderChatList() {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = chatHistory.map(chat => `
        <li class="chat-item" data-id="${chat.id}">
            <div class="chat-content">
                <div class="chat-title">${chat.title}</div>
                <div class="chat-time">${chat.time}</div>
            </div>
            <div class="chat-actions">
                <button class="btn-icon delete-btn" title="删除">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>
        </li>
    `).join('');
}

// 初始化事件监听
document.getElementById('chatList').addEventListener('click', (e) => {
    const chatItem = e.target.closest('.chat-item');
    if (chatItem) {
        // 切换选中状态
        document.querySelectorAll('.chat-item').forEach(item => 
            item.classList.remove('active'));
        chatItem.classList.add('active');
        
        // 加载对应对话内容
        const chatId = chatItem.dataset.id;
        console.log(chatId);
        // loadChatHistory(chatId);
        if (chatId) {
            loadChatHistory(chatId);
        } else {
            console.error("Chat ID not found!");
        }
    }
});



// 新建对话

document.getElementById('newChatBtn').addEventListener('click', async () => {
    const user_id = await generateUserId();
    const newChatTitle = `newchat ${chatHistory.length + 1}`;
    console.log(user_id);
    // 发送到后端创建对话
    try {
        const response = await fetch('http://127.0.0.1:5000/api/create_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, title: newChatTitle })
        });

        if (!response.ok) {
            throw new Error("无法创建新对话，服务器返回错误");
        }

        const data = await response.json();
        if (!data.success || !data.chat_id) {
            throw new Error("无效的对话ID响应");
        }

        // 更新本地对话列表
        const newChat = {
            id: data.chat_id,
            title: newChatTitle,
            time: new Date().toLocaleString(),
            content: []
        };
        chatHistory.push(newChat);
        renderChatList();
        loadChatHistory(newChat.id); // 加载新对话内容

    } catch (error) {
        console.error("创建新对话失败:", error);
    }
});
//删除对话

document.getElementById('chatList').addEventListener('click', async (e) => {
    if (e.target.closest('.delete-btn')) {
        const chatItem = e.target.closest('.chat-item');
        const chatId = chatItem.dataset.id;

        try {
            const user_id = await generateUserId();
            const response = await fetch(
                `http://127.0.0.1:5000/api/delete_chat?user_id=${user_id}&chat_id=${chatId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                throw new Error("无法删除对话，服务器返回错误");
            }

            // 更新本地列表和UI
            chatHistory = chatHistory.filter(chat => chat.id !== chatId);
            renderChatList();

            // 如果删除的是当前激活对话，切换到其他对话
            if (chatItem.classList.contains('active')) {
                const firstChat = chatHistory[0];
                if (firstChat) {
                    loadChatHistory(firstChat.id);
                    document.querySelector(`[data-id="${firstChat.id}"]`)
                        .classList.add('active');
                }
            }
        } catch (error) {
            console.error("删除对话失败:", error);
        }
    }
});




// // 页面加载时初始化
// document.addEventListener('DOMContentLoaded', async () => {
//     await initChatList();
// });

// // 搜索功能
// document.getElementById('searchInput').addEventListener('input', (e) => {
//     const keyword = e.target.value.toLowerCase();
//     document.querySelectorAll('.chat-item').forEach(item => {
//         const title = item.querySelector('.chat-title').textContent.toLowerCase();
//         item.style.display = title.includes(keyword) ? 'flex' : 'none';
//     });
// });
// async function initChatList() {
//     const user_id = await generateUserId();
//     try {
//         const response = await fetch(
//             `http://127.0.0.1:5000/api/get_chats?user_id=${user_id}`,
//             { method: 'GET' }
//         );
//         const data = await response.json();
//         if (data.success && data.chats) {
//             // 转换数据格式以匹配前端结构
//             chatHistory = data.chats.map(chat => ({
//                 id: chat.chat_id,
//                 title: chat.title,
//                 time: new Date(chat.created_at).toLocaleString(),
//                 content: []
//             }));
//             //打印获取的对话列表
//             console.log(chatHistory);
//             renderChatList();

//             // 默认加载第一个对话内容
//             if (chatHistory.length > 0) {
//                 const firstChat = chatHistory[0];
//                 loadChatHistory(firstChat.id);
//                 document.querySelector(`[data-id="${firstChat.id}"]`)
//                     .classList.add('active');
//             }else {
//                 console.error('获取对话列表失败:', data.message || '未知错误');
//             }
//         }
//         //初始化时默认选中第一个对话
//     //     const firstChatItem = document.querySelector('#chatList .chat-item');
//     // if (firstChatItem) {
//     //     firstChatItem.classList.add('active');
//     // }

//     } catch (error) {
//         console.error("加载对话列表失败:", error);
//     }
// }


//创建新对话默认选中
// 创建新对话后自动选中
// chatHistory.push(newChat);
// renderChatList();
// const newChatItem = document.querySelector(`[data-id="${newChat.id}"]`);
// newChatItem.classList.add('active'); // 设置为当前选中项

// 页面加载时初始化
// document.addEventListener('DOMContentLoaded', async () => {
//     await initChatList();
// });

// 初始化渲染
// renderChatList();


 // 获取上传按钮和文件输入框
 const openUploadBtn = document.getElementById("openUpload");
 const fileInput = document.getElementById("fileInput");

 // 点击上传按钮，触发文件选择框
 openUploadBtn.addEventListener("click", () => {
     fileInput.click();
 });

 // 监听文件选择框变化事件，选择文件后触发上传
 fileInput.addEventListener("change", (event) => {
     const file = event.target.files[0];
     if (file) {
         uploadFile(file);
     }
 });

 // 文件上传功能
//  function uploadFile(file) {
//      const url = "https://106d9.pluscdn.eu.org/api/v1/document/upload";
//      const formData = new FormData();
//     //  formData.append("file", file);

//     const encodedFileName = encodeURIComponent(file.name); // 编码文件名

//     console.log("原始文件名:", file.name);
//     console.log("编码后的文件名:", encodedFileName);
    
//      formData.append("file", file, encodeURIComponent(file.name));
     

//      fetch(url, {
//          method: "POST",
//          headers: {
//              "Authorization": "Bearer XXK505Z-6ZQMY6E-JQK42BF-W9GJF69"
//          },
//          body: formData
//      })

     
//      .then(response => response.json())
//      .then(data => {
//          console.log("上传成功:", data);
//          alert("文件上传成功！");
//      })
//      .catch(error => {
//          console.error("上传失败:", error);
//          alert("文件上传失败，请重试！");
//      });
//  }

async function uploadFile(file) {
    const baseUrl = "https://106d9.pluscdn.eu.org/api";
    const apiKey = "XXK505Z-6ZQMY6E-JQK42BF-W9GJF69";
    const workspaceSlug = "sspu";

    const formData = new FormData();
    formData.append("file", file, encodeURIComponent(file.name));

    try {
        // Step 1: 上传 PDF 文件
        const uploadResponse = await fetch(`${baseUrl}/v1/document/upload`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            },
            body: formData
        });

        const uploadResult = await uploadResponse.json();
        console.log("上传结果:", uploadResult);

        if (!uploadResponse.ok || !uploadResult.documents || !uploadResult.documents.length) {
            throw new Error("文件上传失败或无文档信息");
        }

        const documentLocation = uploadResult.documents[0].location;

        // Step 2: 直接更新嵌入向量（无需手动生成嵌入）
        const updateResponse = await fetch(`${baseUrl}/v1/workspace/${workspaceSlug}/update-embeddings`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                adds: [documentLocation],
                deletes: []
            })
        });

        const updateResult = await updateResponse.json();
        console.log("更新向量结果:", updateResult);

        if (!updateResponse.ok) {
            throw new Error("更新向量失败");
        }

        alert("文件上传并成功更新嵌入向量！");
    } catch (err) {
        console.error("错误：", err);
        alert("操作失败：" + err.message);
    }
}




    //退出登录
        // 退出登录按钮事件
        document.getElementById('logoutBtn').addEventListener('click', function() {
            chrome.storage.local.remove('user_id', () => {
                console.log("用户已退出登录");
                window.location.href = "login/login.html"; // 退出后跳转到登录页面
            });
        });
    //页面加载首先加载历史对话列表
    // loadChatHistory();


    //aaa 刚刚修改
    //切换条目传入不同chatid
    // const chatItem = e.target.closest('.chat-item');
    // if (chatItem) {
    //     // 切换选中状态
    //     document.querySelectorAll('.chat-item').forEach(item => 
    //         item.classList.remove('active'));
    //     chatItem.classList.add('active');

    //     // 加载对应对话内容
    //     const chatId = chatItem.dataset.id;
    //     loadChatHistory(chatId);
    // }
    //end


    marked.setOptions({
        highlight: (code, lang) => {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        breaks: true
    });

    const userInput = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const clearBtn = document.getElementById("clearBtn");
    // const chatHistory = document.getElementById("chat-history");



// 假设 username 是 "ssjxgsj"
// fetch('/api/resolve_user_id', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ username: 'ssjxgsj' })
// })
// .then(res => res.json())
// .then(data => {
//     if (data.success) {
//         const userId = data.user_id;
//         // 用 userId 请求 chat 数据
//         fetch(`/api/get_chats?user_id=${userId}`)
//             .then(res => res.json())
//             .then(chatData => {
//                 console.log('用户聊天记录:', chatData);
//             });
//     } else {
//         console.error('解析用户失败:', data.message);
//     }
// });

  // 生成或获取用户 ID
function getOrCreateUserId() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get('user_id', (data) => {
        if (chrome.runtime.lastError) {
          console.error("获取用户 ID 失败:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        let user_id = data.user_id; // 获取存储的 user_id
        console.log("user_id在getorcreat中获取本地的===>", user_id);

        if (!user_id) {
        //   user_id = 'user_' + Math.random().toString(36).substr(2, 9); // 生成新的 ID
        //   chrome.storage.local.set({ user_id }, () => {
        //     if (chrome.runtime.lastError) {
        //       console.error("存储用户 ID 失败:", chrome.runtime.lastError);
        //       reject(chrome.runtime.lastError);
        //       return;
        //     }
        //     console.log("新用户 ID 生成并存储:", user_id);
        //     resolve(user_id);
        //   });
        user_id = '1'
        } else {
          console.log("已存在的用户 ID:", user_id);
          resolve(user_id);
        }
      });
    } catch (error) {
      console.error("getOrCreateUserId 发生异常:", error);
      reject(error);
    }
  });
}

  // 调用示例（异步）
  async function generateUserId() {
    let user_id = await getOrCreateUserId();
    console.log("最终用户 ID:", user_id);
    return user_id;
  }
  
//   generateUserId();
//end 用户ID

    

    //加载单对话历史记录
    
    async function loadChatHistory(chatId) {
        const user_id = await generateUserId();
        console.log("加载历史对话时获取的对话ID", chatId);
        try {
            const response = await fetch(
                `http://127.0.0.1:5000/api/get_chat?user_id=${user_id}&chat_id=${chatId}`,
                // `http://127.0.0.1:5000/api/get_chats?user_id=${user_id}`,
                { method: 'GET' }
            );
            const data = await response.json();
            console.log("获取的对话内容", data);
            // if (data.success && data.messages) {
            //     // 更新对应对话的 content 字段
            //     const targetChat = chatHistory.find(chat => chat.id === chatId);
            //     if (targetChat) {
            //         targetChat.content = data.messages;
            //     }
    
            //     // 渲染对话内容到页面
            //     const chatContentContainer = document.getElementById('chatContent');
            //     chatContentContainer.innerHTML = data.messages.map(msg => `
            //         <div class="message">${msg.message}</div>
            //     `).join('');

            //     // loadChatHistoryToChatBox(messages);
            // }
            
        if (data.success && data.messages) {
            // 更新对应对话的 content 字段
            const targetChat = chatHistory.find(chat => chat.id === chatId);
            if (targetChat) {
                targetChat.content = data.messages;
            }

            // 清空当前对话框
            const chatContentContainer = document.getElementById('chatContent');
            chatContentContainer.innerHTML = '';

            // 遍历消息并加载到对话框
            data.messages.forEach((msg, index) => {
                const sender = index % 2 === 0 ? "user" : "ai"; // 偶数索引为用户，奇数索引为AI
                const position = sender === "user" ? "left" : "right"; // 设定对话框位置
                addMessageToChat(sender, msg.content, position);
            });
        }
        } catch (error) {
            console.error("加载对话内容失败:", error);
        }
    }



    // 发送消息
    async function sendMessage() {
        // const currentChatId = currentChatItem.dataset.id;
        // console.log("当前chatid", currentChatId);
        const user_id = await generateUserId();
        console.log("user_id===>", user_id);

        try {
            const message = userInput.value.trim();
            if (!message) return;

            // 获取用户 ID（从 sessionStorage 获取）


            // 调用 generateUserId 函数获取 user_id


            //临时测试
            // const user_id = "12345";
            // // const user_id = sessionStorage.getItem("user_id");
            // if (!user_id) {
            //     console.error("用户 ID 未找到，可能需要重新登录");
            //     return;
            // }

            // 添加用户消息
            addMessageToChat("You", message, "right");
            userInput.value = "";

            // 显示加载状态
            // const loadingDiv = documentv.createElement('div');
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chat-message left';
            loadingDiv.innerHTML = '<div class="message-header">Assistant</div><div class="loading">思考中...</div>';
            // chatHistory.appendChild(loadingDiv);
            // const currentChatId = document.querySelector('.chat-item.active').dataset.id;
            // const currentChatId = 1;


            //获取当前对话ID
            const currentChatItem = document.querySelector('.chat-item.active');
            if (!currentChatItem) {
                console.error("未选择对话，请先创建或选择一个对话");
                return;
            }
            const currentChatId = currentChatItem.dataset.id;

            // ✅ 正确操作：将 loadingDiv 添加到聊天内容容器（如 #chatContent）
        const chatContentContainer = document.getElementById('chatContent');
        chatContentContainer.appendChild(loadingDiv);

            const chat_id = currentChatId;
            // 发送用户消息到后端存储
            // console.log("当前chatid", chat_id);
            // console.log("当前userid", user_id);
            // console.log("当前message", message);
            // console.log("当前会话id", currentChatId);
            const response = await fetch('http://127.0.0.1:5000/api/save_chat', {  // 替换为你的后端 API 地址
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user_id,  //从 Session获取用户ID
                message: message,
                chat_id: chat_id
                // user_message: message,
                // ai_response: null
                // sender: "user"
                // ai_reply: null
                // ai_reply: ai_reply
            })
        });

        console.log("当前chatid", chat_id);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`存储消息失败: ${errorData.message}`);
        }


            // 获取集群监控数据（确保后端服务已启动，并调整 URL 为实际地址） 使用fetch获取数据 

        //四种prompt
            let prompt = "";

            if (currentMode === 'resource') {
                prompt = await updateSystemLoad(message)
            } else if(currentMode === 'document'){
                // prompt =  message;
                prompt = `
                你是一个专业的AI助手，你的任务是根据用户的问题去本地的向量数据库寻找问题的答案，
                如果没有对应的解答则返回“知识库中并没有问题的答案，但是根据训练时的数据，该问题可以”，然后根据你自己的了解去回答该问题。
                用户的问题是： ${message}
                 `;

                // console.log("文档解析需求下的===>", message);
            }else if(currentMode === 'image'){
                // prompt =  message;
                    // 获取OCR识别到的文本
                // const ocrText = document.getElementById('ocrResult').innerText; 
                // console.log("ocrText===>", ocrText);
                prompt = `
                现在给你的字符是从图片中识别的文字，请根据识别到的文字信息回答问题。
                图片信息是：${ocrTextResult}
                用户的问题是： ${message} `;

                //图片识别模式完成

                currentMode = 'resource';
                updateModeDisplay();
            }else{
             prompt=`你是一个协助科研的大模型`;
            }

            console.log("当前模式===>", currentMode);
            console.log("当前模式下的prompt===>", prompt);
            // prompt = await updateSystemLoad(message)
            // console.log("prompt===>", prompt);
            // 调用chat服务
            chat(prompt);
        } catch (error) {
            console.error('发送消息失败:', error);
            addMessageToChat("System", `错误：${error.message}`, "left");
        }
    }


    //回答系统资源使用状况模式的提示词
    async function chat(params) {
        try {
            // const response = await fetch("http://10.100.1.97:30642/v1/chat/completions", {
            //     method: "POST",
            //     headers: {
            //         "Content-Type": "application/json",
            //         // 根据实际需要添加认证头（当前示例无认证）
            //     },
            //     body: JSON.stringify({
            //         "model": "/share/fshare/common/models/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B/",
            //         "messages": [
            //             {
            //                 "role": "user",
            //                 "content": params
            //             }
            //         ],
            //         "temperature": 0.7,
            //         "max_tokens": 1024
            //     })
            // });
            //曙光转发
            
                const response = await fetch("https://106d9.pluscdn.eu.org/api/v1/workspace/sspu/chat", {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Authorization": "Bearer XXK505Z-6ZQMY6E-JQK42BF-W9GJF69",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "message": params,
                        "mode": "chat"
                    })
                });
                
            //曙光直接
            // const response = await fetch("http://10.100.1.92:6080/aiforward882682715139211264/chat/completions", {
            //     method: "POST",
            //     headers: {
            //         "Content-Type": "application/json",
            //         "Authorization": "Bearer XXK505Z-6ZQMY6E-JQK42BF-W9GJF69",
            //     },
            //     body: JSON.stringify({
            //         "messages": [
            //             { "role": "user", "content": params }
            //         ]
            //     })
            // });
            
            // const data = await response.json();
            //
            
            // 解析 AI 回复消息
            const data = await response.json();
            console.log(data);
            // let botReply = data.choices[0].message.content;
            let botReply = data.textResponse;

            // botReply = botReply.replace(/<\/?think>/g, ''); // 移除 <think> 标签

            // 在界面中添加 AI 回复消息
            addMessageToChat("Assistant", botReply, "left");

            const user_id = await generateUserId();
            const currentChatItem = document.querySelector('.chat-item.active');
            if (!currentChatItem) {
                console.error("未选择对话，请先创建或选择一个对话");
                return;
            }
            const currentChatId = currentChatItem.dataset.id;
            
            const chat_id = currentChatId;
            
             // 发送ai消息到后端存储
            //  let ai_response = botReply;
             const response2 = await fetch('http://127.0.0.1:5000/api/save_chat', {  // 替换为你的后端 API 地址
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user_id,  //从 Session获取用户ID
                    message: botReply,
                    chat_id: chat_id
                    
                    // sender: "ai"
                })
            });
    
            if (!response2.ok) {
                throw new Error('存储消息失败');
            }           

        } catch (error) {//try end
            console.error('发送消息失败:', error);
            addMessageToChat("System", `错误：${error.message}`, "left");
        }
    }

    async function updateSystemLoad(message) {
        try {
            const response = await fetch("http://10.100.1.98:5000/full_status");
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            console.log("API response:", data);

            let totalGpuUsage = 0;
            let gpuCount = 0;
            let totalCpuUsage = 0;
            let machineCount = 0;
            let gpuDetails = {};
            let cpuDetails = {
                totalCores: 0,
                totalThreads: 0
            };


            Object.values(data).forEach(machine => {

                machine.gpu.forEach(gpu => {
                    totalGpuUsage += gpu.utilization_gpu || 0;
                    gpuCount++;

                    gpuDetails[`Machine_${machine.machine}_GPU${gpu.id}`] = {
                        name: gpu.name,
                        utilization: gpu.utilization_gpu + "%",
                        temperature: gpu.temperature + "°C",
                        memory: `${gpu.memory_free}GB / ${gpu.memory_total}GB`
                    };
                });


                totalCpuUsage += machine.system.cpu_usage || 0;
                cpuDetails.totalCores += machine.system.cpu_cores || 0;
                cpuDetails.totalThreads += machine.system.cpu_threads || 0;
                machineCount++;
            });

            // 计算平均 GPU 和 CPU 使用率
            const averageGpuUsage = gpuCount > 0 ? (totalGpuUsage / gpuCount).toFixed(2) + "%" : "0%";
            const averageCpuUsage = machineCount > 0 ? (totalCpuUsage / machineCount).toFixed(2) + "%" : "0%";

            // 组装系统负载信息
            const systemLoad = {
                averageCpuUsage,
                totalCpuCores: cpuDetails.totalCores,
                totalCpuThreads: cpuDetails.totalThreads,
                totalGpuUsage: averageGpuUsage,
                gpus: gpuDetails
            };

            console.log("Updated System Load:", systemLoad);

            // 生成 Prompt
            const prompt = `

            
    当前系统状态：
    - CPU平均使用率 = ${systemLoad.averageCpuUsage}
    - GPU平均使用率 = ${systemLoad.totalGpuUsage}
    - 总 CPU 核心数 = ${systemLoad.totalCpuCores}
    - 总 CPU 线程数 = ${systemLoad.totalCpuThreads}

显卡是80G显存的A800，和使用MIG切分的40显存的A800
 以上是集群的cpu和GPU的部分信息。根据上边的系统资源使用状况，结合用户需求给出资源分配的合理建议，在回答的示例中首先输出当前系统状态。
 回答应该尽可能地简短专业，所有回答优先使用中文。


    用户需求：${message}
    `;

            return prompt;

        } catch (error) {
            console.error("Failed to fetch system status:", error);
            return null;
        }
    }

            //添加用户消息到对话框

            function addMessageToChat(sender, text, position) {
                const messageDiv = document.createElement("div");
                messageDiv.className = `chat-message ${position}`;

                // 解析 Markdown 并净化 HTML
            const rawHtml = marked.parse(text);
            const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img'],
        ALLOWED_ATTR: ['href', 'src', 'alt']
    });

    messageDiv.innerHTML = `
        <div class="message-header">${sender}</div>
        <div class="markdown-body">${cleanHtml}</div>
    `;

    // chatHistory.appendChild(messageDiv);
    // chat-history.appendChild(messageDiv);
    // 获取 chat-history DOM 元素并添加消息
    const chatHistoryElement = document.getElementById('chatContent');
    chatHistoryElement.appendChild(messageDiv);

    // 高亮代码块
    messageDiv.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
    });


        //         if (sender === "Assistant") {
        //             // 解析Markdown并净化HTML
        //             const rawHtml = marked.parse(text);
        //             const cleanHtml = DOMPurify.sanitize(rawHtml, {
        //                 ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img'],
        //                 ALLOWED_ATTR: ['href', 'src', 'alt']
        //             });

        //             messageDiv.innerHTML = `
        //     <div class="message-header">${sender}</div>
        //     <div class="markdown-body">${cleanHtml}</div>
        // `;
        //         } else {
        //             // 用户消息保持纯文本
        //             messageDiv.innerHTML = `
        // <div class="message-header">${sender}</div>
        // <div>${escapeHtml(text)}</div>
        // `;
        //         }

        // chatHistory.appendChild(messageDiv);

        // // 高亮代码块
        // messageDiv.querySelectorAll('pre code').forEach(block => {
        //     hljs.highlightElement(block);
        // });

        // 自动滚动
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    // HTML转义函数
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    // 清除文本框内容
    clearBtn.addEventListener("click", () => {
        userInput.value = "";
    });

    // 绑定按钮点击事件
    sendBtn.addEventListener("click", sendMessage);

    // 绑定回车键发送消息
    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
});

