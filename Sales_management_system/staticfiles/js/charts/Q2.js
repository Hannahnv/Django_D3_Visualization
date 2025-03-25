// Q2.js: Vẽ biểu đồ doanh số theo nhóm hàng
export function render(data) {
    console.log("Dữ liệu Q2:", data);

    const width = 900, height = 500, margin = { top: 50, right: 50, bottom: 50, left: 200 };

    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.total)]).range([0, width]);
    const y = d3.scaleBand().domain(data.map(d => `[${d.groupCode}] ${d.groupName}`)).range([0, height]).padding(0.2);

    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("y", d => y(`[${d.groupCode}] ${d.groupName}`))
        .attr("width", d => x(d.total))
        .attr("height", y.bandwidth())
        .attr("fill", "#28a745");

    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => x(d.total) + 5)
        .attr("y", d => y(`[${d.groupCode}] ${d.groupName}`) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .text(d => d3.format(",")(d.total) + " VND");

    svg.append("g").call(d3.axisLeft(y));
    svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x).ticks(10, "~s"));
}
