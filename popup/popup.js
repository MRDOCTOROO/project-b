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

    // 研究者推荐按钮
    const recommendationBtn = document.getElementById("recommendation-btn");
    if (recommendationBtn) {
        recommendationBtn.addEventListener("click", showRecommendations);
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
    
        const results = await Promise.all(
            urls.map(async (url) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.error(`Failed to fetch ${url}: ${response.statusText}`);
                        return []; // 返回空数组而不是抛出错误
                    }
                    return await response.json();
                } catch (error) {
                    console.error(`Error fetching or parsing ${url}:`, error);
                    return []; // 返回空数组以允许其他请求成功
                }
            })
        );
    
        return results.flat(); // 合并所有成功获取的 GPU 数据
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
        if (!username) {
            console.warn("fetchRelatedUsers: username is empty");
            return null;
        }

        const apiUrl = `http://10.100.1.122:5001/api/users/${encodeURIComponent(username)}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.warn(`API returned ${response.status} for user: ${username}`);
                return null;
            }
            const data = await response.json();

            // 确保 data 是一个数组
            if (Array.isArray(data)) {
                return data;
            } else if (data && Array.isArray(data.users)) {
                return data.users;
            } else if (data && Array.isArray(data.data)) {
                return data.data;
            }
            return null;
        } catch (error) {
            console.error("Error fetching related users:", error);
            return null;
        }
    }

    // 动态更新页面内容 - 研究者推荐
    function showRelatedResearchers(users, hasError = false) {
        const chatContent = document.getElementById("chatContent");
        const welcomeMessage = document.getElementById("welcomeMessage");

        // 清除欢迎消息
        if (welcomeMessage) {
            chatContent.innerHTML = '';
        }

        // 显示加载或错误消息
        if (hasError) {
            addMessageToChat("System", `
                <div style="background: #fff3cd; border-left: 4px solid #ff9500; padding: 12px; margin: 8px 0; border-radius: 8px;">
                    <p><strong>⚠️ 推荐服务暂时不可用</strong></p>
                    <p style="margin: 8px 0; color: #666;">研究者推荐服务可能正在维护中。您可以：</p>
                    <ul style="margin: 8px 0; padding-left: 20px; color: #666;">
                        <li>稍后再试</li>
                        <li><a href="https://docs.qq.com/form/page/DRWxEc0xEckVNc091#/fill" target="_blank" style="color: #007aff; text-decoration: underline;">填写个人信息表单</a></li>
                        <li>使用<a href="relation/relation.html" style="color: #007aff; text-decoration: underline;">知识图谱</a>搜索相关研究者</li>
                    </ul>
                </div>
            `, "left", true);
            return;
        }

        // 无结果提示
        if (!users || users.length === 0) {
            addMessageToChat("System", `
                <div style="background: #e8f4ff; border-left: 4px solid #007aff; padding: 12px; margin: 8px 0; border-radius: 8px;">
                    <p><strong>ℹ️ 未找到相关研究者</strong></p>
                    <p style="margin: 8px 0; color: #666;">这可能是因为：</p>
                    <ul style="margin: 8px 0; padding-left: 20px; color: #666;">
                        <li>您尚未完善个人信息</li>
                        <li>系统中暂无与您研究方向相似的研究者</li>
                    </ul>
                    <p style="margin: 8px 0; color: #666;">建议：</p>
                    <ul style="margin: 8px 0; padding-left: 20px; color: #666;">
                        <li><a href="https://docs.qq.com/form/page/DRWxEc0xEckVNc091#/fill" target="_blank" style="color: #007aff; text-decoration: underline;">点击填写个人信息表单</a>（填写后请等待数据更新和论文爬取完成）</li>
                        <li>使用<a href="relation/relation.html" style="color: #007aff; text-decoration: underline;">知识图谱</a>探索相关研究者</li>
                    </ul>
                </div>
            `, "left", true);
            return;
        }

        // 显示推荐信息
        addMessageToChat("System", `<strong>📊 根据您的研究方向，为您推荐以下相关研究者：</strong>`, "left", true);

        users.forEach(user => {
            const userInfoHTML = `
                <div style="background: #f9f9f9; border-left: 4px solid #007aff; padding: 12px; margin: 8px 0; border-radius: 8px;">
                    <p><strong>👤 研究者:</strong> ${user.name || 'N/A'} ${user.email ? `(${user.email})` : ''}</p>
                    <p><strong>🏫 学院:</strong> ${user.college || 'N/A'}</p>
                    <p><strong>🔬 研究主题:</strong> ${user.topic_name || 'N/A'}</p>
                </div>
            `;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = userInfoHTML;
            chatContent.appendChild(wrapper.firstElementChild);
        });
    }

    // 研究者推荐功能（由侧边栏按钮触发）
    async function showRecommendations() {
        // 显示加载消息
        const chatContent = document.getElementById("chatContent");
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "chat-message left";
        loadingMsg.innerHTML = '<div class="message-content">正在为您查找相关研究者...</div>';
        chatContent.appendChild(loadingMsg);

        try {
            const currentUser = await getCurrentUser();
            let relatedUsers = await fetchRelatedUsers(currentUser);

            // 如果未找到，尝试用真实中文名再次请求
            if (!relatedUsers || relatedUsers.length === 0) {
                const realName = await verifyRealName();
                if (realName) {
                    relatedUsers = await fetchRelatedUsers(realName);
                }
            }

            // 移除加载消息
            loadingMsg.remove();

            // 显示结果（包括空结果）
            showRelatedResearchers(relatedUsers, false);
        } catch (error) {
            console.error("推荐功能错误:", error);
            loadingMsg.remove();
            showRelatedResearchers(null, true);
        }
    }

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
            await parseImageWithProgress(file); // 解析图片并返回文本
        }
    });

    // 带进度的图片解析函数
    async function parseImageWithProgress(file) {
        // 显示图片预览消息
        const imagePreview = await createImagePreviewMessage(file);

        try {
            // 更新状态为上传中
            updateImagePreviewStatus(imagePreview, 'uploading', '正在上传图片...');

            const formData = new FormData();
            formData.append('image', file);

            // 使用 XMLHttpRequest 来跟踪上传进度
            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // 上传进度
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = Math.round((e.loaded / e.total) * 100);
                        updateImagePreviewStatus(imagePreview, 'uploading', `正在上传图片... ${percentComplete}%`);
                    }
                });

                // 上传完成，开始解析
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            resolve(result);
                        } catch (e) {
                            reject(new Error('解析响应失败'));
                        }
                    } else {
                        reject(new Error(`HTTP ${xhr.status}`));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('网络错误')));
                xhr.addEventListener('abort', () => reject(new Error('上传已取消')));

                xhr.open('POST', 'http://10.100.1.122:5000/ocr');
                xhr.send(formData);
            });

            // 上传完成，更新为解析中
            updateImagePreviewStatus(imagePreview, 'parsing', '正在识别图片内容...');

            // 模拟解析延迟（如果 API 响应很快，让用户看到解析过程）
            await new Promise(resolve => setTimeout(resolve, 500));

            if (result.status === 'success') {
                const ocrText = result.text;
                handleOcrResult(ocrText);
                console.log('OCR识别结果:', ocrText);

                // 更新为成功状态
                updateImagePreviewStatus(imagePreview, 'success', '图片识别成功');

                // 显示识别结果
                addMessageToChat("System", `
                    <div style="margin-top: 8px;">
                        <strong>📝 识别结果：</strong>
                        <div style="background: #f5f5f5; padding: 8px; border-radius: 6px; margin-top: 8px; white-space: pre-wrap;">${ocrText}</div>
                    </div>
                `, "left", true);

                // 如果用户输入框有内容，自动发送
                if (userInput.value.trim()) {
                    setTimeout(() => sendMessage(), 500);
                }
            } else {
                updateImagePreviewStatus(imagePreview, 'error', `识别失败：${result.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('图片解析错误:', error);
            updateImagePreviewStatus(imagePreview, 'error', `错误：${error.message}`);
        }
    }

    // 创建图片预览消息
    async function createImagePreviewMessage(file) {
        const reader = new FileReader();

        const imageSrc = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });

        const messageDiv = document.createElement("div");
        messageDiv.className = "chat-message right";
        messageDiv.id = 'image-preview-' + Date.now();

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="image-preview">
                    <img src="${imageSrc}" alt="上传的图片" style="max-width: 100%; max-height: 200px; border-radius: 8px; display: block;">
                    <div class="image-status" style="margin-top: 8px;">
                        <div class="status-indicator">
                            <div class="spinner-small"></div>
                            <span class="status-text">准备上传...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const chatHistoryElement = document.getElementById('chatContent');
        chatHistoryElement.appendChild(messageDiv);
        chatHistoryElement.scrollTop = chatHistoryElement.scrollHeight;

        return messageDiv;
    }

    // 更新图片预览状态
    function updateImagePreviewStatus(messageDiv, status, text) {
        const statusDiv = messageDiv.querySelector('.image-status');
        if (!statusDiv) return;

        const statusClasses = {
            uploading: 'status-uploading',
            parsing: 'status-parsing',
            success: 'status-success',
            error: 'status-error'
        };

        const icons = {
            uploading: '<div class="spinner-small"></div>',
            parsing: '<div class="spinner-small"></div>',
            success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        };

        statusDiv.className = 'image-status ' + (statusClasses[status] || '');
        statusDiv.innerHTML = `
            <div class="status-indicator ${statusClasses[status] || ''}">
                ${icons[status] || ''}
                <span class="status-text">${text}</span>
            </div>
        `;
    }

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

    // 时间格式化工具函数：将后端时间（默认 UTC）转换为本地显示
    function formatLocalDate(isoString) {
        if (!isoString) return '';
        const normalized = isoString.includes('T') ? isoString : isoString.replace(' ', 'T');
        const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized);
        const date = new Date(hasTimezone ? normalized : `${normalized}Z`);
        if (Number.isNaN(date.getTime())) {
            return isoString;
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    async function loadUserChats(options = {}) {
        const { keepActiveId = null, autoSelect = true } = options;
        console.log("获取对话列表的 user_id:", user_id);
        console.log("user_id 类型:", typeof user_id);
        console.log("user_id 长度:", user_id ? user_id.length : 'null/undefined');

        if (!user_id) {
            console.error("user_id 为空，无法加载对话列表");
            const chatListElement = document.getElementById('chatList');
            if (chatListElement) {
                chatListElement.innerHTML = `
                    <li style="padding: 12px; color: #ff3b30; text-align: center;">
                        未登录，请先登录
                    </li>
                `;
            }
            return;
        }

        const chatListElement = document.getElementById('chatList');

        try {
            const url = `http://10.100.1.122:5000/api/get_chats?user_id=${encodeURIComponent(user_id)}`;
            console.log("请求URL:", url);

            const response = await fetch(url);
            console.log("响应状态:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("HTTP错误:", response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log("获取的对话列表数据:", data);

            if (!data.success) {
                throw new Error(data.message || '获取对话列表失败');
            }

            if (!data.chats || !Array.isArray(data.chats)) {
                throw new Error('返回数据格式错误：chats 不是数组');
            }

            chatHistory = data.chats.map(chat => {
                return {
                    id: chat.chat_id,
                    title: chat.title,
                    time: formatLocalDate(chat.created_at),
                    created_at: chat.created_at, // 保存原始时间戳
                    content: []
                };
            });

            console.log("格式化后的对话列表:", chatHistory);

            // 按时间倒序排列（最新的在前面）
            chatHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // 渲染对话列表
            renderChatList(keepActiveId);

            if (autoSelect) {
                const preferredChat = keepActiveId
                    ? chatHistory.find(chat => chat.id === keepActiveId)
                    : null;
                const targetChat = preferredChat || chatHistory[0];
                if (targetChat) {
                    console.log("自动加载对话:", targetChat.id);
                    const targetChatItem = document.querySelector(`[data-id="${targetChat.id}"]`);
                    if (targetChatItem) {
                        targetChatItem.classList.add('active');
                    }
                    await loadChatHistory(targetChat.id);
                } else {
                    console.log("没有历史对话，显示欢迎消息");
                    const chatContentContainer = document.getElementById('chatContent');
                    chatContentContainer.innerHTML = `
                        <div id="welcomeMessage" class="welcome-message">
                            <h2>欢迎使用智能任务助手</h2>
                            <p>点击左侧"新建对话"按钮开始您的第一个对话。</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error("加载对话列表失败:", error);

            // 检查是否是"用户不存在"错误
            const errorMessage = error.message || '';
            if (errorMessage.includes('用户不存在') || errorMessage.includes('HTTP 404')) {
                console.warn("用户在数据库中不存在，可能需要重新登录");

                // 显示友好的错误提示，并提供解决方案
                if (chatListElement) {
                    chatListElement.innerHTML = `
                        <li style="padding: 16px; color: #ff3b30; text-align: center; line-height: 1.6;">
                            <div style="font-weight: 600; margin-bottom: 8px;">⚠️ 用户数据丢失</div>
                            <div style="font-size: 13px; color: #666; margin-bottom: 12px;">
                                您的账户可能在服务器重启后被清除<br>
                                （后端数据库每次重启会重置）
                            </div>
                            <button id="reloginBtn" style="
                                padding: 8px 16px;
                                background: #007aff;
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 14px;
                            ">
                                重新登录
                            </button>
                        </li>
                    `;

                    // 添加重新登录按钮事件
                    setTimeout(() => {
                        const reloginBtn = document.getElementById('reloginBtn');
                        if (reloginBtn) {
                            reloginBtn.addEventListener('click', () => {
                                chrome.storage.local.remove('user_id', () => {
                                    console.log("清除本地用户ID，跳转到登录页面");
                                    window.location.href = "login/login.html";
                                });
                            });
                        }
                    }, 100);
                }
            } else {
                // 其他错误的通用提示
                if (chatListElement) {
                    chatListElement.innerHTML = `
                        <li style="padding: 12px; color: #ff3b30; text-align: center;">
                            加载失败: ${error.message}
                        </li>
                    `;
                }
            }
        }
    }
    loadUserChats();

    function renderChatList(keepActiveId = null) {
        const chatList = document.getElementById('chatList');
        chatList.innerHTML = chatHistory.map(chat => `
            <li class="chat-item${keepActiveId && chat.id === keepActiveId ? ' active' : ''}" data-id="${chat.id}">
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

            const now = new Date();
            const created_at = now.toISOString();

            const newChat = {
                id: data.chat_id,
                title: newChatTitle,
                time: formatLocalDate(created_at),
                created_at: created_at,
                content: []
            };
            chatHistory.unshift(newChat);
            renderChatList(newChat.id);

            // 清空聊天区域并准备接收新消息（不显示欢迎消息）
            const chatContentContainer = document.getElementById('chatContent');
            chatContentContainer.innerHTML = '';

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

    // 剪贴板粘贴图片功能
    userInput.addEventListener('paste', async (event) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    currentMode = 'image';
                    updateModeDisplay();
                    await parseImageWithProgress(file);
                }
                break;
            }
        }
    });

    // 论文推荐按钮
    const paperRecommendBtn = document.getElementById('paperRecommendBtn');
    if (paperRecommendBtn) {
        paperRecommendBtn.addEventListener('click', showRecommendations);
    }

    async function loadChatHistory(chatId) {
        console.log("加载历史对话 - chat_id:", chatId, ", user_id:", user_id);
        const chatContentContainer = document.getElementById('chatContent');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 增加到30秒

            const url = `http://10.100.1.122:5000/api/get_chat?user_id=${encodeURIComponent(user_id)}&chat_id=${encodeURIComponent(chatId)}`;
            console.log("请求URL:", url);

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log("响应状态:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("HTTP错误:", response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log("获取的对话内容数据:", data);

            if (!data.success) {
                throw new Error(data.message || '获取对话失败');
            }

            if (!data.messages || !Array.isArray(data.messages)) {
                throw new Error('返回数据格式错误：messages 不是数组');
            }

            console.log("消息数量:", data.messages.length);

            // 完全清空容器
            chatContentContainer.innerHTML = '';

            // 如果没有消息，显示欢迎消息
            if (data.messages.length === 0) {
                console.log("对话为空，显示欢迎消息");
                // 重新创建欢迎消息
                const welcomeDiv = document.createElement('div');
                welcomeDiv.id = 'welcomeMessage';
                welcomeDiv.className = 'welcome-message';
                welcomeDiv.innerHTML = `
                    <h2>欢迎使用智能任务助手</h2>
                    <p>这是您的新对话，请输入消息开始交流。</p>
                `;
                chatContentContainer.appendChild(welcomeDiv);
            } else {
                // 更新本地缓存
                const targetChat = chatHistory.find(chat => chat.id === chatId);
                if (targetChat) {
                    targetChat.content = data.messages;
                }

                // 渲染所有历史消息
                data.messages.forEach(msg => {
                    const sender = msg.sender === 'user' ? "You" : "Assistant";
                    const position = msg.sender === 'user' ? "right" : "left";
                    console.log("渲染消息:", sender, position, msg.content.substring(0, 50) + "...");
                    addMessageToChat(sender, msg.content, position);
                });
            }

            // 滚动到底部
            chatContentContainer.scrollTop = chatContentContainer.scrollHeight;
            console.log("对话加载完成");

        } catch (error) {
            console.error("加载对话内容失败:", error);

            // 清空容器并显示友好的错误消息
            chatContentContainer.innerHTML = '';

            const errorMessage = error.message || '';

            // 检查是否是"用户不存在"错误
            if (errorMessage.includes('用户不存在') || errorMessage.includes('HTTP 404')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'welcome-message';
                errorDiv.innerHTML = `
                    <h2>⚠️ 用户数据丢失</h2>
                    <p>您的账户可能在服务器重启后被清除。</p>
                    <p style="font-size: 13px; color: #666; margin-top: 12px;">
                        原因：后端数据库每次重启会重置所有数据
                    </p>
                    <button id="reloginBtnMain" style="
                        padding: 10px 20px;
                        background: #007aff;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        margin-top: 12px;
                    ">
                        重新登录
                    </button>
                `;
                chatContentContainer.appendChild(errorDiv);

                // 添加重新登录按钮事件
                setTimeout(() => {
                    const reloginBtn = document.getElementById('reloginBtnMain');
                    if (reloginBtn) {
                        reloginBtn.addEventListener('click', () => {
                            chrome.storage.local.remove('user_id', () => {
                                console.log("清除本地用户ID，跳转到登录页面");
                                window.location.href = "login/login.html";
                            });
                        });
                    }
                }, 100);
            } else {
                // 其他错误的通用提示
                const errorDiv = document.createElement('div');
                errorDiv.className = 'welcome-message';
                errorDiv.innerHTML = `
                    <h2>⚠️ 加载对话失败</h2>
                    <p>无法加载对话内容，但这不影响您发送新消息。</p>
                    <p style="font-size: 13px; color: #666; margin-top: 12px;">
                        ${error.name === 'AbortError' ? '请求超时，请检查网络连接' : error.message}
                    </p>
                    <p style="font-size: 13px; color: #666; margin-top: 8px;">
                        请尝试：刷新页面、检查网络、或选择其他对话
                    </p>
                `;
                chatContentContainer.appendChild(errorDiv);
            }
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
                addMessageToChat("System", "创建新对话失败，请刷新页面重试", "left");
                return;
            }
            currentChatItem = document.querySelector('.chat-item.active');
            if (!currentChatItem) {
                addMessageToChat("System", "无法获取当前对话，请刷新页面", "left");
                return;
            }
        }

        const chat_id = currentChatItem.dataset.id;
        const currentChat = chatHistory.find(chat => chat.id === chat_id);
        const isFirstMessage = currentChat ? currentChat.content.length === 0 : false;

        // 如果是第一条消息，移除欢迎消息（如果存在）
        if (isFirstMessage) {
            const welcomeMessage = document.getElementById('welcomeMessage');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
        }

        addMessageToChat("You", messageText, "right");

        // 创建改进的加载指示器
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message left loading-message';
        loadingDiv.innerHTML = `
            <div class="message-content">
                <div class="loading-indicator">
                    <div class="loading-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <span class="loading-text">正在思考...</span>
                </div>
            </div>
        `;
        const chatContentContainer = document.getElementById('chatContent');
        chatContentContainer.appendChild(loadingDiv);
        chatContentContainer.scrollTop = chatContentContainer.scrollHeight;

        try {
            // 添加超时的fetch包装函数
            const fetchWithTimeout = async (url, options, timeout = 30000) => {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeout);
                try {
                    const response = await fetch(url, {
                        ...options,
                        signal: controller.signal
                    });
                    clearTimeout(id);
                    return response;
                } catch (error) {
                    clearTimeout(id);
                    if (error.name === 'AbortError') {
                        throw new Error('请求超时（30秒），请检查网络连接或稍后重试');
                    }
                    throw error;
                }
            };

            // 保存用户消息（不阻塞主流程，失败也继续）
            fetchWithTimeout(
                'http://10.100.1.122:5000/api/save_chat',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user_id,
                        message: messageText,
                        chat_id: chat_id,
                        sender: 'user'
                    })
                },
                30000 // 30秒超时
            ).then(response => {
                if (!response.ok) {
                    console.error('存储消息失败:', response.status);
                }
            }).catch(saveError => {
                console.error('存储消息失败，但继续发送:', saveError);
            });

            if (isFirstMessage) {
                // 异步更新对话列表，不打断当前会话内容
                loadUserChats({ keepActiveId: chat_id, autoSelect: false }).catch(err => {
                    console.error('更新对话列表失败，但不影响主流程:', err);
                });
            }

            let prompt = "";
            if (currentMode === 'resource') {
                prompt = await updateSystemLoad(messageText);
            } else if(currentMode === 'document'){
                prompt = `
                你是一个专业的AI助手，你的任务是根据用户的问题去本地的向量数据库寻找问题的答案，
                如果没有对应的解答则返回"知识库中并没有问题的答案，但是根据训练时的数据，该问题可以"，然后根据你自己的了解去回答该问题。
                用户的问题是： ${messageText}
                 `;
            } else if(currentMode === 'image'){
                prompt = `
                现在给你的字符是从图片中识别的文字，请根据识别到的文字信息回答问题。
                图片信息是：${ocrTextResult}
                用户的问题是： ${messageText} `;
                currentMode = 'resource';
                updateModeDisplay();
            } else {
                prompt = `你是一个协助科研的大模型。用户的问题是：${messageText}`;
            }

            console.log("当前模式===>", currentMode);
            console.log("当前模式下的prompt===>", prompt);
            await chat(prompt, loadingDiv, chat_id, currentChatItem);
        } catch (error) {
            console.error('发送消息失败:', error);
            loadingDiv.remove();

            // 提供更详细的错误信息
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = '网络连接失败，请检查网络设置或服务器是否运行';
            } else if (error.message.includes('timeout') || error.message.includes('超时')) {
                errorMessage = error.message;
            }

            addMessageToChat("System", `
                <div style="background: #fff3cd; border-left: 4px solid #ff9500; padding: 12px; border-radius: 8px;">
                    <p><strong>⚠️ 发送失败</strong></p>
                    <p style="margin: 8px 0; color: #666;">${errorMessage}</p>
                    <p style="margin: 8px 0; color: #666; font-size: 13px;">建议：</p>
                    <ul style="margin: 4px 0; padding-left: 20px; color: #666; font-size: 13px;">
                        <li>检查网络连接</li>
                        <li>检查服务器是否运行</li>
                        <li>稍后重试</li>
                    </ul>
                </div>
            `, "left", true);
        }
    }

    async function chat(params, loadingDiv, chat_id, currentChatItem) {
        const startTime = Date.now();
        let lastUpdateTime = startTime;

        // 更新加载指示器的时间
        const updateLoadingTime = () => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const loadingText = loadingDiv.querySelector('.loading-text');
            if (loadingText) {
                if (elapsed < 5) {
                    loadingText.textContent = '正在思考...';
                } else if (elapsed < 15) {
                    loadingText.textContent = `正在思考... (${elapsed}秒)`;
                } else if (elapsed < 30) {
                    loadingText.textContent = `响应较慢... (${elapsed}秒)`;
                } else {
                    loadingText.textContent = `等待响应... (${elapsed}秒)`;
                }
            }
        };

        const loadingTimer = setInterval(updateLoadingTime, 1000);

        try {
            const modelConfig = await new Promise(resolve => chrome.storage.local.get('modelConfig', result => resolve(result.modelConfig)));

            let fetchUrl, fetchHeaders, fetchBody;
            const isCustom = modelConfig && modelConfig.type === 'custom';

            if (isCustom) {
                fetchUrl = modelConfig.url.trim();
                fetchHeaders = {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${modelConfig.key}`
                };
                fetchBody = JSON.stringify({
                    model: modelConfig.name,
                    messages: [{ role: 'user', content: params }],
                    stream: false // 暂时禁用流式，直到后端支持
                });
            } else {
                // Default model settings (AnythingLLM)
                fetchUrl = "http://10.100.1.122:3001/api/v1/workspace/sspu/chat";
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

            // 使用带超时的fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

            const response = await fetch(fetchUrl, {
                method: "POST",
                headers: fetchHeaders,
                body: fetchBody,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            clearInterval(loadingTimer);

            // Check HTTP response status
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败 (${response.status}): ${errorText || response.statusText}`);
            }

            const data = await response.json();
            console.log('API响应:', data);

            let botReply;

            if (isCustom) {
                // 支持多种API响应格式
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    botReply = data.choices[0].message.content;
                } else if (data.content && data.content[0] && data.content[0].text) {
                    botReply = data.content[0].text;
                } else if (data.reply) {
                    botReply = data.reply;
                } else if (data.response) {
                    botReply = data.response;
                } else if (data.answer) {
                    botReply = data.answer;
                } else if (data.text) {
                    botReply = data.text;
                } else if (typeof data === 'string') {
                    botReply = data;
                } else {
                    throw new Error('无法解析API响应，请检查API返回格式是否正确');
                }
            } else {
                // AnythingLLM默认格式
                botReply = data.textResponse;
            }

            if (!botReply) {
                throw new Error('API返回为空，请检查API配置');
            }

            // 移除加载指示器
            loadingDiv.remove();

            // 添加回复消息
            addMessageToChat("Assistant", botReply, "left");

            // 保存AI回复到数据库（不阻塞主流程）
            fetch('http://10.100.1.122:5000/api/save_chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user_id,
                    message: botReply,
                    chat_id: chat_id,
                    sender: 'ai'
                })
            }).then(response => {
                if (!response.ok) {
                    console.error('存储AI消息失败:', response.status);
                }
            }).catch(saveError => {
                console.error('保存AI回复失败（不影响用户）:', saveError);
            });

        } catch (error) {
            clearInterval(loadingTimer);
            console.error('AI聊天失败:', error);

            // 移除加载指示器
            if (loadingDiv && loadingDiv.parentNode) {
                loadingDiv.remove();
            }

            // 提供详细的错误信息
            let errorDetails = '';
            if (error.name === 'AbortError') {
                errorDetails = '请求超时（60秒）。这可能是因为：\n' +
                    '• 服务器负载过高\n' +
                    '• 网络连接不稳定\n' +
                    '• API响应时间过长';
            } else if (error.message.includes('API请求失败')) {
                errorDetails = error.message;
            } else if (error.message.includes('Failed to fetch')) {
                errorDetails = '无法连接到API服务器。请检查：\n' +
                    '• 服务器地址是否正确\n' +
                    '• 网络连接是否正常\n' +
                    '• API密钥是否有效';
            } else {
                errorDetails = error.message || '未知错误';
            }

            addMessageToChat("System", `
                <div style="background: #ffe6e6; border-left: 4px solid #ff3b30; padding: 12px; border-radius: 8px;">
                    <p><strong>❌ AI回复失败</strong></p>
                    <p style="margin: 8px 0; color: #666; white-space: pre-wrap;">${errorDetails}</p>
                </div>
            `, "left", true);
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

            // Fetch detailed GPU data from the correct endpoints
            console.log("Fetching GPU data...");
            const gpuData = await fetchGpuData();
            console.log("GPU data:", gpuData);

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
当前系统实时 GPU 资源状态：
- 可用 A800_MIG (40GB) 显卡数量: ${available40G} / ${total40G}
- 可用 A800 (80GB) 显卡数量: ${available80G} / ${total80G}

GPU 队列信息:
- A800_MIG 队列 (40GB显卡): 适用于轻量型、短时间或显存占用小的长时任务。
- gpu-long 队列 (80GB显卡): 适合需要大显存、长时间的训练任务。
- 独享 GPU 队列 (80GB显卡): 仅对特定教师开放。

任务要求:
请你作为一名专业的HPC管理员，根据上述实时 GPU 资源状况和队列信息，为用户提供专业、合理的资源分配建议。

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
            
            // 增强的调试信息
            if (error.message.includes('fetch')) {
                console.error("This might be a network issue, a CORS problem, or the endpoint is down.");
            } else {
                console.error("This might be a data processing issue. Check the structure of the received data.");
            }

            // Fallback prompt if APIs fail
            return `你是一个协助科研的大模型。用户的问题是：${message}`;
        }
    }

    function addMessageToChat(sender, text, position, isHTML = false) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `chat-message ${position}`;

        const messageContent = document.createElement("div");
        messageContent.className = "message-content";

        let cleanHtml;
        if (isHTML) {
            // 直接使用 HTML，跳过 markdown 解析
            cleanHtml = DOMPurify.sanitize(text, {
                ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'br', 'div', 'span', 'style'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'onclick', 'type', 'target', 'rel']
            });
        } else {
            // Markdown 解析
            const rawHtml = marked.parse(text);
            cleanHtml = DOMPurify.sanitize(rawHtml, {
                ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'br'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel']
            });
        }

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
