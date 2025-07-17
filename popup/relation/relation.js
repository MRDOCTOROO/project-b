document.addEventListener('DOMContentLoaded', function () {
    // --- 元素获取 ---
    const container = document.getElementById('mynetwork');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const backButton = document.getElementById('backButton');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // --- 后端 API ---
    const GRAPH_API_URL = 'http://10.100.1.122:5002';
    const AUTH_API_URL = 'http://10.100.1.122:5000/api/users/verify';

    // --- Vis.js 数据集和网络实例 ---
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);
    const data = { nodes, edges };
    const options = getGraphOptions(); // 使用函数获取配置，保持整洁
    const network = new vis.Network(container, data, options);

    // --- 事件监听 ---
    searchButton.addEventListener('click', () => performSearch(searchInput.value.trim(), true));
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            performSearch(searchInput.value.trim(), true);
        }
    });
    backButton.addEventListener('click', () => window.location.href = '../popup.html');
    network.on("click", handleNodeClick);
    network.on("doubleClick", handleNodeDoubleClick);

    // --- 初始化 ---
    initializeApp();

    // =================================================================
    // --- 函数定义 ---
    // =================================================================

    /**
     * 初始化应用，加载图谱并搜索当前用户
     */
    async function initializeApp() {
        showLoading('正在初始化图谱...');
        try {
            await loadInitialGraph();
            const realName = await getRealName();
            if (realName) {
                showLoading(`正在定位用户: ${realName}`);
                await performSearch(realName, false);
            }
        } catch (error) {
            console.error("初始化失败:", error);
            showError("初始化图谱失败，请稍后重试。");
        } finally {
            hideLoading();
        }
    }

    /**
     * 加载初始图谱数据
     */
    async function loadInitialGraph() {
        const graphData = await fetchApi(`${GRAPH_API_URL}/initial_graph`);
        nodes.clear();
        edges.clear();
        nodes.add(graphData.nodes);
        edges.add(graphData.edges);
        network.fit();
    }

    /**
     * 处理节点点击事件，展开节点
     * @param {object} params - vis.js 点击事件参数
     */
    async function handleNodeClick(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            showLoading('正在展开节点...');
            try {
                const newGraphData = await fetchApi(`${GRAPH_API_URL}/expand_node?node_id=${nodeId}`);
                nodes.add(newGraphData.nodes);
                edges.add(newGraphData.edges);
            } catch (error) {
                console.error(`展开节点 ${nodeId} 失败:`, error);
                // 这里可以选择不弹窗，避免打断用户操作
            } finally {
                hideLoading();
            }
        }
    }
    
    /**
     * 处理节点双击事件
     * @param {object} params - vis.js 双击事件参数
     */
    function handleNodeDoubleClick(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeData = nodes.get(nodeId);
            alert(`节点信息:\nID: ${nodeData.id}\n标签: ${nodeData.label}\n类型: ${nodeData.group || '未知'}`);
        }
    }

    /**
     * 执行搜索
     * @param {string} query - 搜索关键词
     * @param {boolean} showAlert - 未找到时是否弹窗提示
     */
    async function performSearch(query, showAlert) {
        if (!query) {
            if (showAlert) alert("请输入搜索内容。");
            return;
        }
        showLoading(`正在搜索 "${query}"...`);
        try {
            const searchResults = await fetchApi(`${GRAPH_API_URL}/search_node?query=${encodeURIComponent(query)}`);
            if (searchResults.nodes.length > 0) {
                nodes.update(searchResults.nodes);
                edges.update(searchResults.edges);
                network.focus(searchResults.nodes[0].id, { scale: 1.5, animation: true });
                network.selectNodes([searchResults.nodes[0].id]);
            } else if (showAlert) {
                alert("未找到匹配的节点。");
            }
        } catch (error) {
            console.error("搜索失败:", error);
            if (showAlert) alert("搜索失败，请稍后重试。");
        } finally {
            hideLoading();
        }
    }

    /**
     * 从 Chrome 存储中获取用户ID
     * @returns {Promise<string|null>}
     */
    function getUserId() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get('user_id', (data) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(data.user_id || null);
            });
        });
    }

    /**
     * 获取用户真实姓名
     * @returns {Promise<string|null>}
     */
    async function getRealName() {
        const userId = await getUserId();
        if (!userId) return null;

        try {
            const data = await fetchApi(AUTH_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, real_name: "" })
            });
            return data.user?.relname || null;
        } catch (error) {
            console.error("验证真实姓名失败:", error);
            return null;
        }
    }

    /**
     * 封装的 fetch 请求
     * @param {string} url - 请求URL
     * @param {object} options - fetch 请求选项
     * @returns {Promise<object>} - 解析后的 JSON 数据
     */
    async function fetchApi(url, options) {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    // --- UI 辅助函数 ---
    function showLoading(message) {
        loadingOverlay.querySelector('span').textContent = message;
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }
    
    function showError(message) {
        const networkContainer = document.getElementById('mynetwork');
        networkContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: red;">${message}</div>`;
    }

    /**
     * 获取 vis.js 的配置选项
     * @returns {object}
     */
    function getGraphOptions() {
        return {
            nodes: {
                shape: 'icon',
                icon: {
                    face: "'Font Awesome 5 Free'",
                    weight: "900", // Font Awesome 5 Free solid style
                    code: '\uf0c0', // fa-users
                    size: 50,
                    color: 'var(--primary-color)'
                },
                shapeProperties: {
                    borderRadius: 10
                },
                font: {
                    size: 16,
                    color: '#343434',
                    strokeWidth: 0.5,
                    strokeColor: '#ffffff'
                },
                borderWidth: 3,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.2)',
                    size: 7,
                    x: 3,
                    y: 3
                },
                color: {
                    border: 'var(--primary-color)',
                    background: '#ffffff',
                    highlight: {
                        border: 'var(--primary-hover-color)',
                        background: '#f0f8ff'
                    },
                    hover: {
                        border: 'var(--primary-hover-color)',
                        background: '#f0f8ff'
                    }
                }
            },
            edges: {
                width: 2,
                color: {
                    color: '#cccccc',
                    highlight: 'var(--primary-color)',
                    hover: 'var(--primary-color)',
                    inherit: false
                },
                arrows: {
                    to: { enabled: true, scaleFactor: 0.7 }
                },
                smooth: {
                    enabled: true,
                    type: "dynamic",
                    roundness: 0.5
                }
            },
            physics: {
                enabled: true,
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springConstant: 0.08,
                    springLength: 100,
                    damping: 0.4,
                    avoidOverlap: 1
                },
                solver: 'forceAtlas2Based'
            },
            interaction: {
                hover: true,
                navigationButtons: false,
                tooltipDelay: 200,
                dragNodes: true,
                dragView: true,
                zoomView: true
            },
            groups: {
                // 定义不同类型的节点样式
                user: {
                    icon: { code: '\uf007', color: '#ff6347' } // fa-user (Tomato)
                },
                paper: {
                    icon: { code: '\uf15c', color: '#4682b4' } // fa-file-alt (SteelBlue)
                },
                topic: {
                    icon: { code: '\uf07b', color: '#32cd32' } // fa-folder (LimeGreen)
                },
                default: {
                     icon: { code: '\uf128', color: '#6e6e73' } // fa-question
                }
            }
        };
    }
});
