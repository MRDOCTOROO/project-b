// relation/relation.js

document.addEventListener('DOMContentLoaded', function () {
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);

    const container = document.getElementById('mynetwork');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const backButton = document.getElementById('backButton'); // 获取返回按钮

    const data = {
        nodes: nodes,
        edges: edges
    };

    const options = {
        nodes: {
            shape: 'dot',
            size: 20,
            font: {
                size: 14,
                color: '#333'
            },
            borderWidth: 2,
            color: {
                border: '#2B7CE9',
                background: '#97C2E5',
                highlight: {
                    border: '#2B7CE9',
                    background: '#D2E5FF'
                },
                hover: {
                    border: '#2B7CE9',
                    background: '#D2E5FF'
                }
            }
        },
        edges: {
            width: 1,
            color: { inherit: 'from' },
            arrows: 'to',
            font: {
                size: 10,
                align: 'middle'
            },
            smooth: {
                enabled: true,
                type: "continuous"
            }
        },
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -2000,
                centralGravity: 0.3,
                springLength: 120,
                springConstant: 0.05,
                damping: 0.09,
                avoidOverlap: 0.5
            },
            solver: 'barnesHut'
        },
        interaction: {
            dragNodes: true,
            zoomView: true,
            dragView: true,
            navigationButtons: true
        },
        layout: {
            randomSeed: undefined,
            improvedLayout: true
        }
    };

    const network = new vis.Network(container, data, options);

    const BACKEND_API_URL = 'http://10.100.1.122:5002'; // 确保这里是您的 Flask 后端地址

    // 辅助函数：显示加载状态
    function showLoading(message = '加载中...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                font-size: 1.5em;
                color: #333;
                flex-direction: column;
            `;
            const textSpan = document.createElement('span');
            textSpan.id = 'loadingText';
            overlay.appendChild(textSpan);
            document.body.appendChild(overlay);
        }
        document.getElementById('loadingText').innerText = message;
        overlay.style.display = 'flex'; // 确保显示
    }

    // 辅助函数：隐藏加载状态
    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // --- 图谱核心逻辑 ---

    // 1. 初始化加载图谱数据
    async function loadInitialGraph() {
        showLoading('正在加载初始图谱...');
        try {
            const response = await fetch(`${BACKEND_API_URL}/initial_graph`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const graphData = await response.json();
            console.log("初始图谱数据:", graphData);

            nodes.clear();
            edges.clear();
            nodes.add(graphData.nodes);
            edges.add(graphData.edges);

            network.fit();
        } catch (error) {
            console.error("加载初始图谱失败:", error);
            alert("加载初始图谱失败，请检查后端服务是否运行。");
        } finally {
            hideLoading();
        }
    }

    // 2. 点击节点展开相关信息
    network.on("click", async function (params) {
        if (params.nodes.length > 0) {
            const clickedNodeId = params.nodes[0];
            console.log("点击了节点:", clickedNodeId);
            showLoading('正在展开节点...');
            try {
                const response = await fetch(`${BACKEND_API_URL}/expand_node?node_id=${clickedNodeId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const newGraphData = await response.json();
                console.log("展开节点数据:", newGraphData);

                nodes.add(newGraphData.nodes);
                edges.add(newGraphData.edges);

                // network.fit(); // 根据需要，是否每次点击都重新适应视图
            } catch (error) {
                console.error("展开节点失败:", error);
                alert("展开节点失败，请稍后再试。");
            } finally {
                hideLoading();
            }
        }
    });

    // 3. 搜索功能 - 增加 showNotFoundAlert 参数
    /**
     * 执行节点搜索并将结果居中高亮。
     * @param {string} query 搜索关键词。
     * @param {boolean} [showNotFoundAlert=true] 是否在未找到匹配节点时显示弹窗提示。默认为 true。
     */
    async function performSearch(query, showNotFoundAlert = true) {
        if (!query) {
            if (showNotFoundAlert) { // 只有需要弹窗时才提示
                alert("请输入搜索内容！");
            }
            return;
        }

        showLoading('正在搜索...');
        try {
            const response = await fetch(`${BACKEND_API_URL}/search_node?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const searchResults = await response.json();
            console.log("搜索结果:", searchResults);

            if (searchResults.nodes.length > 0) {
                nodes.update(searchResults.nodes);
                edges.update(searchResults.edges);

                network.focus(searchResults.nodes[0].id, {
                    scale: 1.5,
                    animation: {
                        duration: 1000,
                        easingFunction: "easeOutCubic"
                    }
                });
                network.selectNodes([searchResults.nodes[0].id]);
            } else {
                if (showNotFoundAlert) { // 只有需要弹窗时才提示
                    alert("未找到匹配的节点。");
                } else {
                    console.log(`自动搜索未找到匹配 "${query}" 的节点。`); // 自动搜索时只在控制台输出
                }
            }
        } catch (error) {
            console.error("搜索失败:", error);
            if (showNotFoundAlert) { // 只有需要弹窗时才提示
                alert("搜索失败，请稍后再试。");
            } else {
                console.error("自动搜索失败:", error);
            }
        } finally {
            hideLoading();
        }
    }

    // 搜索按钮的事件监听器，调用 performSearch，此时 showNotFoundAlert 默认为 true (即会弹窗)
    searchButton.addEventListener('click', async function () {
        const query = searchInput.value.trim();
        await performSearch(query, true); // 明确传入 true，表示手动搜索失败需要弹窗
    });

    // 4. 双击事件 (可选：例如弹出节点详情或编辑框)
    network.on("doubleClick", function (params) {
        if (params.nodes.length > 0) {
            const doubleClickedNodeId = params.nodes[0];
            const nodeData = nodes.get(doubleClickedNodeId);
            console.log("双击了节点:", nodeData);
            alert(`双击了节点: ${nodeData.label || nodeData.id}\n类型: ${nodeData.group || '未知'}`);
        }
    });

    // --- 返回按钮逻辑 ---
    if (backButton) {
        backButton.addEventListener('click', function () {
            window.location.href = '../popup.html';
        });
    }

    // --- 用户名获取与真实姓名验证 ---

    /**
     * 异步获取用户 ID。
     * @returns {Promise<string|null>} 一个 Promise，解析为用户 ID 字符串或 null。
     */
    function getUserId() {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.get('user_id', (data) => {
                    if (chrome.runtime.lastError) {
                        console.error("获取用户 ID 失败:", chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    const userId = data.user_id;
                    if (userId) {
                        console.log("已存在的用户 ID:", userId);
                        resolve(userId);
                    } else {
                        console.log("本地没有找到用户 ID，返回 null。");
                        resolve(null);
                    }
                });
            } catch (error) {
                console.error("getUserId 发生异常:", error);
                reject(error);
            }
        });
    }

    /**
     * 验证用户 ID 并从后端获取真实姓名。
     * @returns {Promise<string|null>} 一个 Promise，解析为用户真实姓名字符串或 null。
     */
    async function verifyRealName() {
        const user_id = await getUserId();
        if (!user_id) {
            console.warn("无法获取用户 ID，跳过真实姓名验证。");
            return null;
        }

        const verifyUrl = "http://10.100.1.122:5000/api/users/verify"; // 确保此 URL 正确

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
            console.error("验证真实姓名时出错:", error);
            return null;
        }
    }

    // --- 页面加载时执行的逻辑 ---

    /**
     * 页面加载时初始化节点搜索：获取真实姓名并搜索。
     */
    async function initializeNodeSearchOnLoad() {
        console.log("页面加载完成，开始初始化节点搜索...");
        showLoading('正在加载图谱并搜索当前用户...');

        try {
            await loadInitialGraph(); // 先加载初始图谱

            const realName = await verifyRealName();

            if (realName) {
                console.log(`获取到真实姓名: ${realName}，开始自动搜索节点...`);
                // 调用 performSearch，并传入 false，表示自动搜索时不弹窗
                await performSearch(realName, false);
            } else {
                console.log("未获取到真实姓名，跳过自动搜索用户节点。");
            }
        } catch (error) {
            console.error("初始化节点搜索失败:", error);
            // 自动加载失败，这里也可以选择不弹窗，只在控制台记录
            // alert("初始化图谱和用户搜索失败，请稍后再试。");
        } finally {
            hideLoading();
        }
    }

    // 页面完全加载后执行初始化函数
    initializeNodeSearchOnLoad();

}); // DOMContentLoaded 结束