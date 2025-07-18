document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('user_id', (data) => {
        if (data && data.user_id) {
            initializeApp(data.user_id);
        } else {
            window.location.href = 'login/login.html';
        }
    });
});

function initializeApp(user_id) {
    // 知识图谱跳转
    const showRelationGraphBtn = document.getElementById('showRelationGraphBtn');
    if (showRelationGraphBtn) {
        showRelationGraphBtn.addEventListener('click', function() {
            window.location.href = 'relation/relation.html';
        });
    }

    // 设置页面跳转
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            window.location.href = 'settings/settings.html';
        });
    }

    //跳转到任务监控页面
    const monitoringBtn = document.getElementById("monitoring-btn");
    if (monitoringBtn) {
        monitoringBtn.addEventListener("click", function () {
            window.location.href = "monitoring/monitoring.html";
        });
    }

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
            const res = await fetch(`http://10.100.1.122:5000/api/suggestions?q=${encodeURIComponent(inputValue)}`);
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

    // 获取用户进程
    async function getuserId() {
        return user_id;
    }
    //系统资源获取
    async function fetchGpuData() {
        const urls = [
            "http://10.100.1.98:8000/g1",
            "http://10.100.1.98:8000/g2",
            "http://10.100.1.98:8000/g3"
        ];

        const responses = await Promise.all(urls.map(url => fetch(url)));
        const allData = await Promise.all(responses.map(res => res.json()));
        return allData.flat(); // 合并所有 GPU 数据
    }

    function extractMemoryUsed(memoryStr) {
        // 从 "39417MiB / 40192MiB" 中提取数值部分
        const match = memoryStr.match(/(\d+)\s*MiB/);
        return match ? parseInt(match[1]) : 0;
    }

    async function getUserGpuUsage() {
        const current_user_id = await getuserId();
        console.log('写死调试用的userId展示1111-----:', current_user_id);
        const gpuData = await fetchGpuData();

        const userTasks = [];

        for (const gpuEntry of gpuData) {
            const { gpu, memory_usage, user, processes } = gpuEntry;

            const matchingUsers = user?.filter(u => u.username && u.username.includes(current_user_id));
            if (matchingUsers && matchingUsers.length > 0) {
                // 获取当前 GPU 上该用户的所有进程
                const userProcesses = processes?.filter(p => p.name.includes("python")) || [];
                const processNames = userProcesses.map(p => p.name);
                const usedMemory = extractMemoryUsed(memory_usage);

                userTasks.push({
                    gpu_id: gpu,
                    memory_used: `${usedMemory} MiB`,
                    process_names: processNames
                });
            }
        }

        return userTasks;
    }

    // 示例：使用这个函数来获取并展示该用户的 GPU 使用信息
    getUserGpuUsage().then(userTasks => {
        if (userTasks.length === 0) {
            console.log("当前用户没有运行任务。");
        } else {
            userTasks.forEach(task => {
                console.log(`GPU ${task.gpu_id} 使用情况:`);
                console.log(`- 显存使用: ${task.memory_used}`);
                console.log(`- 进程名: ${task.process_names.join(", ")}`);
            });
        }
    });
    // 系统资源获取end

    //推荐用户信息
    async function getCurrentUser() {
        console.log("查询用户推荐的关键字：", user_id);
        return user_id;
    }

    async function verifyRealName() {
        const verifyUrl = "http://10.100.1.122:5000/api/users/verify";

        try {
            const response = await fetch(verifyUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user_id, real_name: "" })
            });

            if (!response.ok) {
                throw new Error(`Verify API error: ${response.status}`);
            }

            const data = await response.json();
            console.log("验证后获得真实姓名：", data.user?.relname);
            return data.user?.relname || null;
        } catch (error) {
            console.error("Error verifying real name:", error);
            return null;
        }
    }

    // 调用 Flask API 接口获取关联用户信息
    async function fetchRelatedUsers(username) {
        const apiUrl = `http://10.100.1.122:5001/api/users/${encodeURIComponent(username)}`;
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

    async function initrel() {
        const currentUser = await getCurrentUser(); // 获取用户 ID
        let relatedUsers = await fetchRelatedUsers(currentUser); // 第一次尝试直接用 ID 查找

        // 如果未找到，尝试用真实中文名再次请求
        if (!relatedUsers || relatedUsers.length === 0) {
            const realName = await verifyRealName(currentUser);
            if (realName) {
                relatedUsers = await fetchRelatedUsers(realName);
            }
        }

        updateChatContent(relatedUsers);
    }
    initrel(); // 初始化页面

    //图片解析
    const imageUploadBtn = document.getElementById("imageUploadBtn");
    const imageFileInput = document.getElementById("imageFileInput");

    if (imageUploadBtn && imageFileInput) {
        imageUploadBtn.addEventListener("click", () => {
            imageFileInput.click();
        });
    } else {
        console.error("DOM 元素未找到！");
    }

    imageFileInput.addEventListener("change", async (event) => {
        currentMode = 'image';
        updateModeDisplay();

        const file = event.target.files[0];
        if (file) {
            await parseImage(file); // 解析图片并返回文本
        }
    });

    async function parseImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('http://10.100.1.122:5000/ocr', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                const ocrText = result.text;
                handleOcrResult(ocrText); 
                console.log('OCR识别结果:', ocrText);
                document.getElementById('ocrResult').innerText = ocrText;
            } else {
                document.getElementById('ocrResult').innerText = `识别失败：${result.error}`;
            }
        } catch (error) {
            document.getElementById('ocrResult').innerText = `网络错误：${error.message}`;
        }
    }

    let ocrTextResult = ""; // 用于存储 OCR 解析的文本
    function handleOcrResult(text) {
        console.log('文本传递给其他函数处理:', text);
        ocrTextResult = text;
    }

    //对话模式切换
    let currentMode = 'resource';
    const modeToggle = document.getElementById('modeToggle');
    const currentModeDisplay = document.getElementById('currentModeDisplay');

    function updateModeDisplay() {
        if (currentMode === 'resource') {
            currentModeDisplay.textContent = '任务助手模式';
            modeToggle.checked = false;
        } else if (currentMode === 'document') {
            currentModeDisplay.textContent = '知识库助手模式';
            modeToggle.checked = true;
        } else if (currentMode === 'image') {
            currentModeDisplay.textContent = '图片识别模式';
        }
        console.log("当前模式:", currentMode);
    }

    updateModeDisplay();

    modeToggle.addEventListener('change', () => {
        if (modeToggle.checked) {
            currentMode = 'document';
        } else {
            currentMode = 'resource';
        }
        updateModeDisplay();
    });

    let chatHistory = [];

    async function loadUserChats() {
        console.log("获取对话列表是的 ID:", user_id);
        try {
            const response = await fetch(`http://10.100.1.122:5000/api/get_chats?user_id=${user_id}`);
            const data = await response.json();
            console.log("获取的对话列表", data);
            if (data.success) {
                chatHistory = data.chats.map(chat => ({
                    id: chat.chat_id,
                    title: chat.title,
                    time: new Date(chat.created_at).toLocaleString(),
                    content: []
                }));
                renderChatList();
            }
            console.log("获取的对话列表格式化之后", chatHistory);
        } catch (error) {
            console.error("加载对话列表失败:", error);
        }
    }
    loadUserChats();

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

    document.getElementById('chatList').addEventListener('click', (e) => {
        const chatItem = e.target.closest('.chat-item');
        if (chatItem) {
            document.querySelectorAll('.chat-item').forEach(item => 
                item.classList.remove('active'));
            chatItem.classList.add('active');
            
            const chatId = chatItem.dataset.id;
            console.log(chatId);
            if (chatId) {
                loadChatHistory(chatId);
            } else {
                console.error("Chat ID not found!");
            }
        }
    });

    async function createNewChat() {
        const newChatTitle = `新对话`;
        console.log(user_id);
        try {
            const response = await fetch('http://10.100.1.122:5000/api/create_chat', {
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

            const newChat = {
                id: data.chat_id,
                title: newChatTitle,
                time: new Date().toLocaleString(),
                content: []
            };
            chatHistory.unshift(newChat);
            renderChatList();
            
            // 移除所有 active 类
            document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
            
            // 为新对话添加 active 类
            const newChatItem = document.querySelector(`[data-id="${newChat.id}"]`);
            if (newChatItem) {
                newChatItem.classList.add('active');
            }
            
            await loadChatHistory(newChat.id);
            return newChat.id;

        } catch (error) {
            console.error("创建新对话失败:", error);
            return null;
        }
    }

    document.getElementById('newChatBtn').addEventListener('click', createNewChat);

    document.getElementById('chatList').addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            const chatItem = e.target.closest('.chat-item');
            const chatId = chatItem.dataset.id;

            try {
                const response = await fetch(
                    `http://10.100.1.122:5000/api/delete_chat?user_id=${user_id}&chat_id=${chatId}`,
                    { method: 'DELETE' }
                );

                if (!response.ok) {
                    throw new Error("无法删除对话，服务器返回错误");
                }

                chatHistory = chatHistory.filter(chat => chat.id !== chatId);
                renderChatList();

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

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        document.querySelectorAll('.chat-item').forEach(item => {
            const title = item.querySelector('.chat-title').textContent.toLowerCase();
            item.style.display = title.includes(keyword) ? 'flex' : 'none';
        });
    });

    const openUploadBtn = document.getElementById("openUpload");
    const fileInput = document.getElementById("fileInput");

    openUploadBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadFile(file);
        }
    });

    async function uploadFile(file) {
        const baseUrl = "http://10.100.1.122:3001/api";
        const apiKey = "C6W2NTM-RW8432R-GYAFS9F-KPG2SMP";
        const workspaceSlug = "sspu";

        const formData = new FormData();
        formData.append("file", file, encodeURIComponent(file.name));

        try {
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

    document.getElementById('logoutBtn').addEventListener('click', function() {
        chrome.storage.local.remove('user_id', () => {
            console.log("用户已退出登录");
            window.location.href = "login/login.html";
        });
    });

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

    async function loadChatHistory(chatId) {
        console.log("加载历史对话时获取的对话ID", chatId);
        try {
            const response = await fetch(
                `http://10.100.1.122:5000/api/get_chat?user_id=${user_id}&chat_id=${chatId}`,
                { method: 'GET' }
            );
            const data = await response.json();
            console.log("获取的对话内容", data);
            
            if (data.success && data.messages) {
                const chatContentContainer = document.getElementById('chatContent');
                chatContentContainer.innerHTML = '';

                if (data.messages.length === 0) {
                    const welcomeMessage = document.getElementById("welcomeMessage");
                    if(welcomeMessage) chatContentContainer.appendChild(welcomeMessage);
                } else {
                    const targetChat = chatHistory.find(chat => chat.id === chatId);
                    if (targetChat) {
                        targetChat.content = data.messages;
                    }
                    data.messages.forEach(msg => {
                        const sender = msg.sender === 'user' ? "You" : "Assistant";
                        const position = msg.sender === 'user' ? "right" : "left";
                        addMessageToChat(sender, msg.content, position);
                    });
                }
            }
        } catch (error) {
            console.error("加载对话内容失败:", error);
        }
    }

    async function updateChatTitle(chatId, newTitle) {
        try {
            const response = await fetch('http://10.100.1.122:5000/api/update_chat_title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id, chat_id: chatId, title: newTitle })
            });
            const data = await response.json();
            if (data.success) {
                const chatToUpdate = chatHistory.find(chat => chat.id === chatId);
                if (chatToUpdate) {
                    chatToUpdate.title = newTitle;
                    renderChatList();
                }
            }
        } catch (error) {
            console.error("Failed to update chat title:", error);
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        userInput.value = "";
        await sendPromptMessage(message);
    }

    async function sendPromptMessage(messageText) {
        let currentChatItem = document.querySelector('.chat-item.active');

        if (!currentChatItem) {
            const newChatId = await createNewChat();
            if (!newChatId) {
                console.error("创建新对话失败");
                return;
            }
            currentChatItem = document.querySelector('.chat-item.active');
        }

        const chat_id = currentChatItem.dataset.id;
        const currentChat = chatHistory.find(chat => chat.id === chat_id);
        const isFirstMessage = currentChat ? currentChat.content.length === 0 : false;

        addMessageToChat("You", messageText, "right");

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message left';
        loadingDiv.innerHTML = '<div class="message-content"><div class="loading">思考中...</div></div>';
        const chatContentContainer = document.getElementById('chatContent');
        chatContentContainer.appendChild(loadingDiv);

        try {
            const response = await fetch('http://10.100.1.122:5000/api/save_chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user_id,
                    message: messageText,
                    chat_id: chat_id,
                    sender: 'user'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`存储消息失败: ${errorData.message}`);
            }

            if (isFirstMessage) {
                // 重新加载对话列表以更新标题
                await loadUserChats();
            }

            let prompt = "";
            if (currentMode === 'resource') {
                prompt = await updateSystemLoad(messageText)
            } else if(currentMode === 'document'){
                prompt = `
                你是一个专业的AI助手，你的任务是根据用户的问题去本地的向量数据库寻找问题的答案，
                如果没有对应的解答则返回“知识库中并没有问题的答案，但是根据训练时的数据，该问题可以”，然后根据你自己的了解去回答该问题。
                用户的问题是： ${messageText}
                 `;
            }else if(currentMode === 'image'){
                prompt = `
                现在给你的字符是从图片中识别的文字，请根据识别到的文字信息回答问题。
                图片信息是：${ocrTextResult}
                用户的问题是： ${messageText} `;
                currentMode = 'resource';
                updateModeDisplay();
            }else{
             prompt=`你是一个协助科研的大模型`;
            }

            console.log("当前模式===>", currentMode);
            console.log("当前模式下的prompt===>", prompt);
            chat(prompt, loadingDiv, chat_id);
        } catch (error) {
            console.error('发送消息失败:', error);
            loadingDiv.remove();
            addMessageToChat("System", `错误：${error.message}`, "left");
        }
    }

    document.getElementById('paper-re').addEventListener('click', async () => {
        const username = await verifyRealName();
        if (!username) {
            alert("获取用户名失败，无法推荐论文。");
            return;
        }
        const prompt = `我是${username}，帮我推荐论文`;
        await sendPromptMessage(prompt); 
    });

    async function chat(params, loadingDiv, chat_id) {
        try {
            const modelConfig = await new Promise(resolve => chrome.storage.local.get('modelConfig', result => resolve(result.modelConfig)));

            let fetchUrl, fetchHeaders, fetchBody;

            if (modelConfig && modelConfig.type === 'custom') {
                fetchUrl = modelConfig.url;
                fetchHeaders = {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${modelConfig.key}`
                };
                fetchBody = JSON.stringify({
                    model: modelConfig.name,
                    messages: [{ role: 'user', content: params }]
                });
            } else {
                // Default model settings
                fetchUrl = "http://10.100.1.122:3001/api/v1/workspace/sspu/chat ";
                fetchHeaders = {
                    "Accept": "application/json",
                    "Authorization": "Bearer C6W2NTM-RW8432R-GYAFS9F-KPG2SMP",
                    "Content-Type": "application/json"
                };
                fetchBody = JSON.stringify({
                    "message": params,
                    "mode": "chat"
                });
            }

            const response = await fetch(fetchUrl, {
                method: "POST",
                headers: fetchHeaders,
                body: fetchBody
            });
            
            const data = await response.json();
            console.log(data);
            let botReply = (modelConfig && modelConfig.type === 'custom') ? data.choices[0].message.content : data.textResponse;

            loadingDiv.remove();
            addMessageToChat("Assistant", botReply, "left");

            const response2 = await fetch('http://10.100.1.122:5000/api/save_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user_id,
                    message: botReply,
                    chat_id: chat_id,
                    sender: 'ai'
                })
            });
    
            if (!response2.ok) {
                throw new Error('存储AI消息失败');
            }           

        } catch (error) {
            console.error('发送消息失败:', error);
            loadingDiv.remove();
            addMessageToChat("System", `错误：${error.message}`, "left");
        }
    }

    async function updateSystemLoad(message) {
        try {
            // Helper to parse memory string like "37MiB / 40192MiB"
            function parseMemory(memoryStr) {
                if (!memoryStr) return { used: 0, total: 0 };
                const parts = memoryStr.replace(/MiB/g, '').split('/');
                if (parts.length === 2) {
                    const used = parseInt(parts[0].trim(), 10);
                    const total = parseInt(parts[1].trim(), 10);
                    return { used, total };
                }
                return { used: 0, total: 0 };
            }

            // 1. Fetch general system status for CPU info
            const response = await fetch("http://10.100.1.98:5000/full_status");
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            
            let totalCpuUsage = 0;
            let machineCount = 0;
            Object.values(data).forEach(machine => {
                totalCpuUsage += machine.system.cpu_usage || 0;
                machineCount++;
            });
            const averageCpuUsage = machineCount > 0 ? (totalCpuUsage / machineCount).toFixed(2) + "%" : "0%";

            // 2. Fetch detailed GPU data from the correct endpoints
            const gpuData = await fetchGpuData();

            // 3. Process GPU data to find available cards
            let available40G = 0;
            let total40G = 0;
            let available80G = 0;
            let total80G = 0;

            gpuData.forEach(gpu => {
                const memory = parseMemory(gpu.memory_usage);
                // A GPU is considered occupied if the user array is not empty.
                const isOccupied = gpu.user && gpu.user.length > 0;

                if (memory.total > 70000) { // ~80GB card (A800)
                    total80G++;
                    if (!isOccupied) {
                        available80G++;
                    }
                } else if (memory.total > 30000) { // ~40GB card (A800_MIG)
                    total40G++;
                    if (!isOccupied) {
                        available40G++;
                    }
                }
            });

            // 4. Construct the new, improved prompt
            const prompt = `
当前系统实时资源状态：
- CPU平均使用率: ${averageCpuUsage}
- 可用 A800_MIG (40GB) 显卡数量: ${available40G} / ${total40G}
- 可用 A800 (80GB) 显卡数量: ${available80G} / ${total80G}

GPU 队列信息:
- A800_MIG 队列 (40GB显卡): 适用于轻量型、短时间或显存占用小的长时任务。
- gpu-long 队列 (80GB显卡): 适合需要大显存、长时间的训练任务。
- 独享 GPU 队列 (80GB显卡): 仅对特定教师开放。

CPU 队列信息:
- cpu_long 队列: 适合运行时间较长的 CPU 密集型任务。
- comput 队列: CPU 短队列，适用于 1 至 4 小时的短任务。

任务要求:
请你作为一名专业的HPC管理员，根据上述实时系统资源状况和队列信息，为用户提供专业、合理的资源分配建议。

指导原则:
1.  **分析用户需求**: 首先判断用户的任务类型（例如：模型训练、数据处理、短时测试等）以及对显存和计算时间的需求。
2.  **匹配资源**:
    - 如果用户任务需要大显存（如超过35GB），或进行大规模模型训练，优先推荐使用 80GB 的 A800 显卡。如果可用，直接建议申请。如果不可用，告知用户当前资源紧张，建议稍后再试或优化任务。
    - 如果用户任务显存需求不大（如小于35GB），或者属于开发、测试、短时推理等，推荐使用 40GB 的 A800_MIG 显卡。
    - 如果用户没有明确显存需求，请根据任务描述（如“训练大模型”、“跑个小测试”）主动判断并推荐合适的显卡。
    - 如果用户问题与资源申请无关，请直接回答用户问题，不要展示资源状态。
3.  **给出具体建议**: 回答应明确指出建议使用的队列名称和显卡类型，并解释原因。例如：“根据您的描述，建议您申请一张 80GB 的 A800 显卡，使用 gpu-long 队列，因为您的任务需要较大的显存支持。”
4.  **处理不明确信息**: 如果用户问题描述不清楚，主动提问以获取更多信息，例如：“为了给您更准确的建议，您能说明一下您任务大概需要多少显存吗？”

用户需求：${message}

请根据以上信息生成回复。
`;
            return prompt;

        } catch (error) {
            console.error("Failed to fetch system status or generate prompt:", error);
            // Fallback prompt if APIs fail
            return `你是一个协助科研的大模型。用户的问题是：${message}`;
        }
    }

    function addMessageToChat(sender, text, position) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `chat-message ${position}`;
    
        const messageContent = document.createElement("div");
        messageContent.className = "message-content";

        const rawHtml = marked.parse(text);
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'br'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'class']
        });
    
        messageContent.innerHTML = cleanHtml;
        messageDiv.appendChild(messageContent);
    
        const chatHistoryElement = document.getElementById('chatContent');
        chatHistoryElement.appendChild(messageDiv);
    
        messageDiv.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    
        chatHistoryElement.scrollTop = chatHistoryElement.scrollHeight;
    }

    clearBtn.addEventListener("click", () => {
        userInput.value = "";
    });

    sendBtn.addEventListener("click", sendMessage);

    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}
