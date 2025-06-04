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

    const BACKEND_API_URL = 'http://127.0.0.1:5000'; // 确保这里是您的 Flask 后端地址

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

    // 3. 搜索功能
    searchButton.addEventListener('click', async function () {
        const query = searchInput.value.trim();
        if (!query) {
            alert("请输入搜索内容！");
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
                nodes.add(searchResults.nodes);
                edges.add(searchResults.edges);
                network.focus(searchResults.nodes[0].id, {
                    scale: 1.5,
                    animation: {
                        duration: 1000,
                        easingFunction: "easeOutCubic"
                    }
                });
                network.selectNodes([searchResults.nodes[0].id]);
            } else {
                alert("未找到匹配的节点。");
            }
        } catch (error) {
            console.error("搜索失败:", error);
            alert("搜索失败，请稍后再试。");
        } finally {
            hideLoading();
        }
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
        backButton.addEventListener('click', function() {
            // 返回到上一级目录的 popup.html
            // 注意：这里是相对路径，'../' 表示上一级目录
            window.location.href = '../popup.html';
        });
    }

    // 启动时加载初始图谱
    loadInitialGraph();
});