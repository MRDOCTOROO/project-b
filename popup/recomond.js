
// 返回按钮监听
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "popup.html";
});


//渲染
// 配置连接信息
const driver = neo4j.driver(
    "bolt://localhost:7687",  // 或者用 secure bolt+s://your-db-url
    neo4j.auth.basic("neo4j", "your_password")
  );
  
  async function fetchGraphData() {
    const session = driver.session();
    const result = await session.run(
      "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50"
    );
  
    const nodes = new Map();
    const links = [];
  
    result.records.forEach(record => {
      const n1 = record.get('n');
      const n2 = record.get('m');
      const rel = record.get('r');
  
      [n1, n2].forEach(n => {
        const id = n.identity.toString();
        if (!nodes.has(id)) {
          nodes.set(id, {
            id: id,
            label: n.labels[0],
            properties: n.properties
          });
        }
      });
  
      links.push({
        source: n1.identity.toString(),
        target: n2.identity.toString(),
        type: rel.type
      });
    });
  
    session.close();
    return { nodes: Array.from(nodes.values()), links };
  }
  
  function renderGraph({ nodes, links }) {
    const svg = d3.select("svg");
    const width = +svg.attr("width") || window.innerWidth;
    const height = +svg.attr("height") || window.innerHeight;
  
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
  
    const link = svg.append("g")
        .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
        .attr("class", "link");
  
    const node = svg.append("g")
        .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      
    node.append("circle")
        .attr("r", 20)
        .attr("fill", "#69b3a2");
  
    node.append("text")
        .attr("dy", -25)
        .text(d => d.label);
  
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
  
      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });
  }
  
  // 加载并渲染
  fetchGraphData().then(renderGraph);
  