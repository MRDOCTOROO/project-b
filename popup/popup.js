document.addEventListener("DOMContentLoaded", () => {


    //退出登录
        // 退出登录按钮事件
        document.getElementById('logoutBtn').addEventListener('click', function() {
            chrome.storage.local.remove('user_id', () => {
                console.log("用户已退出登录");
                window.location.href = "login/login.html"; // 退出后跳转到登录页面
            });
        });
    //页面加载首先加载历史对话
    loadChatHistory();

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
    const chatHistory = document.getElementById("chat-history");

    // 生成用户ID（如果不存在）
            // function generateUserId() {
            //     let user_id = sessionStorage.getItem('user_id');  // 先从 sessionStorage 获取 user_id
            //     console.log("user_idlocal===>", user_id);
                
            //     if (!user_id) {
            //         user_id = 'user_' + Math.random().toString(36).substr(2, 9);  // 如果没有，生成一个新的唯一ID
            //         sessionStorage.setItem('user_id', user_id);  // 存储到 sessionStorage
            //     }
            //     return user_id;
            // }
//生成用户ID改进版本
// 生成或获取用户ID
// function getOrCreateUserId() {
//     return new Promise((resolve) => {
//       chrome.storage.local.get('user_id', (data) => {
//         let user_id = data.user_id; // 从本地存储获取 user_id
  
//         if (!user_id) {
//           user_id = 'user_' + Math.random().toString(36).substr(2, 9); // 生成唯一 ID
//           chrome.storage.local.set({ user_id }, () => {
//             console.log("新用户 ID 生成并存储:", user_id);
//             resolve(user_id); // 返回新生成的 ID
//           });
//         } else {
//           console.log("已存在的用户 ID:", user_id);
//           resolve(user_id); // 返回已有的 ID
//         }
//       });
//     });
//   }
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

        if (!user_id) {
          user_id = 'user_' + Math.random().toString(36).substr(2, 9); // 生成新的 ID
          chrome.storage.local.set({ user_id }, () => {
            if (chrome.runtime.lastError) {
              console.error("存储用户 ID 失败:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
              return;
            }
            console.log("新用户 ID 生成并存储:", user_id);
            resolve(user_id);
          });
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

    

    //加载对话历史
    async function loadChatHistory() {

        //从浏览器本地存储获取用户ID
        // const user_id = sessionStorage.getItem("user_id");
        // if (!user_id) {
        //     console.warn("用户未登录，无法加载聊天记录");
        //     return;
        // }
        // const user_id = "gsj";
        const user_id = await generateUserId();
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/get_chat?user_id=${user_id}`);
            if (!response.ok) {
                throw new Error("无法获取聊天记录");
            }
    
            const data = await response.json();
            const messages = data.messages;  // 假设后端返回 { "messages": [{ "sender": "You", "message": "...", "timestamp": 123456 }] }
    
            // **按时间顺序排序**（如果后端未排序）
            messages.sort((a, b) => a.timestamp - b.timestamp);
    
            // **加载聊天记录到对话框**
            messages.forEach(msg => {
                const position = msg.sender === "You" ? "right" : "left";
                addMessageToChat(msg.sender, msg.message, position);
            });
    
            console.log("聊天记录加载完成");
    
        } catch (error) {
            console.error("加载聊天记录失败:", error);
        }
    }
    

    // 发送消息
    async function sendMessage() {

        try {
            const message = userInput.value.trim();
            if (!message) return;

            // 获取用户 ID（从 sessionStorage 获取）


            // 调用 generateUserId 函数获取 user_id
            const user_id = await generateUserId();
            console.log("user_id===>", user_id);

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
            chatHistory.appendChild(loadingDiv);
            

            // 发送用户消息到后端存储
            const response = await fetch('http://127.0.0.1:5000/api/save_chat', {  // 替换为你的后端 API 地址
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user_id,  //从 Session获取用户ID
                message: message
                // ai_reply: null
                // ai_reply: ai_reply
            })
        });

        if (!response.ok) {
            throw new Error('存储消息失败');
        }


            // 获取集群监控数据（确保后端服务已启动，并调整 URL 为实际地址） 使用fetch获取数据 
            let prompt = "";
            prompt = await updateSystemLoad(message)
            console.log("prompt===>", prompt);
            // 调用chat服务
            chat(prompt);
        } catch (error) {
            console.error('发送消息失败:', error);
            addMessageToChat("System", `错误：${error.message}`, "left");
        }
    }

    async function chat(params) {
        try {
            const response = await fetch("http://10.100.1.97:30642/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 根据实际需要添加认证头（当前示例无认证）
                },
                body: JSON.stringify({
                    "model": "/share/fshare/common/models/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B/",
                    "messages": [
                        {
                            "role": "user",
                            "content": params
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1024
                })
            });
            // 解析 AI 回复消息
            const data = await response.json();
            let botReply = data.choices[0].message.content;

            // botReply = botReply.replace(/<\/?think>/g, ''); // 移除 <think> 标签

            // 在界面中添加 AI 回复消息
            addMessageToChat("Assistant", botReply, "left");

            //获取用户id并存储ai回复到数据库
            // const user_id = sessionStorage.getItem("user_id");
            // if (!user_id) {
            //     throw new Error("用户未登录，无法存储消息");
            // }
            
            //  // 发送ai消息到后端存储
            //  let ai_reply = botReply;
            //  const response2 = await fetch('http://127.0.0.1:5000/store_message', {  // 替换为你的后端 API 地址
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({
            //         user_id: user_id,  //从 Session获取用户ID
            //         // message: message,
            //         message:null,
            //         ai_reply: ai_reply
            //     })
            // });
    
            // if (!response2.ok) {
            //     throw new Error('存储消息失败');
            // }           

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

    请根据用户需求类型分步骤处理：
    1. **需求识别**：判断用户意图属于以下哪一类：
    - 资源扩容（如运行卡顿/启动新服务）
    - 故障排查（如异常负载/性能下降）
    - 成本优化（如降低资源消耗）
    - 容量规划（如未来业务扩展）

    2. **动态响应**：
    - 若为**资源扩容**：推荐CPU/GPU/内存/存储的配置，并对比当前负载缺口。
    - 若为**故障排查**：分析高负载组件的原因，给出诊断思路（如进程检查、内存泄漏排查命令）。
    - 若为**成本优化**：提出降配建议（如弹性伸缩策略、闲置资源清理）。
    - 若为**容量规划**：根据历史增长趋势预测未来资源需求。

    3. **统一要求**：
    - 以自然对话形式回复，先总结系统状态，再针对性响应。
    - 技术术语需附带白话解释（例："GPU使用率高可能导致渲染阻塞，可理解为视频编码排队"）。
    - 主动询问是否需要进一步帮助（如"是否需要具体监控命令？"）。

    所有回答优先使用中文。

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

                if (sender === "Assistant") {
                    // 解析Markdown并净化HTML
                    const rawHtml = marked.parse(text);
                    const cleanHtml = DOMPurify.sanitize(rawHtml, {
                        ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img'],
                        ALLOWED_ATTR: ['href', 'src', 'alt']
                    });

                    messageDiv.innerHTML = `
            <div class="message-header">${sender}</div>
            <div class="markdown-body">${cleanHtml}</div>
        `;
                } else {
                    // 用户消息保持纯文本
                    messageDiv.innerHTML = `
        <div class="message-header">${sender}</div>
        <div>${escapeHtml(text)}</div>
        `;
                }

        chatHistory.appendChild(messageDiv);

        // 高亮代码块
        messageDiv.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });

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

