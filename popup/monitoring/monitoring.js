// // popup/monitoring/monitoring.js

// // 用户 ID 生成逻辑（这里你可以替换成实际获取用户逻辑）

//     // 返回按钮跳转逻辑
//     document.getElementById("back-btn").addEventListener("click", () => {
//       window.location.href = "../popup.html";
//     });

// function getOrCreateUserId() {
//   return new Promise((resolve, reject) => {
//     try {
//       chrome.storage.local.get('user_id', (data) => {
//         if (chrome.runtime.lastError) {
//           console.error("获取用户 ID 失败:", chrome.runtime.lastError);
//           reject(chrome.runtime.lastError);
//           return;
//         }

//         let user_id = data.user_id; // 获取存储的 user_id
//         // console.log("user_id在getorcreat中获取本地的最初的获取userid函数===>", user_id);

//         if (!user_id) {
//         //   user_id = 'user_' + Math.random().toString(36).substr(2, 9); // 生成新的 ID
//         //   chrome.storage.local.set({ user_id }, () => {
//         //     if (chrome.runtime.lastError) {
//         //       console.error("存储用户 ID 失败:", chrome.runtime.lastError);
//         //       reject(chrome.runtime.lastError);
//         //       return;
//         //     }
//         //     console.log("新用户 ID 生成并存储:", user_id);
//         //     resolve(user_id);
//         //   });
//         user_id = '1'
//         } else {
//         //   console.log("已存在的用户 ID:", user_id);
//           resolve(user_id);
//         }
//       });
//     } catch (error) {
//       console.error("getOrCreateUserId 发生异常:", error);
//       reject(error);
//     }
//   });
// }
//   async function generateUserId() {
//     let user_id = await getOrCreateUserId();
//     console.log("最终用户 ID:", user_id);
//     return user_id;
//   }
// async function getuserId() {
//   const user_id = await generateUserId(); // 假设这个函数仍可用
//   return user_id;
// }


// // 请求 GPU 数据
// async function fetchGpuData() {
//   const urls = [
//     "http://10.100.1.98:8000/g1",
//     "http://10.100.1.98:8000/g2",
//     "http://10.100.1.98:8000/g3"
//   ];
//   const responses = await Promise.all(urls.map(url => fetch(url)));
//   const allData = await Promise.all(responses.map(res => res.json()));
//   return allData.flat();
// }

// function extractMemoryUsed(memoryStr) {
//   const match = memoryStr.match(/(\d+)\s*MiB/);
//   return match ? parseInt(match[1]) : 0;
// }

// async function getUserGpuUsage() {
//   const userId = await getuserId();
//   console.log('当前用户ID:', userId);

//   const gpuData = await fetchGpuData();
//   const userTasks = [];

//   for (const gpuEntry of gpuData) {
//     const { gpu, memory_usage, user, processes } = gpuEntry;

//     const matchingUsers = user?.filter(u => u.username && u.username.includes(userId));
//     if (matchingUsers && matchingUsers.length > 0) {
//       const userProcesses = processes?.filter(p => p.name.includes("python")) || [];
//       const processNames = userProcesses.map(p => p.name);
//       const usedMemory = extractMemoryUsed(memory_usage);

//       userTasks.push({
//         gpu_id: gpu,
//         memory_used: `${usedMemory} MiB`,
//         process_names: processNames
//       });
//     }
//   }

//   return userTasks;
// }

// // 渲染结果到页面
// function renderGpuTasks(tasks) {
//   const container = document.getElementById("gpu-tasks");
//   container.innerHTML = "";

//   if (tasks.length === 0) {
//     container.innerHTML = "<p>当前用户没有运行任务。</p>";
//     return;
//   }

//   tasks.forEach(task => {
//     const div = document.createElement("div");
//     div.className = "gpu-task";
//     div.innerHTML = `
//       <h3>GPU ${task.gpu_id}</h3>
//       <p><strong>显存使用：</strong> ${task.memory_used}</p>
//       <p><strong>进程：</strong> ${task.process_names.join(", ")}</p>
//     `;
//     container.appendChild(div);
//   });
// }

// // 执行主逻辑
// getUserGpuUsage().then(renderGpuTasks).catch(err => {
//   document.getElementById("gpu-tasks").innerHTML = `<p>获取数据出错: ${err}</p>`;
// });
// popup/monitoring/monitoring.js

// 返回按钮跳转逻辑
document.getElementById("back-btn").addEventListener("click", () => {
  window.location.href = "../popup.html";
});

function getOrCreateUserId() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get('user_id', (data) => {
        if (chrome.runtime.lastError) {
          console.error("获取用户 ID 失败:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        let user_id = data.user_id;
        if (!user_id) {
          user_id = '1';
        }
        resolve(user_id);
      });
    } catch (error) {
      console.error("getOrCreateUserId 发生异常:", error);
      reject(error);
    }
  });
}

async function generateUserId() {
  let user_id = await getOrCreateUserId();
  console.log("最终用户 ID:", user_id);
  return user_id;
}

async function getuserId() {
  const user_id = await generateUserId();
  return user_id;
}

// 请求 GPU 数据
async function fetchGpuData() {
  const urls = [
    "http://10.100.1.98:8000/g1",
    "http://10.100.1.98:8000/g2",
    "http://10.100.1.98:8000/g3"
  ];
  const responses = await Promise.all(urls.map(url => fetch(url)));
  const allData = await Promise.all(responses.map(res => res.json()));
  return allData.flat();
}

/**
 * 从 "已用MiB / 总MiB" 格式的字符串中提取已用显存和总显存。
 * @param {string} memoryStr 包含显存信息的字符串，例如 "39417MiB / 40192MiB"。
 * @returns {{used: number, total: number}} 包含已用显存和总显存的对象 (单位为 MiB)，如果解析失败则返回 {used: 0, total: 0}。
 */
function parseMemoryUsage(memoryStr) {
  const match = memoryStr.match(/(\d+)\s*MiB\s*\/\s*(\d+)\s*MiB/);
  if (match && match.length === 3) {
    return {
      used: parseInt(match[1]),
      total: parseInt(match[2])
    };
  }
  return { used: 0, total: 0 };
}

/**
 * 计算显存使用百分比。
 * @param {number} usedMemoryMiB 已用显存 (MiB)。
 * @param {number} totalMemoryMiB 总显存 (MiB)。
 * @returns {number} 显存使用百分比 (0-100)。
 */
function calculateMemoryPercentage(usedMemoryMiB, totalMemoryMiB) {
  if (totalMemoryMiB === 0) return 0;
  // 确保百分比不超过 100
  return Math.min(100, (usedMemoryMiB / totalMemoryMiB) * 100);
}

async function getUserGpuUsage() {
  const userId = await getuserId();
  console.log('当前用户ID:', userId);

  const gpuData = await fetchGpuData();
  const userTasks = [];

  for (const gpuEntry of gpuData) {
    const { gpu, memory_usage, user, processes } = gpuEntry;

    // 根据 username 包含 userId 来过滤当前用户
    const matchingUsers = user?.filter(u => u.username && u.username.includes(userId));

    if (matchingUsers && matchingUsers.length > 0) {
      // 过滤出 Python 进程
      const userProcesses = processes?.filter(p => p.name.includes("python")) || [];
      const processNames = userProcesses.map(p => p.name);

      // 解析显存使用情况，获取已用和总显存
      const { used: usedMemoryMiB, total: totalMemoryMiB } = parseMemoryUsage(memory_usage);
      const memoryPercentage = calculateMemoryPercentage(usedMemoryMiB, totalMemoryMiB);

      userTasks.push({
        gpu_id: gpu,
        memory_used: `${usedMemoryMiB} MiB`,
        memory_total: `${totalMemoryMiB} MiB`, // 新增总显存信息
        memory_percentage: memoryPercentage,
        process_names: processNames
      });
    }
  }

  return userTasks;
}

// 渲染结果到页面
function renderGpuTasks(tasks) {
  const container = document.getElementById("gpu-tasks");
  container.innerHTML = ""; // 清空之前的内容

  if (tasks.length === 0) {
    container.innerHTML = "<p>当前用户没有运行任务。</p>";
    return;
  }

  tasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "gpu-task-card";
    div.innerHTML = `
      <h2>GPU ${task.gpu_id}</h2>
      <p><strong>显存使用:</strong> ${task.memory_used} / ${task.memory_total} (${task.memory_percentage.toFixed(2)}%)</p>
      <div class="memory-progress-bar">
        <div class="memory-progress-fill" style="width: ${task.memory_percentage}%;"></div>
      </div>
      <p><strong>活跃进程:</strong> ${task.process_names.join(", ") || '无'}</p>
    `;
    container.appendChild(div);
  });
}

// 执行主逻辑
getUserGpuUsage()
  .then(renderGpuTasks)
  .catch(err => {
    console.error("获取 GPU 数据失败:", err);
    document.getElementById("gpu-tasks").innerHTML = `<p class="error-message">获取数据出错: ${err.message || err}</p>`;
  });



  // new

// 获取容器数据并返回给调用方
// monitoring.js

// async function getuserId() {
//   return new Promise((resolve, reject) => {
//     chrome.storage.local.get('user_id', (data) => {
//       if (chrome.runtime.lastError) {
//         console.error("获取用户 ID 失败:", chrome.runtime.lastError);
//         resolve('ssjxzyh'); // 默认值
//         return;
//       }

//       let user_id = data.user_id || 'ssjxzyh';
//       resolve(user_id);
//     });
//   });
// }

async function fetchData() {
  const username = await getuserId();
  // const username = 'ssjxzyh';
  const url = `http://10.100.1.97:30668/user_${username}/_search?pretty`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("网络响应失败");

    const data = await response.json();
    const records = data.hits.hits;

    renderRecords(records);
  } catch (error) {
    console.error("获取数据失败:", error);
    document.getElementById("container-list").innerHTML = "<p>无法加载容器记录。</p>";
  }
}

function renderRecords(records) {
  const containerList = document.getElementById("container-list");
  containerList.innerHTML = ""; // 清空旧内容

  if (records.length === 0) {
    containerList.innerHTML = "<p>暂无容器使用记录。</p>";
    return;
  }

  records.forEach(hit => {
    const record = hit._source;

    const card = document.createElement("div");
    card.className = "container-card";

    function toUTCTime(isoStr, offsetHours = -8) {
  const date = new Date(isoStr);
  const utcTimestamp = date.getTime() + (date.getTimezoneOffset() * 60000); // 转为 UTC 时间戳
  const targetTimestamp = utcTimestamp + (offsetHours * 3600000); // 加上目标偏移量
  return new Date(targetTimestamp).toLocaleString(); // 可按需自定义格式
}

    const createdAt = new Date(record.created_at).toLocaleString();
    const closedAt = new Date(record.closed_at).toLocaleString();

    card.innerHTML = `
      <h3>容器 ID: ${record.container_id.substring(0, 8)}...</h3>
      <p><strong>创建时间:</strong> ${createdAt}</p>
      <p><strong>关闭时间:</strong> ${closedAt}</p>
      <p><strong>CPU核心数:</strong> ${record.cpu_cores_requested}</p>
      <p><strong>GPU数量:</strong> ${record.gpu_count}</p>
      <p><strong>GPU型号:</strong> ${record.gpu_models.join(", ")}</p>
    `;
    containerList.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchData();
});