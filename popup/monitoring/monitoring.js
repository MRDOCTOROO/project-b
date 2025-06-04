// popup/monitoring/monitoring.js

// 用户 ID 生成逻辑（这里你可以替换成实际获取用户逻辑）

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

        let user_id = data.user_id; // 获取存储的 user_id
        // console.log("user_id在getorcreat中获取本地的最初的获取userid函数===>", user_id);

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
        //   console.log("已存在的用户 ID:", user_id);
          resolve(user_id);
        }
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
  const user_id = await generateUserId(); // 假设这个函数仍可用
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

function extractMemoryUsed(memoryStr) {
  const match = memoryStr.match(/(\d+)\s*MiB/);
  return match ? parseInt(match[1]) : 0;
}

async function getUserGpuUsage() {
  const userId = await getuserId();
  console.log('当前用户ID:', userId);

  const gpuData = await fetchGpuData();
  const userTasks = [];

  for (const gpuEntry of gpuData) {
    const { gpu, memory_usage, user, processes } = gpuEntry;

    const matchingUsers = user?.filter(u => u.username && u.username.includes(userId));
    if (matchingUsers && matchingUsers.length > 0) {
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

// 渲染结果到页面
function renderGpuTasks(tasks) {
  const container = document.getElementById("gpu-tasks");
  container.innerHTML = "";

  if (tasks.length === 0) {
    container.innerHTML = "<p>当前用户没有运行任务。</p>";
    return;
  }

  tasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "gpu-task";
    div.innerHTML = `
      <h3>GPU ${task.gpu_id}</h3>
      <p><strong>显存使用：</strong> ${task.memory_used}</p>
      <p><strong>进程：</strong> ${task.process_names.join(", ")}</p>
    `;
    container.appendChild(div);
  });
}

// 执行主逻辑
getUserGpuUsage().then(renderGpuTasks).catch(err => {
  document.getElementById("gpu-tasks").innerHTML = `<p>获取数据出错: ${err}</p>`;
});
