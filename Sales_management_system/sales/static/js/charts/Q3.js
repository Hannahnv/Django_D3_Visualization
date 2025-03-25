// Q3.js: Vẽ biểu đồ doanh số theo tháng
export function render(data) {
    console.log("Dữ liệu Q3:", data);

    if (!data || data.length === 0) {
        console.error("Không có dữ liệu để vẽ biểu đồ.");
        return;
    }

    // Xóa chart cũ
    d3.select("#chart-container").html("");

    // Kích thước biểu đồ
    const width = 900, height = 500, margin = { top: 50, right: 50, bottom: 50, left: 100 };

    // Tạo vùng vẽ SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thang đo cho trục x (Tháng)
    const xScale = d3.scaleBand()
        .domain(data.map(d => `Tháng ${d.month}`))  // Nhãn tháng: Tháng 1, Tháng 2, ...
        .range([0, width])
        .padding(0.2);

    // Thang đo cho trục y (Doanh số)
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total)])
        .nice()
        .range([height, 0]);

    // Màu sắc cột
    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.month))
        .range(d3.schemePaired);

    // Thêm tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("visibility", "hidden")
        .style("font-family", "Arial, sans-serif");

    // Vẽ cột
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(`Tháng ${d.month}`))
        .attr("y", d => yScale(d.total))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.total))
        .attr("fill", d => colorScale(d.month))
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible").html(`
                <strong>Tháng ${d.month}</strong><br>
                <strong>Doanh số:</strong> ${d3.format(",")(d.total)} VND
            `);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("top", `${event.pageY - 40}px`)
                .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    // Thêm nhãn trên cột
    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => xScale(`Tháng ${d.month}`) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.total) - 5)
        .style("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "black")
        .text(d => `${Math.round(d.total / 1e6)} triệu VND`);

    // Vẽ trục x
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    // Vẽ trục y
    svg.append("g")
        .call(d3.axisLeft(yScale)
            .tickFormat(d => `${d / 1e6}M`));

    svg.append("text")
            .attr("x", width / 2) // Căn giữa theo chiều ngang của toàn bộ SVG
            .attr("y", margin.top / 5) // Đặt tiêu đề phía trên biểu đồ
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text("Doanh số bán hàng theo tháng");

    console.log("✅ Biểu đồ Q3 đã render xong.");
}
