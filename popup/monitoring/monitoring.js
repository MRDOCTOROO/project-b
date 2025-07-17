document.addEventListener("DOMContentLoaded", () => {
    // 返回按钮
    document.getElementById("back-btn").addEventListener("click", () => {
        window.location.href = "../popup.html";
    });

    // 初始化数据获取
    init();
});

async function init() {
    try {
        const userId = await getUserId();
        if (!userId) {
            console.error("无法获取用户ID");
            renderError("无法获取用户ID，请确保已登录。");
            return;
        }
        
        // 并行获取 GPU 和容器数据
        await Promise.all([
            fetchGpuUsage(userId),
            fetchContainerUsage(userId)
        ]);

    } catch (error) {
        console.error("初始化监控页面失败:", error);
        renderError(`页面加载失败: ${error.message}`);
    }
}

function getUserId() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('user_id', (data) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            // 如果没有 user_id，可以返回 null 或一个默认值
            resolve(data.user_id || '1'); 
        });
    });
}

// --- GPU 使用情况 ---

async function fetchGpuUsage(userId) {
    try {
        const urls = [
            "http://10.100.1.98:8000/g1",
            "http://10.100.1.98:8000/g2",
            "http://10.100.1.98:8000/g3"
        ];
        const responses = await Promise.all(urls.map(url => fetch(url).then(res => res.json())));
        const allGpuData = responses.flat();
        const userTasks = processGpuData(allGpuData, userId);
        renderGpuTasks(userTasks);
    } catch (error) {
        console.error("获取 GPU 数据失败:", error);
        renderGpuError(`获取 GPU 数据失败: ${error.message}`);
    }
}

function processGpuData(gpuData, userId) {
    const userTasks = [];
    for (const gpuEntry of gpuData) {
        const { gpu, memory_usage, user, processes } = gpuEntry;
        const isUserTask = user?.some(u => u.username && u.username.includes(userId));

        if (isUserTask) {
            const userProcesses = processes?.filter(p => p.name.includes("python")) || [];
            const { used, total } = parseMemoryUsage(memory_usage);
            const percentage = total > 0 ? (used / total) * 100 : 0;

            userTasks.push({
                gpu_id: gpu,
                memory_used: `${used} MiB`,
                memory_total: `${total} MiB`,
                memory_percentage: Math.min(100, percentage),
                process_names: userProcesses.map(p => p.name)
            });
        }
    }
    return userTasks;
}

function renderGpuTasks(tasks) {
    const container = document.getElementById("gpu-tasks");
    container.innerHTML = ""; // 清空

    if (tasks.length === 0) {
        // 如果没有任务，可以不显示任何内容，或者显示一个提示
        return;
    }

    tasks.forEach(task => {
        const card = document.createElement("div");
        card.className = "card";
        const processesHtml = task.process_names.length > 0
            ? task.process_names.map(p => `<span class="tag">${p}</span>`).join('')
            : `<span class="tag">无活跃进程</span>`;

        card.innerHTML = `
            <h2>GPU ${task.gpu_id}</h2>
            <p><strong>显存使用:</strong> ${task.memory_used} / ${task.memory_total}</p>
            <div class="memory-progress-bar">
                <div class="memory-progress-fill" style="width: ${task.memory_percentage.toFixed(2)}%;"></div>
            </div>
            <div class="process-tags">
                ${processesHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

function parseMemoryUsage(memoryStr) {
    const match = memoryStr.match(/(\d+)\s*MiB\s*\/\s*(\d+)\s*MiB/);
    return match ? { used: parseInt(match[1]), total: parseInt(match[2]) } : { used: 0, total: 0 };
}

// --- 容器使用情况 ---

async function fetchContainerUsage(userId) {
    try {
        const url = `http://10.100.1.97:30668/user_${userId}/_search?pretty`;
        const response = await fetch(url);
        if (response.status === 404) {
            renderContainerRecords([]);
            return;
        }
        if (!response.ok) throw new Error(`网络响应错误: ${response.statusText}`);
        const data = await response.json();
        renderContainerRecords(data.hits.hits);
    } catch (error) {
        console.error("获取容器数据失败:", error);
        renderContainerError(`获取容器数据失败: ${error.message}`);
    }
}

function renderContainerRecords(records) {
    const container = document.getElementById("container-list");
    container.innerHTML = ""; // 清空

    if (records.length === 0) {
        container.innerHTML = `<div class="card"><p>当前用户没有使用记录</p></div>`;
        return;
    }

    records.forEach(hit => {
        const record = hit._source;
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h2>容器 ${record.container_id.substring(0, 8)}...</h2>
            <p><strong>创建时间:</strong> ${new Date(record.created_at).toLocaleString()}</p>
            <p><strong>关闭时间:</strong> ${new Date(record.closed_at).toLocaleString()}</p>
            <p><strong>CPU核心数:</strong> ${record.cpu_cores_requested}</p>
            <p><strong>GPU数量:</strong> ${record.gpu_count}</p>
            <p><strong>GPU型号:</strong> ${record.gpu_models.join(", ")}</p>
        `;
        container.appendChild(card);
    });
}

// --- 错误处理 ---

function renderError(message) {
    const container = document.querySelector(".container");
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

function renderGpuError(message) {
    const container = document.getElementById("gpu-tasks");
    container.innerHTML = `<div class="card"><p class="error-message">${message}</p></div>`;
}

function renderContainerError(message) {
    const container = document.getElementById("container-list");
    container.innerHTML = `<div class="card"><p class="error-message">${message}</p></div>`;
}
