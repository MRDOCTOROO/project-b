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

    document.getElementById('newChatBtn').addEventListener('click', async () => {
        const newChatTitle = `newchat ${chatHistory.length + 1}`;
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
            chatHistory.push(newChat);
            renderChatList();
            loadChatHistory(newChat.id);

        } catch (error) {
            console.error("创建新对话失败:", error);
        }
    });

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
        const currentChatItem = document.querySelector('.chat-item.active');

        if (!currentChatItem) {
            console.error("未选择对话，请先创建或选择一个对话");
            return;
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
                const titlePrompt = `请将以下内容概括为5个字以内的短标题: "${messageText}"`;
                const titleResponse = await fetch("http://10.100.1.122:3001/api/v1/workspace/sspu/chat", {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Authorization": "Bearer C6W2NTM-RW8432R-GYAFS9F-KPG2SMP",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ "message": titlePrompt, "mode": "chat" })
                });
                const titleData = await titleResponse.json();
                if (titleData.textResponse) {
                    const newTitle = titleData.textResponse.replace(/["'“]/g, '').trim();
                    await updateChatTitle(chat_id, newTitle);
                }
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
            const response = await fetch("http://10.100.1.122:3001/api/v1/workspace/sspu/chat ", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Authorization": "Bearer C6W2NTM-RW8432R-GYAFS9F-KPG2SMP",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "message": params,
                    "mode": "chat"
                })
            });
            
            const data = await response.json();
            console.log(data);
            let botReply = data.textResponse;

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

            const averageGpuUsage = gpuCount > 0 ? (totalGpuUsage / gpuCount).toFixed(2) + "%" : "0%";
            const averageCpuUsage = machineCount > 0 ? (totalCpuUsage / machineCount).toFixed(2) + "%" : "0%";

            const systemLoad = {
                averageCpuUsage,
                totalCpuCores: cpuDetails.totalCores,
                totalCpuThreads: cpuDetails.totalThreads,
                totalGpuUsage: averageGpuUsage,
                gpus: gpuDetails
            };

            console.log("Updated System Load:", systemLoad);

            const prompt = `
    当前系统状态：
    - CPU平均使用率 = ${systemLoad.averageCpuUsage}
    - GPU平均使用率 = ${systemLoad.totalGpuUsage}
    - 总 CPU 核心数 = ${systemLoad.totalCpuCores}
    - 总 CPU 线程数 = ${systemLoad.totalCpuThreads}
    GPU 队列情况：
- A800_MIG 队列：包含 4 张 40GB 显存的 A800 显卡，适用于轻量型、短时间任务
- A800_MIG_long 队列：使用同样的 4 张 A800_MIG 显卡，适用于显存占用较小但运行时间较长的任务
- gpu-long 队列：包含 4 张 80GB 显存的 A800 显卡，适合大显存、长时间训练任务
- 独享 GPU 队列：提供 6 张 80GB 显存的 A800 显卡，仅对填写了科研方向的教师开放

CPU 队列情况：
- cpu_long 队列：适合运行时间较长的 CPU 密集型任务
- comput 队列：CPU 短队列，适用于 1 至 4 小时的短任务

请根据上述系统资源状况和队列设置，结合用户任务需求，给出合理的资源分配建议。回答应简洁、专业，使用中文。
用户的问题与系统资源无关，请直接聚焦问题本身作答。如果问题描述不清楚，请引导用户提供更具体的信息，或建议联系管理员处理

    用户需求：${message}

    回答要求：
- 回答必须使用中文
- 如果问题涉及资源申请、任务安排或系统负载，展示系统状态并提供合理建议
- 如果问题与资源无关，不要展示系统资源信息
    `;
            return prompt;
        } catch (error) {
            console.error("Failed to fetch system status:", error);
            return null;
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
