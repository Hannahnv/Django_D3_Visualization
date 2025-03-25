// Q1.js: Vẽ biểu đồ doanh số theo mặt hàng
export function render(data) {
    // 1. Kiểm tra dữ liệu
    console.log("Dữ liệu Q1:", data);

    // 2. Xử lý dữ liệu: Sắp xếp giảm dần theo doanh số
    data.sort((a, b) => b.total - a.total);

    // 3. Kích thước biểu đồ
    const width = 900, height = 500, margin = { top: 50, right: 50, bottom: 50, left: 200 };

    // 4. Tạo vùng vẽ SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 5. Thang đo
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.total)]).range([0, width]);
    const y = d3.scaleBand().domain(data.map(d => `[${d.code}] ${d.name}`)).range([0, height]).padding(0.2);

    // 6. Vẽ cột
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("y", d => y(`[${d.code}] ${d.name}`))
        .attr("width", d => x(d.total))
        .attr("height", y.bandwidth())
        .attr("fill", "#007bff");

    // 7. Thêm nhãn
    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => x(d.total) + 5)
        .attr("y", d => y(`[${d.code}] ${d.name}`) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .text(d => d3.format(",")(d.total) + " VND");

    // 8. Vẽ trục
    svg.append("g")
        .call(d3.axisLeft(y))
        .attr("font-size", "10px");

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(10, "~s"));
}
