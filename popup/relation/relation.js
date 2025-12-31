document.addEventListener('DOMContentLoaded', function () {
    // --- 元素获取 ---
    const container = document.getElementById('mynetwork');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const backButton = document.getElementById('backButton');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    // --- 后端 API ---
    const GRAPH_API_URL = 'http://10.100.1.122:5002';
    const AUTH_API_URL = 'http://10.100.1.122:5000/api/users/verify';

    // --- Vis.js 数据集和网络实例 ---
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);
    const data = { nodes, edges };
    const options = getGraphOptions();
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
     * 初始化应用，加载图谱
     */
    async function initializeApp() {
        showLoading('正在加载图谱...');
        try {
            await loadInitialGraph();
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

        // 确保节点有正确的 group 属性
        const processedNodes = graphData.nodes.map(node => {
            // 如果节点没有 group，根据 ID 或其他属性推断
            if (!node.group && node.id) {
                const id = String(node.id).toLowerCase();
                if (id.includes('user') || id.includes('author') || /^\d+$/.test(node.id)) {
                    node.group = 'user';
                } else if (id.includes('paper') || id.includes('pub')) {
                    node.group = 'paper';
                } else {
                    node.group = 'topic';
                }
            }
            return node;
        });

        nodes.add(processedNodes);
        edges.add(graphData.edges);
        network.fit();
    }

    /**
     * 处理节点点击事件，展开节点
     */
    async function handleNodeClick(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            showLoading('正在展开节点...');
            try {
                const newGraphData = await fetchApi(`${GRAPH_API_URL}/expand_node?node_id=${nodeId}`);

                // 处理新节点的 group
                const processedNodes = newGraphData.nodes.map(node => {
                    if (!node.group && node.id) {
                        const id = String(node.id).toLowerCase();
                        if (id.includes('user') || id.includes('author') || /^\d+$/.test(node.id)) {
                            node.group = 'user';
                        } else if (id.includes('paper') || id.includes('pub')) {
                            node.group = 'paper';
                        } else {
                            node.group = 'topic';
                        }
                    }
                    return node;
                });

                nodes.add(processedNodes);
                edges.add(newGraphData.edges);
            } catch (error) {
                console.error(`展开节点 ${nodeId} 失败:`, error);
            } finally {
                hideLoading();
            }
        }
    }

    /**
     * 处理节点双击事件
     */
    function handleNodeDoubleClick(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeData = nodes.get(nodeId);
            const groupLabels = {
                user: '研究者',
                paper: '论文',
                topic: '主题'
            };
            const groupLabel = groupLabels[nodeData.group] || nodeData.group || '未知';
            alert(`节点信息:\nID: ${nodeData.id}\n标签: ${nodeData.label}\n类型: ${groupLabel}`);
        }
    }

    /**
     * 执行搜索
     */
    async function performSearch(query, showAlert) {
        if (!query) {
            if (showAlert) alert("请输入搜索内容。");
            return;
        }
        showLoading(`正在搜索 "${query}"...`);
        try {
            const searchResults = await fetchApi(`${GRAPH_API_URL}/search_node?query=${encodeURIComponent(query)}`);

            // 处理搜索结果的节点 group
            const processedNodes = searchResults.nodes.map(node => {
                if (!node.group && node.id) {
                    const id = String(node.id).toLowerCase();
                    if (id.includes('user') || id.includes('author') || /^\d+$/.test(node.id)) {
                        node.group = 'user';
                    } else if (id.includes('paper') || id.includes('pub')) {
                        node.group = 'paper';
                    } else {
                        node.group = 'topic';
                    }
                }
                return node;
            });

            if (processedNodes.length > 0) {
                nodes.update(processedNodes);
                edges.update(searchResults.edges);
                network.focus(processedNodes[0].id, { scale: 1.5, animation: true });
                network.selectNodes([processedNodes[0].id]);
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
     * 封装的 fetch 请求
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
        if (loadingText) loadingText.textContent = message;
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    function showError(message) {
        container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--error-color, #ff3b30); font-weight: 500;">${message}</div>`;
    }

    /**
     * 获取 vis.js 的配置选项
     */
    function getGraphOptions() {
        return {
            nodes: {
                shape: 'dot',
                size: 25,
                font: {
                    size: 14,
                    color: '#343434',
                    strokeWidth: 3,
                    strokeColor: '#ffffff'
                },
                borderWidth: 2,
                borderWidthSelected: 3,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.15)',
                    size: 8,
                    x: 2,
                    y: 2
                }
            },
            edges: {
                width: 2,
                color: {
                    color: '#c5c5c5',
                    highlight: '#007aff',
                    hover: '#007aff'
                },
                arrows: {
                    to: { enabled: true, scaleFactor: 0.6 }
                },
                smooth: {
                    enabled: true,
                    type: "continuous",
                    roundness: 0.3
                }
            },
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: -3000,
                    centralGravity: 0.3,
                    springLength: 120,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.2
                },
                solver: 'barnesHut',
                stabilization: {
                    iterations: 200
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 150,
                dragNodes: true,
                dragView: true,
                zoomView: true
            },
            groups: {
                // 研究者 - 红色系
                user: {
                    color: {
                        background: '#ff6347',
                        border: '#e5533d',
                        highlight: {
                            background: '#ff7868',
                            border: '#ff6347'
                        },
                        hover: {
                            background: '#ff7868',
                            border: '#ff6347'
                        }
                    },
                    shape: 'dot',
                    size: 30
                },
                // 论文 - 蓝色系
                paper: {
                    color: {
                        background: '#4682b4',
                        border: '#3a6fa3',
                        highlight: {
                            background: '#5a94c4',
                            border: '#4682b4'
                        },
                        hover: {
                            background: '#5a94c4',
                            border: '#4682b4'
                        }
                    },
                    shape: 'dot',
                    size: 25
                },
                // 主题 - 绿色系
                topic: {
                    color: {
                        background: '#32cd32',
                        border: '#2bb82b',
                        highlight: {
                            background: '#42d942',
                            border: '#32cd32'
                        },
                        hover: {
                            background: '#42d942',
                            border: '#32cd32'
                        }
                    },
                    shape: 'dot',
                    size: 28
                },
                // 默认 - 灰色系
                default: {
                    color: {
                        background: '#6e6e73',
                        border: '#5a5a5f',
                        highlight: {
                            background: '#7e7e83',
                            border: '#6e6e73'
                        },
                        hover: {
                            background: '#7e7e83',
                            border: '#6e6e73'
                        }
                    },
                    shape: 'dot',
                    size: 20
                }
            }
        };
    }
});
