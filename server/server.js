
// 在服务器部署简单的监控 API 服务Node.js + Express

// server.js
const express = require('express');
const os = require('os');
const { exec } = require('child_process');
const app = express();
const port = 3000;

// 用于获取磁盘使用情况的示例函数（可以使用第三方模块，如 diskusage）
function getDiskUsage() {
  // 这里使用占位数据，实际使用时建议使用 diskusage 或执行 df 命令解析结果
  return "80%";
}

app.get('/metrics', (req, res) => {
  // 获取 CPU 负载（1、5、15 分钟平均负载）
  const cpuLoad = os.loadavg()[0]; // 这里取 1 分钟负载平均值
  // 获取内存信息
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  // 获取 GPU 使用情况（假设使用 NVIDIA GPU）
  exec('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', (error, stdout, stderr) => {
    let gpuUsage = null;
    if (error) {
      console.error("获取 GPU 信息错误:", stderr);
      gpuUsage = "未知";
    } else {
      // 如果有多块 GPU，则返回多行数据
      gpuUsage = stdout.trim().split('\n');
    }
    // 获取存储使用情况（这里使用示例函数）
    const diskUsage = getDiskUsage();

    // 返回 JSON 格式的数据
    res.json({
      cpuLoad,          // 例如 1 分钟平均负载值
      totalMemory,      // 总内存（字节）
      freeMemory,       // 空闲内存（字节）
      gpuUsage,         // GPU 使用率列表（百分比）
      diskUsage         // 存储使用情况（例如 "80%"）
    });
  });
});

app.listen(port, () => {
  console.log(`Metrics API listening at http://localhost:${port}`);
});
